import os
import json
import requests
import asyncio
import threading
from flask import Flask, request, Response
from dotenv import load_dotenv
from livekit import agents
from livekit.agents import Agent, AgentServer, AgentSession
from livekit.plugins import elevenlabs, openai, trugen

load_dotenv()

# --- OPENCLAW SESSION PROXY (Stateless / Mega-Token) ---
app = Flask(__name__)

# Render provides the port via the PORT environment variable
RENDER_PORT = int(os.environ.get("PORT", 8080))

@app.route('/v1/chat/completions', methods=['POST'])
def chat_proxy():
    try:
        data = request.get_json()
        messages = data.get('messages', [])

        # 1. Unpack "Mega-Token" from Authorization header (URL|TOKEN|KEY)
        auth_header = request.headers.get("Authorization", "")
        token_str = auth_header.replace("Bearer ", "")
        
        if "|" not in token_str:
             print("[PROXY] ✗ Invalid Mega-Token format")
             return {"error": "Missing x-openclaw-url. Check your Mega-Token."}, 400

        # Unpack: URL | TOKEN | SESSION_KEY
        parts = token_str.split("|")
        target_url = parts[0]
        gate_token = parts[1]
        sess_key   = parts[2]

        print(f"\n[PROXY] → {target_url}  session={sess_key}")

        # Filter to only send user messages to OpenClaw (it manages history)
        new_messages = []
        for msg in reversed(messages):
            if msg.get('role') == 'user':
                new_messages.insert(0, msg)
            else:
                break

        if not new_messages:
            return {"error": "No user message found"}, 400

        headers = {
            "Authorization": f"Bearer {gate_token}",
            "x-openclaw-session-key": sess_key,
            "x-openclaw-agent-id": "main"
        }

        resp = requests.post(
            f"{target_url}/v1/chat/completions",
            headers=headers,
            json={"model": "main", "messages": new_messages, "stream": data.get("stream", True)},
            stream=True,
            timeout=30
        )

        def generate():
            for chunk in resp.iter_content(chunk_size=1024):
                yield chunk

        return Response(generate(), resp.status_code, {"Content-Type": "text/event-stream"})

    except Exception as e:
        print(f"[PROXY] Error: {e}")
        return {"error": str(e)}, 500

def run_proxy():
    print(f"--- OpenClaw Proxy Active (port {RENDER_PORT}) ---")
    app.run(host='0.0.0.0', port=RENDER_PORT, debug=False, use_reloader=False)

threading.Thread(target=run_proxy, daemon=True).start()

# --- LIVEKIT AGENT ---
AGENT_INSTRUCTIONS = (
    "You are a helpful AI assistant. Keep responses to 2-4 short spoken sentences. "
    "Be conversational. Never use markdown, bullet points, or formatting."
)

class MyAgent(Agent):
    def __init__(self) -> None:
        super().__init__(instructions=AGENT_INSTRUCTIONS)

server = AgentServer()

@server.rtc_session()
async def my_agent(ctx: agents.JobContext):
    await ctx.connect()
    
    # 1. Get Config (Strictly from metadata passed from frontend localStorage)
    config = None
    for p in ctx.room.remote_participants.values():
        if p.metadata:
            try:
                config = json.loads(p.metadata)
                print(f"[SESSION] ✓ Config from participant metadata")
                break
            except: pass
    
    if not config:
        print(f"[SESSION] ✗ No config found in participant metadata")
        return

    url    = config.get("openclawUrl", "")
    token  = config.get("gatewayToken", "")
    key    = config.get("sessionKey", "")

    if not url or not token or not key:
        print(f"[SESSION] ✗ Incomplete config: {config}")
        return

    # 2. MEGA-TOKEN: Pack everything into the api_key for the proxy
    mega_token = f"{url}|{token}|{key}"

    openclaw_llm = openai.LLM(
        model="main",
        base_url=f"http://localhost:{RENDER_PORT}/v1",
        api_key=mega_token,
    )

    # 3. Simple AgentSession setup
    session = AgentSession(
        stt="deepgram/nova-3",
        llm=openclaw_llm,
        tts=elevenlabs.TTS(
            voice_id="FGY2WhTYpPnrIDTdsKH5",
            model="eleven_flash_v2_5",
        ),
    )

    avatar_id = os.getenv("TRUGEN_AVATAR_ID") or "1a640442"
    trugen_avatar = trugen.AvatarSession(avatar_id=avatar_id)
    await trugen_avatar.start(session, room=ctx.room)

    await session.start(room=ctx.room, agent=MyAgent())
    session.say("Hello! I'm ready to chat.")

if __name__ == "__main__":
    agents.cli.run_app(server)
