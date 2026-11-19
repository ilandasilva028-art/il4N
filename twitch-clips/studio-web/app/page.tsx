"use client";
import Link from "next/link";
import { Activity, AlertTriangle, CheckCircle2, Clapperboard, Cpu, Film, Hourglass, Play, Radio, Square, Users } from "lucide-react";
import { api, fmtDate, media, useApi, type Clip } from "@/lib/api";
import { Badge, Button, Card, CardTitle, Empty, ErrorBox, PageHeader, ScorePill, Skeleton, Stat, StateBadge } from "@/components/ui";
import { Bars } from "@/components/charts";
import { useState } from "react";

type Overview = {
  channels: number; enabled: number; live: string[]; detected_today: number; to_analyze: number; rendering: number;
  ready: number; errors: number; engine: { running: boolean; supervisor_age: number | null; processor_ok: boolean };
  series: { day: string; detected: number; produced: number }[]; ready_clips: Clip[]; recent: Clip[];
  activity: { ts: number; level: string; component: string; message: string }[];
};

export default function Home() {
  const { data, error, loading, reload } = useApi<Overview>("/overview", 5000);
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    setBusy(true);
    try { await api(`/engine/${data?.engine.running ? "stop" : "start"}`, { method: "POST" }); } finally { setTimeout(() => { reload(); setBusy(false); }, 4000); }
  };
  return (
    <>
      <PageHeader title="Vue d'ensemble" subtitle="État réel de la production, mis à jour toutes les 5 secondes."
        right={data && (
          <Button variant={data.engine.running ? "outline" : "primary"} onClick={toggle} loading={busy}>
            {data.engine.running ? <><Square className="size-4" />Arrêter le moteur</> : <><Play className="size-4" />Démarrer le moteur</>}
          </Button>)} />
      <ErrorBox error={error} />
      {loading && !data ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Streamers surveillés" value={`${data.enabled}/${data.channels}`} icon={<Users className="size-4" />} hint="actifs / configurés" />
            <Stat label="En direct" value={data.live.length} icon={<Radio className="size-4" />} tone="ok" hint={data.live.join(", ") || "aucun"} />
            <Stat label="Moments détectés aujourd'hui" value={data.detected_today} icon={<Activity className="size-4" />} />
            <Stat label="En attente d'analyse" value={data.to_analyze} icon={<Hourglass className="size-4" />} tone="warn" />
            <Stat label="Montages en cours / en file" value={data.rendering} icon={<Clapperboard className="size-4" />} tone="warn" />
            <Stat label="Vidéos prêtes" value={data.ready} icon={<CheckCircle2 className="size-4" />} tone="ok" />
            <Stat label="Erreurs (aujourd'hui)" value={data.errors} icon={<AlertTriangle className="size-4" />} tone={data.errors ? "bad" : "ok"} />
            <Stat label="Moteur Python" value={data.engine.running ? "Actif" : "Arrêté"} icon={<Cpu className="size-4" />}
              tone={data.engine.running ? "ok" : "bad"} hint={data.engine.running ? `traitement ${data.engine.processor_ok ? "OK" : "sans signal"}` : "cliquez sur Démarrer"} />
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardTitle icon={<Activity className="size-4 text-brand2" />}>Clips détectés et produits (14 jours)</CardTitle>
              <Bars data={data.series} x="day" series={[{ key: "detected", label: "Détectés", color: "#7548E8" }, { key: "produced", label: "Produits", color: "#22C55E" }]} />
            </Card>
            <Card>
              <CardTitle icon={<Activity className="size-4 text-brand2" />}>Activité récente</CardTitle>
              {data.activity.length === 0 && data.recent.length === 0 ? <Empty title="Aucune activité pour l'instant" /> : (
                <ul className="space-y-2.5 max-h-72 overflow-auto pr-1">
                  {data.activity.map((a, i) => (
                    <li key={`e${i}`} className="flex gap-2 text-sm">
                      <span className={`mt-1.5 size-1.5 rounded-full shrink-0 ${a.level === "error" ? "bg-bad" : a.level === "warning" ? "bg-warn" : "bg-brand"}`} />
                      <div className="min-w-0"><p className="truncate">{a.message}</p><p className="text-[11px] text-mute">{fmtDate(a.ts)} · {a.component}</p></div>
                    </li>
                  ))}
                  {data.recent.map((c) => (
                    <li key={`c${c.id}`} className="flex gap-2 text-sm">
                      <span className="mt-1.5 size-1.5 rounded-full shrink-0 bg-warn" />
                      <div className="min-w-0"><p className="truncate">{c.creator} · moment « {c.kind ?? "?"} » ({c.chat_count ?? "?"} msgs)</p>
                        <p className="text-[11px] text-mute">{fmtDate(c.detected_at)} · {c.stage}</p></div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card>
            <CardTitle icon={<Film className="size-4 text-brand2" />} right={<Link href="/ready" className="text-xs text-brand2 hover:underline">Tout voir</Link>}>Dernières vidéos terminées</CardTitle>
            {data.ready_clips.length === 0 ? (
              <Empty title="Aucune vidéo terminée">Les sources sont en mode « repérage » (droits non établis) : aucune vidéo n'est téléchargée ni montée. Importez une vidéo autorisée ou passez une chaîne en « autorisée » dans Surveillance Twitch.</Empty>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {data.ready_clips.map((c) => (
                  <Link key={c.id} href={`/clips/${c.id}`} className="group rounded-xl overflow-hidden border border-line bg-bg">
                    <div className="aspect-[9/16] bg-card2 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={media(`/clips/${c.id}/thumb`)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition" />
                    </div>
                    <div className="p-2 flex justify-between items-center gap-1"><span className="text-xs truncate">{c.creator}</span><ScorePill score={c.score} /></div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
          <div className="flex flex-wrap gap-2 text-[11px] text-mute">
            <StateBadge state="DISCOVERED" label="Repéré = moment noté sans téléchargement" />
            <Badge tone="brand">Aucune publication automatique</Badge>
          </div>
        </div>
      )}
    </>
  );
}
