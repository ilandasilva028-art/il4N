"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { BarChart3, Clapperboard, Cog, Factory, Film, LayoutDashboard, Menu, PackageCheck, Radio, Search, X, KeyRound } from "lucide-react";
import { Button, Card, Input, cn } from "./ui";
import { setToken, useApi, useLive } from "@/lib/api";

const NAV = [
  { href: "/", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/twitch", label: "Surveillance Twitch", icon: Radio },
  { href: "/youtube", label: "Recherche YouTube", icon: Search },
  { href: "/clips", label: "Clips détectés", icon: Film },
  { href: "/studio", label: "Studio de montage", icon: Clapperboard },
  { href: "/production", label: "Production", icon: Factory },
  { href: "/ready", label: "Vidéos prêtes", icon: PackageCheck },
  { href: "/stats", label: "Statistiques", icon: BarChart3 },
  { href: "/settings", label: "Paramètres", icon: Cog },
];

function EngineDot() {
  const { live, connected: sse } = useLive();
  const health = useApi<{ engine: boolean }>(sse ? null : "/health", 5000);   // repli si le flux SSE est coupé
  const connected = sse || (!!health.data && !health.error);
  const on = connected && (sse ? live?.engine : health.data?.engine);
  const rendering = live?.jobs.filter((j) => j.state === "RENDERING").length ?? 0;
  return (
    <div className="rounded-xl bg-bg/60 border border-line p-3 text-xs">
      <div className="flex items-center gap-2">
        <span className={cn("size-2 rounded-full", !connected ? "bg-mute" : on ? "bg-ok shadow-[0_0_8px] shadow-ok" : "bg-bad")} />
        <span className="font-medium">{!connected ? "API non connectée" : on ? "Moteur actif" : "Moteur arrêté"}</span>
      </div>
      {connected && <p className="text-mute mt-1">{!sse ? "Mise à jour toutes les 5 s" : rendering ? `${rendering} montage(s) en cours` : "Aucun montage en cours"}</p>}
    </div>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [t, setT] = useState("");
  return (
    <div className="fixed inset-0 z-50 bg-bg/90 backdrop-blur grid place-items-center p-4">
      <Card className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-2 font-semibold"><KeyRound className="size-4 text-brand2" />Accès protégé</div>
        <p className="text-sm text-mute mb-4">Ce tableau de bord exige le jeton défini par <code>DASHBOARD_TOKEN</code> sur le serveur.</p>
        <form onSubmit={(e) => { e.preventDefault(); setToken(t); onDone(); location.reload(); }} className="space-y-3">
          <Input type="password" placeholder="Jeton d'accès" value={t} onChange={(e) => setT(e.target.value)} autoFocus />
          <Button className="w-full" type="submit">Se connecter</Button>
        </form>
      </Card>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [needAuth, setNeedAuth] = useState(false);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {                                    // lien du QR code : /?token=… → connexion automatique
    const t = new URLSearchParams(location.search).get("token");
    if (t) { setToken(t); history.replaceState(null, "", location.pathname); }
  }, []);
  useEffect(() => {
    const h = () => setNeedAuth(true);
    window.addEventListener("cf-auth", h);
    return () => window.removeEventListener("cf-auth", h);
  }, []);
  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: I }) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link key={href} href={href}
            className={cn("flex items-center gap-3 rounded-lg px-3 h-10 text-sm transition-colors",
              active ? "bg-brand/15 text-ink border border-brand/30" : "text-mute hover:text-ink hover:bg-white/5 border border-transparent")}>
            <I className={cn("size-4", active && "text-brand2")} />{label}
          </Link>
        );
      })}
    </nav>
  );
  const brand = (
    <div className="flex items-center gap-2.5 px-1">
      <div className="size-8 rounded-lg bg-gradient-to-br from-brand to-fuchsia-500 grid place-items-center font-bold text-sm">CF</div>
      <div><div className="font-semibold leading-tight">Clip Factory</div><div className="text-[11px] text-mute">Studio</div></div>
    </div>
  );
  return (
    <div className="min-h-dvh">
      {needAuth && <Login onDone={() => setNeedAuth(false)} />}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col gap-6 border-r border-line/70 bg-card/40 p-4">
        {brand}{nav}<div className="mt-auto"><EngineDot /></div>
      </aside>
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b border-line/70 bg-bg/85 backdrop-blur px-4 h-14">
        {brand}
        <Button variant="ghost" aria-label="Ouvrir le menu" onClick={() => setOpen(true)}><Menu className="size-5" /></Button>
      </header>
      {open && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute right-0 inset-y-0 w-72 max-w-[85%] bg-card border-l border-line p-4 flex flex-col gap-6 fade-in">
            <div className="flex justify-between items-center">{brand}
              <Button variant="ghost" aria-label="Fermer le menu" onClick={() => setOpen(false)}><X className="size-5" /></Button></div>
            {nav}<div className="mt-auto"><EngineDot /></div>
          </div>
        </div>
      )}
      <main className="lg:pl-64"><div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">{children}</div></main>
    </div>
  );
}
