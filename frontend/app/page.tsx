"use client";

import { CloseIcon } from "@/components/CloseIcon";
import { NoAgentNotification } from "@/components/NoAgentNotification";
import TranscriptionView from "@/components/TranscriptionView";
// @ts-ignore
import {
  BarVisualizer,
  DisconnectButton,
  RoomAudioRenderer,
  VideoTrack,
  useVoiceAssistant,
  useRoomContext,
  RoomContext,
} from "@livekit/components-react";
import useCombinedTranscriptions from "@/hooks/useCombinedTranscriptions";
import { AnimatePresence, motion } from "framer-motion";
import { Room, RoomEvent, DisconnectReason } from "livekit-client";
import { useCallback, useEffect, useState, useRef } from "react";
import type { ConnectionDetails } from "./api/connection-details/route";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser, saveUserToLocalStorage } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import Image from "next/image";
import { 
  fetchBotsAction as fetchBots, 
  createBotAction as createBot, 
  updateBotAction as updateBot, 
  deleteBotAction as deleteBot, 
  fetchConversationsAction as fetchConversations,
  createConversationAction,
  updateLastConfigAction as updateLastConfig,
  syncUserAction,
  Bot 
} from "@/lib/database-actions";
import { supabase } from "@/lib/supabase-client";

// ─── Session Config Defaults ────────────────────────────────────────────────
const DEFAULTS = {
  openclawUrl:  "",
  gatewayToken: "",
  sessionKey:   "",
  avatarId:     "",
  botName:      "",
};

// ─── Avatars ────────────────────────────────────────────────────────────────
const AVATARS = [
  { id: "182b03e8", name: "Kevin",    image: "/avatars/kevin.jpg" },
  { id: "21ef04ad", name: "Jessica",  image: "/avatars/jessica.jpeg" },
  { id: "17de03e4", name: "Cathy",    image: "/avatars/cathy.jpg" },
  { id: "1928040f", name: "Sofia",    image: "/avatars/sofia.jpeg" },
  { id: "c5b563de", name: "Lucy",     image: "/avatars/lucy.jpg" },
  { id: "178303d3", name: "Kiara",    image: "/avatars/kiara.jpg" },
  { id: "05a001fc", name: "Jason",    image: "/avatars/jason.jpg" },
  { id: "be5b2ce0", name: "Sameer",   image: "/avatars/sameer.jpeg" },
  { id: "0de70332", name: "Jennifer", image: "/avatars/jennifer.jpg" },
  { id: "03ae0187", name: "Mike",     image: "/avatars/mike.jpg" },
  { id: "1fa504ff", name: "Johnny",   image: "/avatars/johnny.jpg" },
  { id: "7d881c1b", name: "Priya",    image: "/avatars/priya.jpg" },
  { id: "178803d6", name: "Chloe",    image: "/avatars/chole.jpeg" },
  { id: "1a640442", name: "Lisa",     image: "/avatars/lisa.png" },
  { id: "0f160301", name: "Aman",     image: "/avatars/aman.jpg" },
  { id: "057501e8", name: "Allie",    image: "/avatars/allie.jpg" },
  { id: "05b401f3", name: "Misha",    image: "/avatars/misha.jpg" },
  { id: "13550375", name: "Alex",     image: "/avatars/alex.png" },
  { id: "48d778c9", name: "Amir",     image: "/avatars/amir.jpg" },
  { id: "18c4043e", name: "Akbar",    image: "/avatars/akbar.jpg" },
];

// ─── Icons ──────────────────────────────────────────────────────────────────
const UserIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const SmileIcon = ({ size = 15, className = "" }: { size?: number, className?: string }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
  </svg>
);
const LibraryIcon = ({ size = 15, className = "" }: { size?: number, className?: string }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/>
    <line x1="8" x2="16" y1="6" y2="6"/>
    <line x1="8" x2="16" y1="10" y2="10"/>
    <line x1="8" x2="16" y1="14" y2="14"/>
    <line x1="8" x2="16" y1="18" y2="18"/>
  </svg>
);
const LinkIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);
const KeyIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/>
  </svg>
);
const HashIcon2 = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/>
    <line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/>
  </svg>
);
const SettingsIcon = ({ size = 20, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const RefreshCwIcon = ({ size = 20, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
    <path d="M21 3v5h-5"/>
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
    <path d="M3 21v-5h5"/>
  </svg>
);
const TrashIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
  </svg>
);
const ClockIcon = ({ size = 20, className = "" }: { size?: number, className?: string }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const MicIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>
  </svg>
);
const MicOffIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="2" x2="22" y1="2" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" x2="12" y1="19" y2="22"/>
  </svg>
);
const MessageIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>
  </svg>
);
const ChevronDownIcon = ({ className = "", size = 14 }: { className?: string, size?: number }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6"/>
  </svg>
);
const CrossIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);
// Removed duplicate icons at bottom

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function Page() {
  const router = useRouter();
  const [room] = useState(new Room());
  const [activeSession, setActiveSession] = useState("Library");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Session config state
  const [config, setConfig] = useState<typeof DEFAULTS>(DEFAULTS);
  const [bots, setBots] = useState<Bot[]>([]);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [isLoadingBots, setIsLoadingBots] = useState(false);
  const [editingBotId, setEditingBotId] = useState<string | null>(null);

  // Conversation tracking state
  const [sessionTranscript, setSessionTranscript] = useState<any[]>([]);
  const transcriptRef = useRef<any[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const finalSegmentIds = useRef<Set<string>>(new Set());
  const segmentsMapRef = useRef<Map<string, any>>(new Map());
  const configRef = useRef(config);
  const activeSessionRef = useRef(activeSession);
  
  // Sync refs with state to ensure handleDisconnected sees latest values
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  // Robust Transcription Tracking via Hook
  // (Moved to TranscriptSynchronizer component to stay within RoomContext)

  // Load config on mount
  useEffect(() => {
    async function init() {
      // 1. Try localStorage first (fastest)
      const saved = localStorage.getItem("openclaw_config");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setConfig({ ...DEFAULTS, ...parsed });
        } catch (e) {}
      }

      // 2. Fetch profile and bots
      const user = getUser();
      if (user?.email) {
        try {
          // Sync profile via Server Action
          const profile = await syncUserAction(user.email);
            
          if (profile) {
            setProfileId(profile.id);
            // Fetch bots
            setIsLoadingBots(true);
            const userBots = await fetchBots(profile.id);
            setBots(userBots);
            setIsLoadingBots(false);
            
            // Fetch last config if nothing in localStorage
            if (!saved && profile.last_config) {
              setConfig({ ...DEFAULTS, ...profile.last_config });
              localStorage.setItem("openclaw_config", JSON.stringify(profile.last_config));
            }
          }
        } catch (err) {
          console.error("Initialization error:", err);
        }
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
    } else {
      setAuthChecked(true);
    }
  }, [router]);
  
  // Fetch conversations when switching to the Monitor section
  useEffect(() => {
    if (activeSession === "Conversations" && authChecked) {
      const loadConversations = async () => {
        setIsLoadingConversations(true);
        try {
          const user = getUser();
          if (user?.email) {
            const data = await fetchConversations(user.email);
            setConversations(data);
          }
        } catch (err) {
          console.error("Failed to fetch conversations:", err);
        } finally {
          setIsLoadingConversations(false);
        }
      };
      loadConversations();
    }
  }, [activeSession, authChecked]);

  const generateSessionId = (prefix: string) => {
    // Generate a fixed-length timestamp for consistency (e.g., 20260314203015)
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0') +
      now.getHours().toString().padStart(2, '0') +
      now.getMinutes().toString().padStart(2, '0') +
      now.getSeconds().toString().padStart(2, '0');
    
    // Sanitize: allow alphanumeric and hyphens, lowercase
    const cleanPrefix = prefix.toLowerCase().replace(/[^a-z0-9-]/g, '') || "bot";
    return `${cleanPrefix}-${timestamp}`;
  };

  const onConnectButtonClicked = useCallback(async (forcedSessionKey?: string, forcedConfig?: typeof DEFAULTS) => {
    // HARD RESET: Clear all previous session data before starting a new one
    console.log("🧹 Hard Reset: Clearing previous session data");
    setSessionTranscript([]);
    transcriptRef.current = [];
    setSessionStartTime(null);
    startTimeRef.current = null;
    segmentsMapRef.current.clear();
    finalSegmentIds.current.clear();

    const activeConfig = forcedConfig || config;

    // 1. Persist config to localStorage (Works on Vercel)
    localStorage.setItem("openclaw_config", JSON.stringify(activeConfig));

    // 2. Sync to Supabase & local files
    const user = getUser();
    if (user?.email) {
      await updateLastConfig(user.email, activeConfig);
      try {
        await fetch("/api/user-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email, config: activeConfig }),
        });
      } catch (err) {
        console.warn("Local sync skipped (expected on production)");
      }
    }

    // Final validation and enrichment
    // Check if the session key is already timestamped (ends with 14 digits)
    let sessionKeyToUse = forcedSessionKey || activeConfig.sessionKey;
    
    if (!sessionKeyToUse || !/-\d{14}$/.test(sessionKeyToUse)) {
      const baseName = sessionKeyToUse || activeConfig.botName || "bot";
      sessionKeyToUse = generateSessionId(baseName);
    }

    const finalSessionKey = sessionKeyToUse.startsWith("agent:main:")
      ? sessionKeyToUse
      : `agent:main:${sessionKeyToUse}`;

    const finalConfig = {
      ...activeConfig,
      avatarId: activeConfig.avatarId || AVATARS[0].id,
      sessionKey: finalSessionKey,
      botName: activeConfig.botName || (AVATARS.find(a => a.id === activeConfig.avatarId)?.name) || "Bot"
    };

    // Update config state to ensure save logic has correct session key
    setConfig(finalConfig);

    console.log("🚀 Connecting with config:", finalConfig);
    const response = await fetch("/api/connection-details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(finalConfig),
    });

    const connectionDetailsData: ConnectionDetails = await response.json();
    await room.connect(connectionDetailsData.serverUrl, connectionDetailsData.participantToken, {
      // @ts-ignore
      signalTimeout: 30000, 
      connectTimeout: 30000,
    });
    await room.localParticipant.setMicrophoneEnabled(true);
  }, [room, config]);

  useEffect(() => {
    room.on(RoomEvent.MediaDevicesError, onDeviceFailure);
    
    // Manual Transcription tracking removed in favor of useCombinedTranscriptions hook

    const handleConnected = () => {
      console.log("🚀 Session Connected Logic Triggered");
      const now = Date.now();
      setSessionStartTime(now);
      startTimeRef.current = now;
      setSessionTranscript([]);
      transcriptRef.current = [];
      segmentsMapRef.current.clear();
      finalSegmentIds.current.clear();
    };

    const handleDisconnected = async (reason?: DisconnectReason) => {
      console.log("📡 handleDisconnected Logic Triggered, Reason:", reason);
      const endTime = Date.now();
      const startTime = startTimeRef.current;
      const duration = startTime ? Math.round((endTime - startTime) / 1000) : 0;
      
      const currentTranscript = transcriptRef.current;
      const user = getUser();
      const currentConfig = configRef.current;
      const currentSessionType = activeSessionRef.current;
      
      // Determine session status based on disconnect reason
      let status = "Completed";
      if (reason && reason !== DisconnectReason.CLIENT_INITIATED) {
        if ([DisconnectReason.SERVER_SHUTDOWN, DisconnectReason.PARTICIPANT_REMOVED, DisconnectReason.ROOM_DELETED].includes(reason)) {
          status = "Terminated";
        } else if ([DisconnectReason.STATE_MISMATCH, DisconnectReason.JOIN_FAILURE].includes(reason)) {
          status = "Failed";
        } else {
          status = "Interrupted";
        }
      }

      console.log("📊 Session Summary:", {
        transcriptCount: currentTranscript.length,
        userEmail: user?.email,
        duration: duration + "s",
        sessionType: currentSessionType,
        status
      });

      // Filter for non-empty text and ensure we only save if there's meaningful interaction
      const filteredTranscript = currentTranscript
        .filter(s => s.text && s.text.trim().length > 0)
        .map(s => ({
          text: s.text,
          isAgent: s.isAgent,
          timestamp: s.timestamp,
          participant: s.participant
        }));

      if (filteredTranscript.length > 0 && user?.email) {
        try {
          const selectedAvatar = AVATARS.find(a => a.id === currentConfig.avatarId) || AVATARS[0];
          console.log("💾 Persisting conversation to Supabase via Server Action...");
          
          // Use sessionKey as bot_name for history but strip the internal agent:main: prefix
          const cleanHistoryName = currentConfig.sessionKey.replace(/^agent:main:/, "");
          const data = await createConversationAction({
            user_email: user.email,
            bot_name: cleanHistoryName || currentConfig.botName || selectedAvatar.name || "Unknown Session",
            bot_avatar: selectedAvatar.id,
            status: status, // Dynamic status
            duration: duration.toString(),
            transcript: filteredTranscript, 
          });

          console.log("✅ Conversation saved successfully:", data);
          
          // Refresh the conversations list
          const conversationsData = await fetchConversations(user.email);
          setConversations(conversationsData);
          
        } catch (err) {
          console.error("⛔ Critical Saving Exception:", err);
        }
      }

      // REDIRECTION: If this was a Direct Call, go back to the library automatically
      if (currentSessionType === "DirectCall") {
        console.log("↩️ Direct Call ended, returning to Library");
        setActiveSession("Library");
      }
      
      // Cleanup for next session
      setSessionStartTime(null);
      startTimeRef.current = null;
      segmentsMapRef.current.clear();
      finalSegmentIds.current.clear();
      setSessionTranscript([]);
      transcriptRef.current = [];
    };

    room.on(RoomEvent.Connected, handleConnected);
    room.on(RoomEvent.Disconnected, handleDisconnected);

    return () => {
      console.log("🧹 Cleaning up Room listeners");
      room.off(RoomEvent.MediaDevicesError, onDeviceFailure);
      room.off(RoomEvent.Connected, handleConnected);
      room.off(RoomEvent.Disconnected, handleDisconnected);
    };
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

  const handleSaveBot = async () => {
    if (!profileId) return;
    setIsLoadingBots(true);
    try {
      if (editingBotId) {
        // Update existing bot
        const { error } = await supabase
          .from('bots')
          .update({
            avatar_id: config.avatarId,
            openclaw_url: config.openclawUrl,
            gateway_token: config.gatewayToken,
            session_key: config.sessionKey,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingBotId);
          
        if (error) throw error;
        setEditingBotId(null);
      } else {
        // Create new bot
        const selectedAvatar = AVATARS.find(a => a.id === config.avatarId);
        await createBot({
          user_id: profileId,
          name: selectedAvatar ? `${selectedAvatar.name}'s Bot` : "My New Bot",
          avatar_id: config.avatarId,
          openclaw_url: config.openclawUrl,
          gateway_token: config.gatewayToken,
          session_key: config.sessionKey,
          voice_id: "default",
        });
      }
      // Refresh bots list
      const userBots = await fetchBots(profileId);
      setBots(userBots);
      setActiveSession("Library");
    } catch (err: any) {
      console.error("Failed to save/update bot:", err.message || err);
    } finally {
      setIsLoadingBots(false);
    }
  };

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
          {/* @ts-ignore */}
          <RoomContext.Provider value={room}>
            <RoomAudioRenderer />
            <TranscriptSynchronizer transcriptRef={transcriptRef} startTimeRef={startTimeRef} />
            {activeSession === "My Bot" ? (
              <SimpleVoiceAssistant
                onConnectButtonClicked={onConnectButtonClicked}
                config={config}
                setConfig={setConfig}
                onOpenPicker={() => setIsAvatarPickerOpen(true)}
                onSaveAsBot={handleSaveBot}
                isSavingBot={isLoadingBots}
                isEditing={!!editingBotId}
                onCancelEdit={() => {
                  setEditingBotId(null);
                  setConfig(DEFAULTS);
                }}
              />
            ) : activeSession === "DirectCall" ? (
              <DirectCallDashboard
                config={config}
                autoStart={true}
                onStartCall={() => {
                  const autoId = generateSessionId(config.sessionKey || config.botName || "bot");
                  onConnectButtonClicked(autoId);
                }}
                onBack={() => setActiveSession("Library")}
              />
            ) : activeSession === "Avatars" ? (
              <AvatarGallery />
            ) : activeSession === "Library" ? (
              <BotLibraryView 
                bots={bots} 
                profileId={profileId} 
                onRefresh={async () => {
                  if (profileId) {
                    setIsLoadingBots(true);
                    const userBots = await fetchBots(profileId);
                    setBots(userBots);
                    setIsLoadingBots(false);
                  }
                }}
                onSelectBot={(bot) => {
                  const newConfig = {
                    openclawUrl: bot.openclaw_url,
                    gatewayToken: bot.gateway_token,
                    sessionKey: bot.session_key,
                    avatarId: bot.avatar_id,
                    botName: bot.name,
                  };
                  setConfig(newConfig); // ensure state is updated for dashboard
                  const autoId = generateSessionId(bot.session_key || bot.name || "bot");
                  onConnectButtonClicked(autoId, newConfig);
                  setActiveSession("DirectCall");
                }}
                onEditBot={(bot) => {
                  setEditingBotId(bot.id);
                  setConfig({
                    openclawUrl: bot.openclaw_url,
                    gatewayToken: bot.gateway_token,
                    sessionKey: bot.session_key,
                    avatarId: bot.avatar_id,
                    botName: bot.name,
                  });
                  setActiveSession("My Bot");
                }}
              />
            ) : activeSession === "Conversations" ? (
              selectedConversation ? (
                <ConversationDetailView 
                  conversation={selectedConversation} 
                  onBack={() => setSelectedConversation(null)} 
                />
              ) : (
                <ConversationsListView
                  isLoading={isLoadingConversations}
                  conversations={conversations}
                  onSelect={(conv) => setSelectedConversation(conv)}
                />
              )
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
      <AvatarPickerModal
        isOpen={isAvatarPickerOpen}
        onClose={() => setIsAvatarPickerOpen(false)}
        currentId={config.avatarId}
        onSelect={(id) => {
          const avatar = AVATARS.find(a => a.id === id);
          setConfig({ 
            ...config, 
            avatarId: id,
            botName: (!config.botName || config.botName === "Bot" || config.botName === "My Bot") 
              ? (avatar?.name || "") 
              : config.botName
          });
        }}
      />
    </main>
  );
}

// ─── Session Config Form ─────────────────────────────────────────────────────
function SessionConfigForm({
  config,
  setConfig,
  onConnect,
  isConnecting,
  onOpenPicker,
  onSaveAsBot,
  isSavingBot,
  isEditing,
  onCancelEdit,
}: {
  config: typeof DEFAULTS;
  setConfig: (c: typeof DEFAULTS) => void;
  onConnect: () => void;
  isConnecting: boolean;
  onOpenPicker: () => void;
  onSaveAsBot?: () => void;
  isSavingBot?: boolean;
  isEditing?: boolean;
  onCancelEdit?: () => void;
}) {
  const [showToken, setShowToken] = useState(false);
  const selectedAvatar = AVATARS.find(a => a.id === config.avatarId);

  const field = (
    key: keyof typeof DEFAULTS,
    label: string,
    icon: React.ReactNode,
    placeholder: string,
    prefix?: string
  ) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6b7280] flex items-center gap-1.5">
        <span className="text-[#9ca3af]">{icon}</span>
        {label}
      </label>
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-4 text-[#4b5563] font-mono text-[14px] pointer-events-none select-none">
            {prefix}
          </span>
        )}
        <input
          type={key === "gatewayToken" && !showToken ? "password" : "text"}
          value={config[key]}
          onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
          placeholder={placeholder}
          className={`w-full bg-[#0d0d0d] border border-[#242424] rounded-xl py-3 text-[14px] text-white placeholder-[#3a3a3a] focus:outline-none focus:border-[#00E3AA]/50 focus:ring-1 focus:ring-[#00E3AA]/20 transition-all duration-200 pr-10 font-mono ${
            prefix ? "pl-[105px]" : "px-4"
          }`}
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
                <path d="M1 12s4-8 11-8 11-8 11 8-4 8-11 8-11-8-11-8z"/>
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
        <div className="mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#1c2e28] flex items-center justify-center mx-auto mb-4 shadow-[0_0_32px_rgba(0,227,170,0.12)]">
            <Image src="/openclaw.png" alt="ClawdFace" width={34} height={34} className="object-contain" />
          </div>
          <h2 className="text-[22px] font-bold text-white tracking-tight">
            {isEditing ? "Edit Bot Configuration" : "Configure Session"}
          </h2>
          <p className="text-[#6b7280] text-[13px] mt-1">
            {isEditing ? "Update your bot settings below" : "Connect to your OpenClaw backend to start the conversation"}
          </p>
        </div>

        <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-6 flex flex-col gap-5 shadow-2xl">
          {field("openclawUrl",  "OpenClaw URL",     <LinkIcon />,   "http://localhost:18789")}
          {field("gatewayToken", "Gateway Token",    <KeyIcon />,    "Enter your gateway token")}
          {field("sessionKey",   "Session Key",      <HashIcon2 />,  "bot-name", "agent:main:")}

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6b7280] flex items-center gap-1.5">
              <span className="text-[#9ca3af]"><UserIcon size={14} /></span>
              Avatar <span className="text-[#00E3AA] ml-0.5">*</span>
            </label>
            <button
              onClick={onOpenPicker}
              className="group relative w-full aspect-video rounded-xl bg-[#0d0d0d] border-2 border-dashed border-[#242424] hover:border-[#00E3AA]/40 transition-all duration-300 overflow-hidden flex flex-col items-center justify-center gap-3"
            >
              {selectedAvatar ? (
                <>
                  <Image 
                    src={selectedAvatar.image} 
                    alt={selectedAvatar.name} 
                    fill 
                    className="object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="relative z-10 flex flex-col items-center gap-1">
                    <span className="text-white font-bold text-sm tracking-tight">{selectedAvatar.name}</span>
                    <span className="text-[11px] text-[#00E3AA] font-medium uppercase tracking-wider">Change Avatar</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-[#4b5563] group-hover:text-[#00E3AA] group-hover:bg-[#00E3AA]/10 transition-colors">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  </div>
                  <span className="text-[13px] font-bold text-[#4b5563] group-hover:text-white transition-colors">Choose From Existing Avatars</span>
                </>
              )}
            </button>
          </div>

          <div className="flex flex-col gap-3 mt-4">
            <button
              onClick={onConnect}
              disabled={isConnecting || !config.openclawUrl || !config.gatewayToken || !config.sessionKey}
              className="w-full py-3.5 rounded-xl font-bold text-[15px] tracking-wide transition-all duration-200
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

            <button
              onClick={onSaveAsBot}
              disabled={isSavingBot || !config.openclawUrl}
              className="w-full py-3 bg-white/[0.03] hover:bg-white/[0.08] disabled:opacity-40 text-white/90 font-semibold rounded-xl transition-all border border-white/5 hover:border-white/10 text-[14px] flex items-center justify-center gap-2 shadow-sm"
            >
              {isSavingBot ? (
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <circle cx="12" cy="12" r="10" opacity="0.25"/><path d="M22 12a10 10 0 0 1-10 10" opacity="0.9"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                </svg>
              )}
              {isEditing ? "Update Bot" : "Save as new Bot"}
            </button>
            {isEditing && (
              <button
                onClick={onCancelEdit}
                className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-semibold rounded-xl transition-all border border-red-500/10 text-[14px]"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-[11px] text-[#3a3a3a] mt-4">
          Config is saved locally and auto-filled next time
        </p>
      </div>
    </motion.div>
  );
}

// ─── Avatar Picker Modal ─────────────────────────────────────────────────────
function AvatarPickerModal({
  currentId,
  isOpen,
  onClose,
  onSelect
}: {
  currentId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const [tempId, setTempId] = useState(currentId);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-5xl h-[85vh] bg-[#0a0a0a] rounded-3xl border border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col relative"
      >
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-[#111111]/50">
          <div>
            <h2 className="text-xl font-bold text-white">Add Avatar</h2>
            <p className="text-[#6b7280] text-xs mt-0.5">Select an identity for your interaction</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-[#6b7280] hover:text-white transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {AVATARS.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => setTempId(avatar.id)}
                className={`group relative rounded-2xl transition-all duration-300 overflow-hidden ${
                  tempId === avatar.id ? "ring-2 ring-[#00E3AA] shadow-[0_0_30px_rgba(0,227,170,0.2)]" : "border border-white/5 hover:border-white/10"
                }`}
              >
                <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/5 shadow-inner">
                  <img src={avatar.image} alt={avatar.name} className={`w-full h-full object-cover transition-transform duration-500 ${tempId === avatar.id ? "scale-105" : "group-hover:scale-105"}`} loading="lazy" />
                  <div className="absolute top-2 left-2"><span className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md text-[11px] text-white font-semibold border border-white/10 shadow-lg">{avatar.name}</span></div>
                  <div className="absolute top-2 right-2"><span className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md text-[11px] text-white/80 font-medium border border-white/10 shadow-lg">Huma-2</span></div>
                  <div className="absolute bottom-3 left-3"><span className="text-[10px] text-white font-bold uppercase tracking-wider">PRO</span></div>
                  <div className="absolute bottom-3 right-3"><span className="text-[10px] text-white/70 font-mono">id:{avatar.id}</span></div>
                  {tempId === avatar.id && (
                    <div className="absolute inset-0 bg-[#00E3AA]/10 flex items-center justify-center backdrop-blur-[1px]">
                      <div className="w-10 h-10 rounded-full bg-[#00E3AA] text-black flex items-center justify-center shadow-xl ring-4 ring-[#00E3AA]/20">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="px-6 py-5 border-t border-white/5 flex items-center justify-between bg-[#111111]/50">
          <button onClick={onClose} className="px-6 py-2.5 text-sm font-semibold text-[#9ca3af] hover:text-white transition-colors">Cancel</button>
          <button onClick={() => { onSelect(tempId); onClose(); }} className="px-8 py-2.5 rounded-xl bg-[#00E3AA] text-black font-bold text-sm tracking-wide shadow-lg hover:bg-[#00c994] transition-all">Save Selection</button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Avatar Gallery ──────────────────────────────────────────────────────────
function AvatarGallery() {
  return (
    <div className="absolute inset-0 overflow-y-auto p-6 md:p-10 custom-scrollbar bg-[#050505] z-10">
      <div className="max-w-6xl mx-auto pb-20">
        <header className="mb-10 text-center md:text-left">
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <SmileIcon size={32} className="text-[#00E3AA]" />
            Stock Avatars
          </h1>
          <p className="text-[#6b7280] mt-2">Design your AI companions with advanced customization</p>
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
          {AVATARS.map((avatar) => (
            <div key={avatar.id} className="group relative rounded-2xl transition-all duration-300 overflow-hidden border border-white/5 hover:border-white/10">
              <div className="relative w-full aspect-video">
                <img src={avatar.image} alt={avatar.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                <div className="absolute top-2 left-2"><span className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md text-[11px] text-white font-semibold border border-white/10 shadow-lg">{avatar.name}</span></div>
                <div className="absolute top-2 right-2"><span className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md text-[11px] text-white/80 font-medium border border-white/10 shadow-lg">Huma-2</span></div>
                <div className="absolute bottom-3 left-3"><span className="text-[10px] text-white font-bold uppercase tracking-wider">PRO</span></div>
                <div className="absolute bottom-3 right-3"><span className="text-[10px] text-white/70 font-mono">id:{avatar.id}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Transcript Synchronizer ─────────────────────────────────────────────────
function TranscriptSynchronizer({ 
  transcriptRef,
  startTimeRef
}: { 
  transcriptRef: React.MutableRefObject<any[]>,
  startTimeRef: React.MutableRefObject<number | null>
}) {
  const combinedTranscriptions = useCombinedTranscriptions();
  
  useEffect(() => {
    if (combinedTranscriptions.length > 0) {
      const startTime = startTimeRef.current || 0;
      
      // Only include segments that started AFTER the session began
      const filtered = combinedTranscriptions.filter(s => s.firstReceivedTime >= startTime);

      if (filtered.length > 0) {
        transcriptRef.current = filtered.map(s => ({
          text: s.text,
          isAgent: s.role === "assistant",
          timestamp: new Date(s.firstReceivedTime).toISOString(),
          participant: s.role === "assistant" ? "Agent" : "User"
        }));
      }
    }
  }, [combinedTranscriptions]);
  
  return null;
}

// ─── Active Voice Assistant View ─────────────────────────────────────────────
function ActiveVoiceAssistantView({ onConnectButtonClicked }: { onConnectButtonClicked: () => void }) {
  const { state: agentState } = useVoiceAssistant();
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [chatWidth, setChatWidth] = useState(450);
  const [isDragging, setIsDragging] = useState(false);

  const MIN_WIDTH = 300;
  const MAX_WIDTH = 800;

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

  if (agentState === "disconnected") return null;

  const isAgentInteractive = ["listening", "thinking", "speaking", "idle"].includes(agentState);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="absolute inset-0 flex h-full w-full bg-[#050505] overflow-hidden z-20"
    >
      <main className="flex-1 h-full flex flex-col relative bg-[#000000]">
        <div className="flex-1 flex items-center justify-center p-12">
          {/* Only render visualizer when truly interactive, to prevent premature waving */}
          {isAgentInteractive && <AgentVisualizer />}
        </div>
        <div className="absolute bottom-12 left-0 right-0 flex justify-center">
          <ControlBar onConnectButtonClicked={onConnectButtonClicked} isChatVisible={isChatVisible} setIsChatVisible={setIsChatVisible} />
        </div>
      </main>
      <motion.aside
        initial={false}
        animate={{ width: isChatVisible ? chatWidth : 0, opacity: isChatVisible ? 1 : 0 }}
        transition={{ duration: isDragging ? 0 : 0.3, ease: "easeInOut" }}
        className="relative min-w-0 h-full border-l border-white/5 bg-black/10 backdrop-blur-md overflow-hidden flex-shrink-0"
      >
        {isChatVisible && (
          <div onPointerDown={handlePointerDown} className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize z-10 hover:bg-white/10 active:bg-white/20 transition-colors" />
        )}
        <div style={{ width: chatWidth }} className="h-full">
          <TranscriptionView />
        </div>
      </motion.aside>
      <NoAgentNotification state={agentState} />
    </motion.div>
  );
}

// ─── Voice Assistant (manages disconnected/connected states) ─────────────────
function SimpleVoiceAssistant({
  onConnectButtonClicked,
  config,
  setConfig,
  onOpenPicker,
  onSaveAsBot,
  isSavingBot,
  isEditing,
  onCancelEdit,
}: {
  onConnectButtonClicked: () => void;
  config: typeof DEFAULTS;
  setConfig: (c: typeof DEFAULTS) => void;
  onOpenPicker: () => void;
  onSaveAsBot?: () => void;
  isSavingBot?: boolean;
  isEditing?: boolean;
  onCancelEdit?: () => void;
}) {
  const { state: agentState } = useVoiceAssistant();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await onConnectButtonClicked();
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="h-screen w-full bg-[#050505]">
      <AnimatePresence mode="wait">
        {!["listening", "thinking", "speaking", "idle"].includes(agentState) ? (
          <SessionConfigForm
            key="config"
            config={config}
            setConfig={setConfig}
            onConnect={handleConnect}
            isConnecting={isConnecting}
            onOpenPicker={onOpenPicker}
            onSaveAsBot={onSaveAsBot}
            isSavingBot={isSavingBot}
            isEditing={isEditing}
            onCancelEdit={onCancelEdit}
          />
        ) : (
          <ActiveVoiceAssistantView 
            key="active" 
            onConnectButtonClicked={onConnectButtonClicked} 
          />
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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.4, ease: [0.09, 1.04, 0.245, 1.055] }} className="flex items-center gap-4">
      <div className="control-pill">
        <button onClick={toggleMic} className="control-button-white">{isMicEnabled ? <MicIcon /> : <MicOffIcon />}</button>
        <div className="control-dropdown-part"><ChevronDownIcon /></div>
      </div>
      <button onClick={() => props.setIsChatVisible(!props.isChatVisible)} className={`control-circle ${props.isChatVisible ? "active" : ""}`}><MessageIcon /></button>
      <DisconnectButton className="disconnect-circle"><CrossIcon /></DisconnectButton>
    </motion.div>
  );
}

function onDeviceFailure(error: Error) {
  console.error(error);
  alert("Error acquiring microphone permissions. Please grant the necessary permissions and reload.");
}

// ─── Bot Library View ────────────────────────────────────────────────────────
function BotLibraryView({ 
  bots, 
  profileId, 
  onRefresh, 
  onSelectBot,
  onEditBot
}: { 
  bots: Bot[], 
  profileId: string | null,
  onRefresh: () => void,
  onSelectBot: (bot: Bot) => void,
  onEditBot: (bot: Bot) => void
}) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this bot?")) return;
    setIsDeleting(id);
    try {
      await deleteBot(id);
      onRefresh();
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setIsDeleting(null);
    }
  };
  return (
    <div className="absolute inset-0 overflow-y-auto p-6 md:p-10 custom-scrollbar bg-[#050505] z-10">
      <div className="max-w-6xl mx-auto pb-20">
        <header className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <LibraryIcon size={32} className="text-[#00E3AA]" />
              Bot Library
            </h1>
            <p className="text-[#6b7280] mt-2 text-sm">Manage and launch your saved AI companions</p>
          </div>
          <button onClick={onRefresh} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all border border-white/5"><RefreshCwIcon size={20} /></button>
        </header>

        {bots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.02]">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-[#4b5563] mb-4"><LibraryIcon size={32} /></div>
            <h3 className="text-lg font-semibold text-white">No Bots Saved Yet</h3>
            <p className="text-[#6b7280] text-[13px] mt-1 max-w-xs text-center">Go to &quot;My Bot&quot; and save your configuration to see it here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {bots.map((bot) => {
              const avatar = AVATARS.find(a => a.id === bot.avatar_id);
              return (
                <div key={bot.id} onClick={() => onSelectBot(bot)} className="group relative rounded-2xl bg-[#0d0d0d] border border-white/5 hover:border-[#00E3AA]/30 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col shadow-xl hover:shadow-[#00E3AA]/5">
                  <div className="relative aspect-video w-full overflow-hidden bg-[#111111]">
                    {avatar ? <img src={avatar.image} alt={bot.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-60 group-hover:opacity-80" /> : <div className="w-full h-full flex items-center justify-center text-[#242424]"><UserIcon size={48} /></div>}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
                    <div className="absolute top-3 right-3 flex gap-2">
                       <button 
                        onClick={(e) => { e.stopPropagation(); onEditBot(bot); }} 
                        className="p-2 rounded-lg bg-black/50 backdrop-blur-md border border-white/10 text-white/40 hover:text-[#00E3AA] hover:bg-[#00E3AA]/10 transition-all z-20"
                        title="Edit Bot"
                      >
                        <SettingsIcon size={14} />
                      </button>
                       <button onClick={(e) => handleDelete(bot.id, e)} className="p-2 rounded-lg bg-black/50 backdrop-blur-md border border-white/10 text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all z-20">
                        {isDeleting === bot.id ? <RefreshCwIcon size={14} className="animate-spin" /> : <TrashIcon size={14} />}
                      </button>
                    </div>
                  </div>
                  <div className="p-5 relative">
                    <div className="flex flex-col mb-3">
                      <h3 className="text-lg font-bold text-[#00E3AA] tracking-tight truncate pr-4 font-mono">{bot.session_key}</h3>
                      <span className="text-[12px] text-neutral-400 font-medium">{bot.name}</span>
                    </div>
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2.5 text-[12px] text-[#9ca3af]"><div className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center text-[#4b5563]"><LinkIcon size={12} /></div><span className="truncate max-w-[180px]">{bot.openclaw_url}</span></div>
                      <div className="flex items-center gap-2.5 text-[12px] text-[#9ca3af]"><div className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center text-[#4b5563]"><UserIcon size={12} /></div><span className="truncate">Avatar: {bot.avatar_id}</span></div>
                    </div>
                    <div className="mt-6 flex items-center justify-between pt-4 border-t border-white/5">
                      <div className="flex items-center gap-1.5 text-[11px] text-[#6b7280]"><ClockIcon size={12} /><span>Saved {new Date(bot.created_at).toLocaleDateString()}</span></div>
                      <button className="px-4 py-1.5 rounded-lg bg-[#00E3AA] hover:bg-[#00c994] text-black text-[12px] font-bold uppercase tracking-wider transition-all transform hover:scale-105 active:scale-95 shadow-[0_4px_12px_rgba(0,227,170,0.2)] flex items-center gap-1.5">
                        Connect 
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="5 3 19 12 5 21 5 3"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Conversations List View ────────────────────────────────────────────────
function ConversationsListView({
  isLoading,
  conversations,
  onSelect
}: {
  isLoading: boolean;
  conversations: any[];
  onSelect: (conv: any) => void;
}) {
  return (
    <div className="absolute inset-0 overflow-y-auto p-6 md:p-10 custom-scrollbar bg-[#050505] z-10">
      <div className="max-w-6xl mx-auto pb-20">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <RefreshCwIcon size={32} className="text-[#00E3AA]" />
            Conversations
          </h1>
          <p className="text-[#6b7280] mt-2 text-sm">Review past interactions and transcripts</p>
        </header>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCwIcon className="animate-spin text-[#00E3AA]" size={32} />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.02]">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-[#4b5563] mb-4"><MessageIcon size={32} /></div>
            <h3 className="text-lg font-semibold text-white">No Conversations Found</h3>
            <p className="text-[#6b7280] text-[13px] mt-1 max-w-xs text-center">Your interaction history will appear here after your first call.</p>
          </div>
        ) : (
          <div className="bg-[#0d0d0d] border border-white/5 rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/5">
                  <th className="px-6 py-4 text-[12px] font-bold uppercase tracking-wider text-[#6b7280]">Status</th>
                  <th className="px-6 py-4 text-[12px] font-bold uppercase tracking-wider text-[#6b7280]">Bot Detail</th>
                  <th className="px-6 py-4 text-[12px] font-bold uppercase tracking-wider text-[#6b7280]">Duration</th>
                  <th className="px-6 py-4 text-[12px] font-bold uppercase tracking-wider text-[#6b7280]">Date/Time</th>
                  <th className="px-6 py-4 text-[12px] font-bold uppercase tracking-wider text-[#6b7280]">Action</th>
                </tr>
              </thead>
              <tbody>
                {conversations.map((conv) => {
                  const getStatusStyles = (status: string) => {
                    const normalized = status?.toLowerCase();
                    if (normalized === "completed") return "bg-green-500/10 text-green-500 border-green-500/20";
                    if (normalized === "terminated") return "bg-red-500/10 text-red-500 border-red-500/20";
                    if (normalized === "failed" || normalized === "interrupted") return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
                    return "bg-gray-500/10 text-gray-500 border-gray-500/20";
                  };
                  return (
                    <tr key={conv.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer group" onClick={() => onSelect(conv)}>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusStyles(conv.status || "Completed")}`}>
                          {conv.status || "Completed"}
                        </span>
                      </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/10 flex flex-shrink-0 items-center justify-center text-[#9ca3af]">
                          {(() => {
                            // Try to find by ID, fallback to finding by Name, finally fallback to index 0
                            const avatar = AVATARS.find(a => a.id === conv.bot_avatar) 
                                        || AVATARS.find(a => a.name === conv.bot_name)
                                        || AVATARS[0];
                            return <img src={avatar.image} className="w-full h-full object-cover" alt={avatar.name} />;
                          })()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[#00E3AA] text-[10px] font-bold uppercase tracking-widest mb-0.5 opacity-80">Session Key</span>
                          <span className="text-white text-[14px] font-bold truncate leading-tight">
                            {conv.bot_name || "Unknown"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[#9ca3af] text-[13px]">{conv.duration ? `${conv.duration}s` : '0s'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-white text-[13px]">{new Date(conv.created_at).toLocaleDateString()}</span>
                        <span className="text-[#3a3a3a] text-[11px]">{new Date(conv.created_at).toLocaleTimeString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button className="px-4 py-1.5 rounded-lg bg-white/5 hover:bg-[#00E3AA]/20 hover:text-[#00E3AA] transition-all text-[12px] font-semibold text-white/70">View History</button>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Conversation Detail View ───────────────────────────────────────────────
function ConversationDetailView({
  conversation,
  onBack
}: {
  conversation: any;
  onBack: () => void;
}) {
  return (
    <div className="absolute inset-0 overflow-y-auto p-6 md:p-10 custom-scrollbar bg-[#050505] z-10">
      <div className="max-w-4xl mx-auto pb-20">
        <header className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 transition-all border border-white/5">
              <ChevronDownIcon className="rotate-90" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Conversation with {conversation.bot_name}</h1>
              <p className="text-[#6b7280] text-sm mt-1">{new Date(conversation.created_at).toLocaleString()} • {conversation.duration}s</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-[12px] font-bold uppercase border ${
            conversation.status?.toLowerCase() === "completed" ? "bg-green-500/10 text-green-500 border-green-500/20" :
            conversation.status?.toLowerCase() === "terminated" ? "bg-red-500/10 text-red-500 border-red-500/20" :
            "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
          }`}>
            {conversation.status || "Completed"}
          </span>
        </header>

        <div className="space-y-6">
          {Array.isArray(conversation.transcript) && conversation.transcript.length > 0 ? (
            conversation.transcript.map((msg: any, idx: number) => (
              <div key={idx} className={`flex ${msg.isAgent ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[80%] rounded-2xl p-4 ${msg.isAgent ? 'bg-white/5 border border-white/10 text-white' : 'bg-[#00E3AA]/10 border border-[#00E3AA]/20 text-white'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-50">{msg.isAgent ? 'Agent' : 'User'}</span>
                    <span className="text-[10px] opacity-30">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-[15px] leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 text-neutral-500">No transcript available for this session.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Direct Call Dashboard ───────────────────────────────────────────────────
const AIGlowingOrb = () => {
  return (
    <div className="relative w-40 h-40 mb-10 flex items-center justify-center">
      {/* Massive subtle outer pulse */}
      <motion.div
        className="absolute w-full h-full rounded-full bg-[#00E3AA]/10 blur-[40px]"
        animate={{ scale: [1, 2, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Secondary breathing ring */}
      <motion.div
        className="absolute w-32 h-32 rounded-full border border-[#00E3AA]/30"
        animate={{ scale: [1, 1.4, 1], opacity: [0.8, 0, 0.8] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />
      {/* Rotational aura */}
      <motion.div
        className="absolute w-28 h-28 rounded-full bg-gradient-to-tr from-[#00E3AA]/40 to-transparent blur-xl"
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
      />
      {/* Inner pulsing core */}
      <motion.div
        className="absolute w-20 h-20 rounded-full bg-gradient-to-br from-white via-[#00E3AA] to-[#00A080] shadow-[0_0_50px_rgba(0,227,170,1)] flex items-center justify-center"
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="w-full h-full rounded-full bg-white/20 blur-sm" />
        <div className="absolute w-12 h-12 rounded-full bg-white/50 blur-md mix-blend-overlay" />
      </motion.div>
    </div>
  );
};

function DirectCallDashboard({
  config,
  onStartCall,
  onBack,
  autoStart = false,
}: {
  config: typeof DEFAULTS;
  onStartCall: () => void;
  onBack: () => void;
  autoStart?: boolean;
}) {
  const { state: agentState, audioTrack, videoTrack } = useVoiceAssistant();
  const [isConnecting, setIsConnecting] = useState(autoStart || false);
  const selectedAvatar = AVATARS.find(a => a.id === config.avatarId) || AVATARS[0];

  const handleStartCall = async () => {
    setIsConnecting(true);
    // Remove hardcoded timeout, let connection state be purely dynamic
    try {
      onStartCall();
    } catch (e) {
      console.error(e);
      setIsConnecting(false);
    }
  };

  // Keep track of if we've successfully connected so we can detect a disconnection
  const hasConnectedRef = useRef(false);
  const isAgentInteractive = ["listening", "thinking", "speaking", "idle"].includes(agentState);

  useEffect(() => {
    if (isAgentInteractive) {
      hasConnectedRef.current = true;
    } else if (agentState === "disconnected" && hasConnectedRef.current) {
      // If we were connected and then the agent disconnected, return to library
      onBack();
    }
  }, [agentState, isAgentInteractive, onBack]);

  const room = useRoomContext();
  useEffect(() => {
    const handleDisconnected = () => {
      if (isConnecting) setIsConnecting(false);
      onBack();
    };
    room.on(RoomEvent.Disconnected, handleDisconnected);
    return () => {
      room.off(RoomEvent.Disconnected, handleDisconnected);
    };
  }, [room, isConnecting, onBack]);

  // Transition to the active view once the agent is no longer pending
  if (isAgentInteractive) {
    return <ActiveVoiceAssistantView onConnectButtonClicked={onStartCall} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center h-full p-6 text-center"
    >
      <div className="w-full max-w-2xl p-12 relative flex flex-col items-center justify-center">
        {/* Removed box background and border for a seamless dark theme integration */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#00E3AA]/5 rounded-full blur-[100px] pointer-events-none" />
        
        {/* Back button intentionally removed during connecting state */}

        <div className="relative mb-10 min-h-[300px] flex flex-col items-center justify-center">
          {isConnecting ? (
            <div className="flex flex-col items-center justify-center py-10">
              <AIGlowingOrb />
              <motion.h2 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="text-2xl font-bold text-white mt-4 tracking-wide flex items-center"
              >
                Connecting to bot
                <motion.span
                  className="inline-block"
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, times: [0, 0.5, 1] }}
                >
                  .
                </motion.span>
                <motion.span
                  className="inline-block"
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, times: [0, 0.5, 1], delay: 0.2 }}
                >
                  .
                </motion.span>
                <motion.span
                  className="inline-block"
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, times: [0, 0.5, 1], delay: 0.4 }}
                >
                  .
                </motion.span>
              </motion.h2>
            </div>
          ) : (
            <>
              <div className="w-56 h-56 mx-auto rounded-full p-1.5 border-2 border-[#00E3AA]/30 shadow-[0_0_40px_rgba(0,227,170,0.15)] relative">
                <div className="w-full h-full rounded-full overflow-hidden relative">
                  <Image 
                    src={selectedAvatar.image} 
                    alt={selectedAvatar.name} 
                    fill 
                    className="object-cover transition-all"
                  />
                </div>
                {/* Status indicator */}
                <div className="absolute bottom-4 right-4 w-6 h-6 rounded-full bg-[#00E3AA] border-4 border-[#0A0A0A] shadow-lg animate-pulse" />
              </div>
            </>
          )}
        </div>

        {!isConnecting && (
          <>
            <h1 className="text-4xl font-extrabold text-white mb-3 tracking-tight">
              {config.botName || selectedAvatar.name}
            </h1>
            <p className="text-neutral-400 text-lg mb-10 max-w-md mx-auto leading-relaxed">
              Your AI assistant is ready. Click the button below to start your conversation.
            </p>
          </>
        )}

        {!isConnecting && (
          <button
            onClick={handleStartCall}
            className="group relative px-12 py-5 bg-[#00E3AA] hover:bg-[#00c994] text-black font-bold text-xl rounded-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-[0_20px_40px_-12px_rgba(0,227,170,0.4)] flex items-center gap-3 mx-auto"
          >
            <svg className="group-hover:translate-x-1 transition-transform" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            Start Call
          </button>
        )}
      </div>
    </motion.div>
  );
}
