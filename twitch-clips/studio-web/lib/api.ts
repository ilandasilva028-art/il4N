"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// Lien du QR code (/?token=…) : enregistré AVANT le premier rendu, puis retiré de l'adresse.
if (typeof window !== "undefined") {
  const t = new URLSearchParams(window.location.search).get("token");
  if (t) {
    try { localStorage.setItem("cf_token", t); } catch {}
    window.history.replaceState(null, "", window.location.pathname);
  }
}

/** Jeton du tableau de bord (accès distant). Stocké localement, envoyé à l'API uniquement. */
export function getToken() {
  try { return localStorage.getItem("cf_token") || ""; } catch { return ""; }
}
export function setToken(t: string) {
  try { localStorage.setItem("cf_token", t); } catch {}
}

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  const t = getToken();
  if (t) headers["Authorization"] = `Bearer ${t}`;
  if (init.body && !(init.body instanceof FormData)) headers["Content-Type"] = "application/json";
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { ...init, headers, cache: "no-store" });
  } catch {
    throw new ApiError(0, "Backend injoignable : le serveur FastAPI ne répond pas");
  }
  if (!res.ok) {
    let msg = res.status >= 500 && !(res.headers.get("content-type") || "").includes("json")
      ? "Backend injoignable : le serveur FastAPI ne répond pas (moteur ou API arrêtés)" : `Erreur ${res.status}`;
    try {
      const j = await res.json();
      msg = typeof j.detail === "string" ? j.detail
        : Array.isArray(j.detail) ? j.detail.map((d: { msg: string }) => d.msg).join(" · ") : msg;
    } catch {}
    if (res.status === 401 && typeof window !== "undefined") window.dispatchEvent(new Event("cf-auth"));
    throw new ApiError(res.status, msg);
  }
  const ct = res.headers.get("content-type") || "";
  return (ct.includes("json") ? res.json() : res.text()) as Promise<T>;
}

export const media = (path: string) => {
  const t = getToken();
  return `/api${path}${t ? (path.includes("?") ? "&" : "?") + "token=" + encodeURIComponent(t) : ""}`;
};

/** Lecture d'une ressource avec rafraîchissement périodique. */
export function useApi<T>(path: string | null, every = 0) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const alive = useRef(true);
  const load = useCallback(async () => {
    if (!path) return;
    try {
      const d = await api<T>(path);
      if (alive.current) { setData(d); setError(null); }
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    alive.current = true;
    setLoading(true);
    load();
    const id = every ? setInterval(load, every) : undefined;
    return () => { alive.current = false; if (id) clearInterval(id); };
  }, [load, every]);
  return { data, error, loading, reload: load };
}

/** Flux temps réel (SSE) : compteurs et avancement des tâches. */
export type Live = { counts: Record<string, number>; engine: boolean; jobs: { id: number; state: string; stage: string; progress: number | null }[]; ts: number };
export function useLive() {
  const [live, setLive] = useState<Live | null>(null);
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    const es = new EventSource(media("/stream"));
    es.onmessage = (e) => { setLive(JSON.parse(e.data)); setConnected(true); };
    es.onerror = () => setConnected(false);
    return () => es.close();
  }, []);
  return { live, connected };
}

export const fmtDate = (ts?: number | null) =>
  ts ? new Date(ts * 1000).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";
export const fmtDur = (s?: number | null) =>
  s == null ? "—" : s < 60 ? `${Math.round(s)} s` : `${Math.floor(s / 60)} min ${Math.round(s % 60)} s`;
export const fmtBytes = (b: number) =>
  b > 1e9 ? `${(b / 1e9).toFixed(1)} Go` : b > 1e6 ? `${(b / 1e6).toFixed(0)} Mo` : `${(b / 1e3).toFixed(0)} Ko`;

export type Clip = {
  id: number; platform: string; creator: string; url: string; rights: string; state: string; stage: string;
  score: number | null; detected_at: number; created: number; duration: number | null; kind: string | null;
  chat_count: number | null; chat_baseline: number | null; category: string | null; hook: string | null;
  title: string | null; approved: number | null; error: string | null; progress: number | null; phase: string | null;
  has_video: boolean; has_final: boolean; transcript: string; elapsed?: number | null; waiting_source?: boolean;
};
