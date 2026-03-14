"use client";
import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getUser, getInitials, logout, AuthUser } from '@/lib/auth';

// ---- Icons ----
const BotIcon = () => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="10" x="3" y="11" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" x2="8" y1="16" y2="16"/><line x1="16" x2="16" y1="16" y2="16"/></svg>;
const LibraryIcon = () => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>;
const UserIcon = () => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const HistoryIcon = () => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>;
const MonitorIcon = () => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>;
const ChevronDown = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>;
const CollapseIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m14 9 3 3-3 3"/></svg>;
const ExpandIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m16 15-3-3 3-3"/></svg>;
const DotsIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>;
const CrownIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg>;
const GearIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
const CardIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>;
const SunIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>;
const SignOutIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>;

function Tooltip({ label }: { label: string }) {
  return (
    <div className="absolute left-full ml-3 z-[100] px-2.5 py-1.5 bg-[#1e1e1e] text-white text-xs font-medium rounded-lg border border-white/10 shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity duration-150">
      {label}
    </div>
  );
}

interface NavItemProps { label: string; icon: React.ReactNode; isActive: boolean; onClick: () => void }

function NavRow({ label, icon, isActive, onClick }: NavItemProps) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-[11px] rounded-lg text-left transition-all duration-150
        ${isActive ? 'bg-[#252525] text-white' : 'text-[#9ca3af] hover:bg-[#1c1c1c] hover:text-white'}`}>
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 text-[15px] font-medium leading-none">{label}</span>
    </button>
  );
}

function SubRow({ label, icon, badge, badgeCls, onClick }: { label: string; icon: React.ReactNode; badge?: string; badgeCls?: string; onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="flex items-center gap-3 pl-[42px] pr-3 py-[9px] text-[#9ca3af] hover:text-white hover:bg-[#1c1c1c] rounded-lg cursor-pointer transition-all duration-150"
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 text-[14px] font-medium">{label}</span>
      {badge && <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${badgeCls}`}>{badge}</span>}
    </div>
  );
}

function ColIconBtn({ label, icon, isActive, onClick }: NavItemProps) {
  return (
    <button onClick={onClick} title={label}
      className={`group relative w-full flex items-center justify-center p-2.5 rounded-lg transition-all duration-150
        ${isActive ? 'bg-[#252525] text-white' : 'text-[#9ca3af] hover:bg-[#1c1c1c] hover:text-white'}`}>
      {icon}
      <Tooltip label={label} />
    </button>
  );
}

// ---- Profile Dropdown ----
function ProfileDropdown({ user, initials, onClose }: { user: AuthUser; initials: string; onClose: () => void }) {
  const router = useRouter();

  const handleLogout = () => {
    logout();
    onClose();
    router.push("/login");
  };

  const menuItem = (icon: React.ReactNode, label: string, onClick: () => void, className = "") => (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-[#d1d5db] hover:bg-[#1c1c1c] hover:text-white transition-all duration-150 ${className}`}>
      <span className="text-[#9ca3af] shrink-0">{icon}</span>
      {label}
    </button>
  );

  return (
    <div className="absolute bottom-full left-0 mb-2 w-[260px] bg-[#161616] border border-[#242424] rounded-2xl shadow-2xl overflow-hidden z-[200]">
      {/* User header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#242424]">
        {user.picture ? (
          <Image src={user.picture} alt={initials} width={36} height={36} className="rounded-xl shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00E3AA] to-[#00b589] flex items-center justify-center text-black font-bold text-[13px] shrink-0">
            {initials}
          </div>
        )}
        <div className="flex flex-col min-w-0">
          <span className="text-white text-[13px] font-semibold truncate">{user.email}</span>
          <span className="text-[#6b7280] text-[11px]">Free Plan</span>
        </div>
      </div>

      {/* Menu items */}
      <div className="py-1">
        {menuItem(<CrownIcon />, "Upgrade to Pro", () => onClose(), "text-yellow-400")}
        <div className="border-t border-[#1f1f1f] my-1" />
        {menuItem(<GearIcon />, "Settings", () => onClose())}
        {menuItem(<CardIcon />, "Subscriptions", () => onClose())}
        <div className="border-t border-[#1f1f1f] my-1" />
        {/* Light mode — dummy (coming soon) */}
        {menuItem(<SunIcon />, "Light Mode", () => onClose(), "opacity-40 cursor-not-allowed")}
        {menuItem(<SignOutIcon />, "Sign Out", handleLogout, "text-red-400")}
      </div>
    </div>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────
export function Sidebar({
  activeSession, setActiveSession, isMobileMenuOpen, setIsMobileMenuOpen,
}: {
  activeSession: string;
  setActiveSession: (s: string) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (o: boolean) => void;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [monitorOpen, setMonitorOpen] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setUser(getUser()); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = getInitials(user);
  const handleNav = (session: string) => { setActiveSession(session); setIsMobileMenuOpen(false); };

  const UserAvatar = ({ size = "w-9 h-9" }: { size?: string }) => (
    user?.picture
      ? <Image src={user.picture} alt={initials} width={36} height={36} className={`${size} rounded-xl object-cover shrink-0`} />
      : <div className={`${size} rounded-xl bg-gradient-to-br from-[#00E3AA] to-[#00b589] flex items-center justify-center text-black font-bold text-[13px] shrink-0`}>{initials}</div>
  );

  // ---- Expanded Layout ----
  const expanded = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1c2e28] flex items-center justify-center shrink-0 overflow-hidden">
            <Image src="/openclaw.png" alt="ClawdFace" width={30} height={30} className="object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="text-white font-bold text-[17px] leading-tight tracking-[-0.01em]">ClawdFace</span>
            <span className="text-[#00E3AA] text-[12px] font-semibold leading-tight">Beta</span>
          </div>
        </div>
        <button onClick={() => setIsCollapsed(true)} className="text-[#5a5a5a] hover:text-[#9ca3af] transition-colors p-1.5 rounded-md hover:bg-white/5">
          <CollapseIcon />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-2 flex flex-col gap-0.5 custom-scrollbar">
        <NavRow label="Bot Library" icon={<LibraryIcon />} isActive={activeSession === "Library" || activeSession === "DirectCall"} onClick={() => handleNav("Library")} />
        <NavRow label="Stock Avatars" icon={<UserIcon />}     isActive={activeSession === "Avatars"}   onClick={() => handleNav("Avatars")} />

        {/* Monitor */}
        <button onClick={() => setMonitorOpen(!monitorOpen)}
          className="w-full flex items-center gap-3 px-3 py-[11px] rounded-lg text-left text-[#9ca3af] hover:bg-[#1c1c1c] hover:text-white transition-all duration-150">
          <span className="shrink-0"><MonitorIcon /></span>
          <span className="flex-1 text-[15px] font-medium leading-none">Monitor</span>
          <span className={`transition-transform duration-200 ${monitorOpen ? '' : '-rotate-90'}`}><ChevronDown /></span>
        </button>
        {monitorOpen && <div className="flex flex-col gap-0.5">
          <SubRow label="Conversations" icon={<HistoryIcon />} onClick={() => handleNav("Conversations")} />
        </div>}
      </nav>

      {/* Footer / Configuration */}
      <div className="px-3 pb-4 flex flex-col gap-0.5 shrink-0">
        <div className="border-t border-[#232323] mb-2 mx-1" />
        
        <div className="mb-2">
            <span className="px-3 text-[10px] font-bold text-[#5a5a5a] uppercase tracking-widest mb-1.5 block">Configuration</span>
            <NavRow 
              label="Quick Call" 
              icon={<BotIcon />} 
              isActive={activeSession === "My Bot"} 
              onClick={() => handleNav("My Bot")} 
            />
        </div>

        <div className="border-t border-[#232323] mb-2 mx-1" />

        {/* Profile + dropdown */}
        <div ref={dropdownRef} className="relative">
          {dropdownOpen && user && (
            <ProfileDropdown user={user} initials={initials} onClose={() => setDropdownOpen(false)} />
          )}
          <div className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-[#1c1c1c] cursor-pointer transition-all duration-150">
            <UserAvatar />
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-white text-[14px] font-semibold leading-tight truncate">
                {user?.email || "Loading..."}
              </span>
              <span className="text-[#5a5a5a] text-[12px] leading-tight font-medium">Free Plan</span>
            </div>
            <button onClick={() => setDropdownOpen(!dropdownOpen)}
              className="text-[#5a5a5a] hover:text-[#9ca3af] transition-colors p-1 shrink-0">
              <DotsIcon />
            </button>
          </div>
        </div>
      </div>
    </>
  );

  // ---- Collapsed Layout ----
  const collapsed = (
    <>
      <div className="flex flex-col items-center pt-4 pb-2 shrink-0 gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#1c2e28] flex items-center justify-center overflow-hidden">
          <Image src="/openclaw.png" alt="ClawdFace" width={26} height={26} className="object-contain" />
        </div>
        <button onClick={() => setIsCollapsed(false)} className="text-[#5a5a5a] hover:text-[#9ca3af] transition-colors p-1.5 rounded-md hover:bg-white/5">
          <ExpandIcon />
        </button>
      </div>
      <div className="border-t border-[#232323] mx-2 mb-2" />
      <nav className="flex-1 overflow-y-auto flex flex-col items-center gap-1 px-2 custom-scrollbar">
        <ColIconBtn label="Bot Library" icon={<LibraryIcon />} isActive={activeSession === "Library" || activeSession === "DirectCall"} onClick={() => handleNav("Library")} />
        <ColIconBtn label="Stock Avatars" icon={<UserIcon />}     isActive={activeSession === "Avatars"}   onClick={() => handleNav("Avatars")} />
        <ColIconBtn label="Conversations" icon={<HistoryIcon />} isActive={activeSession === "Conversations"} onClick={() => handleNav("Conversations")} />
      </nav>
      <div className="flex flex-col items-center px-2 pb-4 shrink-0 gap-2">
        <div className="border-t border-[#232323] w-full mb-1" />
        <ColIconBtn label="Quick Call" icon={<BotIcon />} isActive={activeSession === "My Bot"} onClick={() => handleNav("My Bot")} />
        <div className="border-t border-[#232323] w-full mb-1" />
        <div ref={dropdownRef} className="relative group">
          {dropdownOpen && user && (
            <ProfileDropdown user={user} initials={initials} onClose={() => setDropdownOpen(false)} />
          )}
          <button onClick={() => setDropdownOpen(!dropdownOpen)} className="relative">
            <UserAvatar />
            <Tooltip label={user?.email || "Profile"} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />
      <div className={`
        h-screen bg-[#111111] border-r border-[#1f1f1f] flex flex-col shrink-0 z-50 overflow-hidden
        fixed md:relative inset-y-0 left-0
        transition-[width,transform] duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${isCollapsed ? 'w-[68px]' : 'w-[268px]'}
      `}>
        {isCollapsed ? collapsed : expanded}
      </div>
    </>
  );
}
