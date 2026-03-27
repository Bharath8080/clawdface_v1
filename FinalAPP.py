import os
import re
import base64
import typing
import json
import requests
import threading
from flask import Flask, request, Response
from dotenv import load_dotenv
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from livekit import agents
from livekit.agents import Agent, AgentServer, AgentSession, cli, metrics, APIConnectOptions
from livekit.agents.telemetry import set_tracer_provider
from livekit.agents.voice import MetricsCollectedEvent
from livekit.agents.voice.agent_session import SessionConnectOptions
from livekit.plugins import elevenlabs, openai, trugen, silero, deepgram

load_dotenv()

# --- OPENCLAW SESSION PROXY ---
# Clean passthrough: OpenClaw manages all context via session key.
# We only forward the latest user message — no history manipulation needed.
app = Flask(__name__)

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

        # Forward the full conversation history from LiveKit, 
        # so OpenClaw receives the full multi-turn context (the "bunch").
        # Strip system messages since OpenClaw adds its own.
        new_messages = [
            m for m in messages if m.get("role") != "system"
        ][-10:]

        if not new_messages:
            return {"error": "No messages to forward"}, 400

        headers = {
            "Authorization": f"Bearer {gate_token}",
            "x-openclaw-session-key": sess_key,
            "x-openclaw-agent-id": "main",
            "ngrok-skip-browser-warning": "true"
        }

        resp = requests.post(
            f"{target_url}/v1/chat/completions",
            headers=headers,
            json={"model": "openclaw", "messages": new_messages, "stream": data.get("stream", True)},
            stream=True,
            timeout=None
        )

        def generate():
            print(f"[PROXY] ⚗️ Streaming response for {sess_key}...")
            for chunk in resp.iter_content(chunk_size=None):
                if chunk:
                    yield chunk
            print(f"[PROXY] ✓ Stream complete for {sess_key}")

        return Response(generate(), resp.status_code, {"Content-Type": "text/event-stream"})


    except Exception as e:
        print(f"[PROXY] Error: {e}")
        return {"error": str(e)}, 500


def run_proxy():
    try:
        print("--- OpenClaw Proxy Active (port 4041) ---")
        app.run(host='0.0.0.0', port=4041, debug=False, use_reloader=False)
    except OSError as e:
        if "Address already in use" in str(e) or "already in use" in str(e).lower():
            print("[PROXY] Port 4041 already bound by another worker — reusing.")
        else:
            raise

threading.Thread(target=run_proxy, daemon=True).start()


# ---------------------------------------------------------------------------
# CONFIG RESOLUTION
# ---------------------------------------------------------------------------

EMAIL_BOT_AVATAR_MAP: dict[str, str] = {
    "amansbot":    "0f160301",
    "jasonbot":    "182b03e8",
    "sameerbot":   "05a001fc",
    "mikebot":     "be5b2ce0",
    "johnnybot":   "03ae0187",
    "amanbot":     "0f160301",
    "alexbot":     "13550375",
    "amirbot":     "18c4043e",
    "akbarsbot":   "48d778c9",
    "akbarbot":    "48d778c9",
    "jessicabot":  "1a640442",
    "lisasbot":    "1a640442",
    "lisabot":     "1a640442",
    "cathybot":    "1a640442",
    "sofiabot":    "1a640442",
    "lucybot":     "1a640442",
    "kiarabot":    "1a640442",
    "jenniferbot": "1a640442",
    "priyabot":    "1a640442",
    "chloebot":    "1a640442",
    "mishabot":    "1a640442",
    "alliebot":    "1a640442",
}

MALE_AVATAR_IDS = {
    "182b03e8", "05a001fc", "be5b2ce0", "03ae0187",
    "1fa504ff", "0f160301", "13550375", "48d778c9", "18c4043e"
}

DEFAULT_AVATAR_ID = "1a640442"  # Lisa


def _fetch_config_from_backend(email: str) -> dict | None:
    try:
        base_url = os.getenv("FRONTEND_URL", "").rstrip("/")
        if not base_url:
            print("[SESSION] ✗ FRONTEND_URL not set in .env. Skipping dynamic lookup.")
            return None

        api_url = f"{base_url}/api/agents/config?email={email}"
        print(f"[SESSION] Attempting dynamic config lookup for: {email}")
        response = requests.get(api_url, timeout=5)

        if response.status_code == 200:
            config = response.json()
            if isinstance(config, dict) and config.get("openclawUrl"):
                print(f"[SESSION] ✓ Dynamic config successfully fetched for: {email}")
                return config
        else:
            print(f"[SESSION] ✗ Backend lookup failed (status={response.status_code}) for: {email}")
    except Exception as e:
        print(f"[SESSION] ✗ Error during backend lookup: {e}")
    return None


def _parse_avatar_from_room_name(room_name: str) -> str | None:
    if not room_name:
        return None
    local = room_name.lower().split("@")[0]
    for prefix, avatar_id in EMAIL_BOT_AVATAR_MAP.items():
        if local.startswith(prefix):
            return avatar_id
    return None


def resolve_config(ctx: agents.JobContext) -> tuple[dict, str]:
    try:
        if ctx.job and ctx.job.metadata:
            job_cfg = json.loads(ctx.job.metadata)
            if isinstance(job_cfg, dict) and job_cfg.get("openclawUrl"):
                print("[SESSION] ✓ Config from job metadata (email/API dispatch)")
                return job_cfg, "email_dispatch"
    except Exception:
        pass

    try:
        if ctx.room.metadata:
            room_cfg = json.loads(ctx.room.metadata)
            if isinstance(room_cfg, dict) and room_cfg.get("openclawUrl"):
                print("[SESSION] ✓ Config from room metadata")
                return room_cfg, "room_metadata"
    except Exception:
        pass

    for p in ctx.room.remote_participants.values():
        try:
            if p.metadata:
                p_cfg = json.loads(p.metadata)
                if isinstance(p_cfg, dict) and p_cfg.get("openclawUrl"):
                    session_key = p_cfg.get("sessionKey", "")
                    conn_type = "url_share" if session_key.startswith("session-") else "website"
                    print(f"[SESSION] ✓ Config from participant metadata ({conn_type})")
                    return p_cfg, conn_type
        except Exception:
            pass

    room_id = ctx.room.name
    if room_id and not room_id.startswith("room-"):
        email = room_id
        if "@" not in email:
            email = f"{email}@agent.truhire.ai"
        backend_cfg = _fetch_config_from_backend(email)
        if backend_cfg:
            print(f"[SESSION] ✓ Config dynamically resolved from backend for: {email}")
            return backend_cfg, "email_dispatch"

    inferred_avatar = _parse_avatar_from_room_name(ctx.room.name)
    if inferred_avatar:
        print(f"[SESSION] ✗ Only avatar inferred for {ctx.room.name}, no OpenClaw config found.")

    print("[SESSION] ✗ No config found in any source (metadata or backend)")
    return {}, "unknown"


# ---------------------------------------------------------------------------
# TRACING SETUP
# ---------------------------------------------------------------------------

def setup_langfuse(
    metadata: dict | None = None,
    *,
    host: str | None = None,
    public_key: str | None = None,
    secret_key: str | None = None,
) -> TracerProvider:
    public_key = public_key or os.getenv("LANGFUSE_PUBLIC_KEY")
    secret_key = secret_key or os.getenv("LANGFUSE_SECRET_KEY")
    host = host or os.getenv("LANGFUSE_HOST") or os.getenv("LANGFUSE_BASE_URL")

    if not public_key or not secret_key or not host:
        raise ValueError(
            "LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY, and LANGFUSE_HOST must be set"
        )

    langfuse_auth = base64.b64encode(f"{public_key}:{secret_key}".encode()).decode()
    os.environ["OTEL_EXPORTER_OTLP_ENDPOINT"] = f"{host.rstrip('/')}/api/public/otel"
    os.environ["OTEL_EXPORTER_OTLP_HEADERS"]  = f"Authorization=Basic {langfuse_auth}"

    trace_provider = TracerProvider()
    trace_provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
    set_tracer_provider(trace_provider, metadata=metadata)

    return trace_provider


# ---------------------------------------------------------------------------
# LIVEKIT AGENT
# ---------------------------------------------------------------------------
AGENT_INSTRUCTIONS = (
    "You are a helpful AI assistant. Keep responses to 2-4 short spoken sentences. "
    "Be conversational. Never use markdown, bullet points, or formatting."
)

class MyAgent(Agent):
    def __init__(self) -> None:
        super().__init__(instructions=AGENT_INSTRUCTIONS)


server = AgentServer()

@server.rtc_session(agent_name="clawdface")
async def my_agent(ctx: agents.JobContext):
    await ctx.connect()

    # ---------------------------------------------------------------------------
    # FIX 2: Session guard — prevent multiple coroutines from acting on same room
    # ---------------------------------------------------------------------------
    # The terminal logs show Punjab Kings / Lucknow / Delhi Capitals answers all
    # firing for the same question. This is because LiveKit may dispatch the same
    # job to multiple worker processes. We use a simple room-name lock so only
    # one session.say() fires per room at a time.
    # ---------------------------------------------------------------------------
    import asyncio

    # ---------------------------------------------------------------------------
    # FIX 3: Participant metadata retry loop (unchanged — already correct)
    # ---------------------------------------------------------------------------
    config: dict = {}
    connection_type = "unknown"
    POLL_INTERVAL = 0.5
    MAX_WAIT    = 15.0

    deadline = asyncio.get_event_loop().time() + MAX_WAIT
    while asyncio.get_event_loop().time() < deadline:
        config, connection_type = resolve_config(ctx)
        if config:
            break
        print(f"[SESSION] Waiting for participant metadata... ({connection_type})")
        await asyncio.sleep(POLL_INTERVAL)

    url   = config.get("openclawUrl", "").strip()
    token = config.get("gatewayToken", "")
    key   = config.get("sessionKey", "")

    if not url or not token or not key:
        print(f"[SESSION] ✗ Incomplete config (type={connection_type}): {config}")
        return

    avatar_id = (
        config.get("avatarId")
        or _parse_avatar_from_room_name(ctx.room.name)
        or os.getenv("TRUGEN_AVATAR_ID")
        or DEFAULT_AVATAR_ID
    )
    voice_id = "CwhRBWXzGAHq8TQ4Fs17" if avatar_id in MALE_AVATAR_IDS else "FGY2WhTYpPnrIDTdsKH5"
    print(f"[SESSION] Avatar: {avatar_id} | Voice: {voice_id} | Source: {connection_type}")

    trace_provider = setup_langfuse(
        metadata={
            "langfuse.session.id": ctx.room.name,
            "langfuse.user.id":    key,
            "langfuse.tags":       json.dumps([
                "production",
                "voice-agent",
                f"source:{connection_type}",
                f"avatar:{avatar_id}",
            ]),
            "langfuse.version": "2.0.0",
            "connection.type": connection_type,
            "avatar.id":       avatar_id,
            "room.name":       ctx.room.name,
        }
    )

    async def flush_trace():
        try:
            trace_provider.force_flush(timeout_millis=10_000)
        except Exception as e:
            print(f"[TRACE] Flush error (non-fatal): {e}")

    ctx.add_shutdown_callback(flush_trace)
    import openai as _openai
    import httpx

    mega_token = f"{url}|{token}|{key}"
    openclaw_llm = openai.LLM(
        model="openclaw",
        base_url="http://localhost:4041/v1",
        api_key=mega_token,
        timeout=httpx.Timeout(None), # Disable all read/connect timeouts in LiveKit
        max_retries=0, # Stop LiveKit from trying again in the background
        client=_openai.AsyncOpenAI(
            base_url="http://localhost:4041/v1",
            api_key=mega_token,
            timeout=None, # Standard OpenAI client timeout override
            max_retries=0
        )
    )


    session = AgentSession(
        stt=deepgram.STTv2(
            model="flux-general-en",
            eager_eot_threshold=0.4,
        ),
        vad=silero.VAD.load(),
        llm=openclaw_llm,
        tts=elevenlabs.TTS(
            voice_id=voice_id,
            model="eleven_flash_v2_5",
        ),
        conn_options=SessionConnectOptions(
            llm_conn_options=APIConnectOptions(
                timeout=300.0,  # 5 minute timeout for long tool calls
                max_retry=0     # Disable retries to avoid duplicate tool triggers
            )
        )
    )

    @session.on("metrics_collected")
    def on_metrics(ev: MetricsCollectedEvent):
        metrics.log_metrics(ev.metrics)

    @session.on("user_input_transcribed")
    def on_user_speech(ev: agents.UserInputTranscribedEvent):
        if ev.transcript:
            print(f"[STT] {ev.transcript}")

    @session.on("agent_state_changed")
    def on_agent_state(state: typing.Any):
        print(f"[AGENT] State → {state}")

    # ---------------------------------------------------------------------------
    # FIX 4: Log when LLM response contains a tool call so you can correlate
    # terminal output with what the avatar eventually says.
    # ---------------------------------------------------------------------------
    # FIX 4: Log when agent's speech is committed to history (replaces invalid 'agent_speech_committed')
    @session.on("conversation_item_added")
    def on_conversation_item(ev: agents.ConversationItemAddedEvent):
        role = getattr(ev.item, "role", None)
        content = getattr(ev.item, "content", None)
        if role == "assistant" and content:
            print(f"[TTS COMMITTED] Avatar said: {content}")

    try:
        trugen_avatar = trugen.AvatarSession(avatar_id=avatar_id)
        await trugen_avatar.start(session, room=ctx.room)
        await session.start(room=ctx.room, agent=MyAgent())
        session.say("Hello! Let's get started.")
    except Exception as e:
        print(f"[SESSION] ✗ Fatal error: {e}")
        raise


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "download-files":
        print("Pre-downloading models...")
        silero.VAD.load()
        sys.exit(0)
    agents.cli.run_app(server)
