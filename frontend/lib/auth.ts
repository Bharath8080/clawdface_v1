"use client";

// This file now only contains client-side logic and state management.
// Database operations have been moved to database-actions.ts.

const AUTH_KEY = "clawdface_auth";
export const THEME_KEY = "clawdface_theme";

export interface AuthUser {
  email: string;
  name?: string;
  picture?: string;
  createdAt: string;
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveUserToLocalStorage(user: AuthUser) {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

export function logout() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_KEY);
}

export function isAuthenticated(): boolean {
  return getUser() !== null;
}

export function getInitials(user: AuthUser | null): string {
  if (!user) return "?";
  if (user.name) {
    const parts = user.name.trim().split(" ");
    return parts.slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  }
  return user.email.slice(0, 2).toUpperCase();
}

export function getTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  return (localStorage.getItem(THEME_KEY) as "dark" | "light") || "dark";
}

export function setTheme(theme: "dark" | "light") {
  if (typeof window === "undefined") return;
  localStorage.setItem(THEME_KEY, theme);
  if (theme === "light") {
    document.documentElement.classList.add("light");
  } else {
    document.documentElement.classList.remove("light");
  }
  // Notify all components about the theme change
  window.dispatchEvent(new CustomEvent("clawdface-theme-change", { detail: theme }));
}
