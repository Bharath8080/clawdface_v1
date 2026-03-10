"use client";

import { CloseIcon } from "@/components/CloseIcon";
import { NoAgentNotification } from "@/components/NoAgentNotification";
import TranscriptionView from "@/components/TranscriptionView";
import {
  BarVisualizer,
  DisconnectButton,
  RoomAudioRenderer,
  RoomContext,
  VideoTrack,
  VoiceAssistantControlBar,
  useVoiceAssistant,
  useRoomContext,
} from "@livekit/components-react";
import { AnimatePresence, motion } from "framer-motion";
import { Room, RoomEvent } from "livekit-client";
import { useCallback, useEffect, useState } from "react";
import type { ConnectionDetails } from "./api/connection-details/route";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import Image from "next/image";
import { getUser } from "@/lib/auth";

// ─── Session Config Defaults ────────────────────────────────────────────────
const DEFAULTS = {
  openclawUrl:  "https://pertinacious-speechlessly-lidia.ngrok-free.dev",
  gatewayToken: "",
  sessionKey:   "agent:main:bot",
};

// ─── Icons ──────────────────────────────────────────────────────────────────
const LinkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);
const KeyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/>
  </svg>
);
const HashIcon2 = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/>
    <line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/>
  </svg>
);

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function Page() {
  const router = useRouter();
  const [room] = useState(new Room());
  const [activeSession, setActiveSession] = useState("My Bot");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Session config state
  const [config, setConfig] = useState<typeof DEFAULTS>(DEFAULTS);

  // Load config on mount
  useEffect(() => {
    async function loadConfig() {
      // 1. Try localStorage first (fastest)
      const saved = localStorage.getItem("openclaw_config");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setConfig((prev) => ({ ...prev, ...parsed }));
        } catch (e) {}
      }

      // 2. Fallback to local files (if localStorage is empty, e.g. first run or fresh browser)
      const user = getUser();
      if (user?.email) {
        try {
          const url = new URL("/api/user-config", window.location.origin);
          url.searchParams.set("email", user.email);
          const resp = await fetch(url.toString());
          if (resp.ok) {
            const remoteConfig = await resp.json();
            if (remoteConfig) {
              setConfig((prev) => ({ ...prev, ...remoteConfig }));
              // Keep localStorage in sync
              localStorage.setItem("openclaw_config", JSON.stringify(remoteConfig));
            }
          }
        } catch (err) {}
      }
    }
    loadConfig();
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
    } else {
      setAuthChecked(true);
    }
  }, [router]);

  const onConnectButtonClicked = useCallback(async () => {
    // 1. Persist config to localStorage (Works on Vercel)
    localStorage.setItem("openclaw_config", JSON.stringify(config));

    // 2. Sync to local files (For local dev visibility)
    const user = getUser();
    if (user?.email) {
      try {
        await fetch("/api/user-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email, config }),
        });
      } catch (err) {
        // Silently ignore sync failures on Vercel
        console.warn("Local sync skipped (expected on production)");
      }
    }

    const url = new URL(
      process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT ?? "/api/connection-details",
      window.location.origin
    );

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });

    const connectionDetailsData: ConnectionDetails = await response.json();
    await room.connect(connectionDetailsData.serverUrl, connectionDetailsData.participantToken);
    await room.localParticipant.setMicrophoneEnabled(true);
  }, [room, config]);

  useEffect(() => {
    room.on(RoomEvent.MediaDevicesError, onDeviceFailure);
    return () => { room.off(RoomEvent.MediaDevicesError, onDeviceFailure); };
  }, [room]);

  if (!authChecked) {
    return (
      <div className="h-screen w-screen bg-[#0A0A0A] flex items-center justify-center">
        <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00E3AA" strokeWidth="2">
          <circle cx="12" cy="12" r="10" opacity="0.25"/>
          <path d="M22 12a10 10 0 0 1-10 10" opacity="0.9"/>
        </svg>
      </div>
    );
  }

  return (
    <main data-lk-theme="default" className="h-[100dvh] w-screen bg-[#050505] flex overflow-hidden font-[Inter] text-white">
      <Sidebar
        activeSession={activeSession}
        setActiveSession={setActiveSession}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      <div className="flex-1 h-full w-full overflow-hidden flex flex-col relative z-0">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between px-4 h-14 border-b border-white/5 bg-[#0A0A0A] shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 shrink-0 relative flex items-center justify-center rounded-lg bg-[#00E3AA]/10 text-[#00E3AA]">
              <Image src="/openclaw.png" alt="Logo" width={18} height={18} className="object-contain drop-shadow-[0_0_4px_rgba(0,227,170,0.5)]" />
            </div>
            <span className="text-white font-bold text-lg leading-none tracking-tight mt-1">ClawdFace</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="text-white/70 hover:text-white p-2 rounded-md transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-hidden relative">
          <RoomContext.Provider value={room}>
            {activeSession === "My Bot" ? (
              <SimpleVoiceAssistant
                onConnectButtonClicked={onConnectButtonClicked}
                config={config}
                setConfig={setConfig}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-neutral-400 bg-[#050505] p-6">
                <div className="text-center space-y-4 max-w-md p-8 border border-white/5 rounded-2xl bg-[#0A0A0A] shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-[#00E3AA]/5 rounded-full blur-3xl mix-blend-screen pointer-events-none" />
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-[#00E3AA] relative z-10">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-tight relative z-10">Session Empty</h2>
                  <p className="text-[15px] leading-relaxed relative z-10">
                    The <span className="text-white font-medium">&quot;{activeSession}&quot;</span> session is currently under development.
                  </p>
                  <button
                    onClick={() => setActiveSession("My Bot")}
                    className="relative z-10 mt-6 px-5 py-2.5 bg-[#00E3AA]/10 hover:bg-[#00E3AA]/20 text-[#00E3AA] rounded-lg font-medium transition-all duration-300 text-sm border border-[#00E3AA]/20"
                  >
                    Return to My Bot
                  </button>
                </div>
              </div>
            )}
          </RoomContext.Provider>
        </div>
      </div>
    </main>
  );
}

// ─── Session Config Form ─────────────────────────────────────────────────────
function SessionConfigForm({
  config,
  setConfig,
  onConnect,
  isConnecting,
}: {
  config: typeof DEFAULTS;
  setConfig: (c: typeof DEFAULTS) => void;
  onConnect: () => void;
  isConnecting: boolean;
}) {
  const [showToken, setShowToken] = useState(false);

  const field = (
    key: keyof typeof DEFAULTS,
    label: string,
    icon: React.ReactNode,
    placeholder: string,
    type: "text" | "password" = "text"
  ) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6b7280] flex items-center gap-1.5">
        <span className="text-[#9ca3af]">{icon}</span>
        {label}
      </label>
      <div className="relative">
        <input
          type={key === "gatewayToken" && !showToken ? "password" : "text"}
          value={config[key]}
          onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
          placeholder={placeholder}
          className="w-full bg-[#0d0d0d] border border-[#242424] rounded-xl px-4 py-3 text-[14px] text-white placeholder-[#3a3a3a] focus:outline-none focus:border-[#00E3AA]/50 focus:ring-1 focus:ring-[#00E3AA]/20 transition-all duration-200 pr-10 font-mono"
        />
        {key === "gatewayToken" && (
          <button
            type="button"
            onClick={() => setShowToken(!showToken)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4b5563] hover:text-[#9ca3af] transition-colors"
          >
            {showToken ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <line x1="1" x2="23" y1="1" y2="23"/>
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <motion.div
      key="config-form"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.35, ease: [0.09, 1.04, 0.245, 1.055] }}
      className="flex items-center justify-center h-full p-6"
    >
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#1c2e28] flex items-center justify-center mx-auto mb-4 shadow-[0_0_32px_rgba(0,227,170,0.12)]">
            <Image src="/openclaw.png" alt="ClawdFace" width={34} height={34} className="object-contain" />
          </div>
          <h2 className="text-[22px] font-bold text-white tracking-tight">Configure Session</h2>
          <p className="text-[#6b7280] text-[13px] mt-1">Connect to your OpenClaw backend to start the conversation</p>
        </div>

        {/* Form Card */}
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-6 flex flex-col gap-5 shadow-2xl">
          {field("openclawUrl",  "OpenClaw URL",     <LinkIcon />,   "https://your-ngrok-url.ngrok-free.dev")}
          {field("gatewayToken", "Gateway Token",    <KeyIcon />,    "Enter your gateway token", "password")}
          {field("sessionKey",   "Session Key",      <HashIcon2 />,  "agent:main:your-bot")}

          {/* Connect Button */}
          <button
            onClick={onConnect}
            disabled={isConnecting || !config.openclawUrl || !config.gatewayToken || !config.sessionKey}
            className="mt-2 w-full py-3.5 rounded-xl font-bold text-[15px] tracking-wide transition-all duration-200
              bg-[#00E3AA] text-black hover:bg-[#00c994] active:scale-[0.98]
              disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100
              shadow-[0_0_24px_rgba(0,227,170,0.25)] hover:shadow-[0_0_32px_rgba(0,227,170,0.35)]
              flex items-center justify-center gap-2"
          >
            {isConnecting ? (
              <>
                <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" opacity="0.25"/>
                  <path d="M22 12a10 10 0 0 1-10 10" opacity="0.9"/>
                </svg>
                Connecting…
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                Start Session
              </>
            )}
          </button>
        </div>

        {/* Hint */}
        <p className="text-center text-[11px] text-[#3a3a3a] mt-4">
          Config is saved locally and auto-filled next time
        </p>
      </div>
    </motion.div>
  );
}

// ─── Voice Assistant (manages disconnected/connected states) ─────────────────
function SimpleVoiceAssistant({
  onConnectButtonClicked,
  config,
  setConfig,
}: {
  onConnectButtonClicked: () => void;
  config: typeof DEFAULTS;
  setConfig: (c: typeof DEFAULTS) => void;
}) {
  const { state: agentState } = useVoiceAssistant();
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [chatWidth, setChatWidth] = useState(450);
  const [isDragging, setIsDragging] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const MIN_WIDTH = 300;
  const MAX_WIDTH = 800;

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await onConnectButtonClicked();
    } finally {
      setIsConnecting(false);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const handlePointerMove = (moveEvent: PointerEvent) => {
      const newWidth = document.documentElement.clientWidth - moveEvent.clientX;
      setChatWidth(Math.min(Math.max(newWidth, MIN_WIDTH), MAX_WIDTH));
    };
    const handlePointerUp = () => {
      setIsDragging(false);
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
    };
    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <div className={`h-screen w-full overflow-hidden bg-[#050505] ${isDragging ? "select-none" : ""}`}>
      <AnimatePresence mode="wait">
        {agentState === "disconnected" ? (
          <SessionConfigForm
            key="config"
            config={config}
            setConfig={setConfig}
            onConnect={handleConnect}
            isConnecting={isConnecting}
          />
        ) : (
          <motion.div
            key="connected"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex h-full w-full"
          >
            {/* Left Main Area */}
            <main className="flex-1 h-full flex flex-col relative bg-[#000000]">
              <div className="flex-1 flex items-center justify-center p-12">
                <AgentVisualizer />
              </div>
              <div className="absolute bottom-12 left-0 right-0 flex justify-center">
                <ControlBar
                  onConnectButtonClicked={onConnectButtonClicked}
                  isChatVisible={isChatVisible}
                  setIsChatVisible={setIsChatVisible}
                />
              </div>
            </main>

            {/* Right Sidebar: Chat */}
            <motion.aside
              initial={false}
              animate={{ width: isChatVisible ? chatWidth : 0, opacity: isChatVisible ? 1 : 0 }}
              transition={{ duration: isDragging ? 0 : 0.3, ease: "easeInOut" }}
              className="relative min-w-0 h-full border-l border-white/5 bg-black/10 backdrop-blur-md overflow-hidden flex-shrink-0"
            >
              {isChatVisible && (
                <div
                  onPointerDown={handlePointerDown}
                  className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize z-10 hover:bg-white/10 active:bg-white/20 transition-colors"
                />
              )}
              <div style={{ width: chatWidth }} className="h-full">
                <TranscriptionView />
              </div>
            </motion.aside>

            <RoomAudioRenderer />
            <NoAgentNotification state={agentState} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Agent Visualizer ────────────────────────────────────────────────────────
function AgentVisualizer() {
  const { state: agentState, videoTrack, audioTrack } = useVoiceAssistant();
  if (videoTrack) {
    return (
      <div className="w-full max-w-5xl mx-auto aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black/50 transition-all duration-300">
        <VideoTrack trackRef={videoTrack} className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className="h-[300px] w-full max-w-2xl mx-auto flex items-center justify-center">
      <BarVisualizer state={agentState} barCount={5} trackRef={audioTrack} className="agent-visualizer" options={{ minHeight: 24 }} />
    </div>
  );
}

// ─── Control Bar ─────────────────────────────────────────────────────────────
const MicIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>
  </svg>
);
const MicOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="2" x2="22" y1="2" y2="22"/>
    <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/>
    <path d="M5 10v2a7 7 0 0 0 12 5"/>
    <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/>
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12"/>
    <line x1="12" x2="12" y1="19" y2="22"/>
  </svg>
);
const MessageIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>
  </svg>
);
const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6"/>
  </svg>
);
const CrossIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);

function ControlBar(props: {
  onConnectButtonClicked: () => void;
  isChatVisible: boolean;
  setIsChatVisible: (v: boolean) => void;
}) {
  const { state: agentState } = useVoiceAssistant();
  const room = useRoomContext();
  const [isMicEnabled, setIsMicEnabled] = useState(true);

  const toggleMic = async () => {
    const enabled = !isMicEnabled;
    setIsMicEnabled(enabled);
    await room.localParticipant.setMicrophoneEnabled(enabled);
  };

  if (agentState === "disconnected" || agentState === "connecting") return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.4, ease: [0.09, 1.04, 0.245, 1.055] }}
      className="flex items-center gap-4"
    >
      <div className="control-pill">
        <button onClick={toggleMic} className="control-button-white">
          {isMicEnabled ? <MicIcon /> : <MicOffIcon />}
        </button>
        <div className="control-dropdown-part"><ChevronDownIcon /></div>
      </div>

      <button
        onClick={() => props.setIsChatVisible(!props.isChatVisible)}
        className={`control-circle ${props.isChatVisible ? "active" : ""}`}
      >
        <MessageIcon />
      </button>

      <DisconnectButton className="disconnect-circle">
        <CrossIcon />
      </DisconnectButton>
    </motion.div>
  );
}

function onDeviceFailure(error: Error) {
  console.error(error);
  alert("Error acquiring microphone permissions. Please grant the necessary permissions and reload.");
}
