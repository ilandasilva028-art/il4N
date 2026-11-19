"use client";
import { useEffect, useState } from "react";
import { HardDrive, KeyRound, Save, SlidersHorizontal, Trash2, Type } from "lucide-react";
import { api, fmtBytes, useApi } from "@/lib/api";
import { Badge, Button, Card, CardTitle, ErrorBox, Input, Label, PageHeader, Skeleton } from "@/components/ui";

type S = {
  detection: Record<string, number | boolean>; scoring: { priority: number; review: number; weights: Record<string, number> };
  cut: { min: number; max: number; target: number }; render: { fps: number; crf: number; preset: string; max_parallel: number };
  subtitles: { whisper_model?: string; font_size?: number; color?: string; highlight?: string; position_y?: number };
  output_dir: string; api_keys_present: Record<string, boolean>; dashboard_auth: boolean;
  disk: { total: number; free: number; buffer: number; candidates: number; ready: number };
};

const Num = ({ label, value, onChange, min, max, step = 1 }: { label: string; value: number; onChange: (n: number) => void; min: number; max: number; step?: number }) => (
  <div><Label>{label}</Label><Input type="number" value={value} min={min} max={max} step={step} onChange={(e) => onChange(Number(e.target.value))} /></div>
);

export default function SettingsPage() {
  const { data, error, loading, reload } = useApi<S>("/settings");
  const [s, setS] = useState<S | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setS(structuredClone(data)); }, [data]);
  if (loading && !s) return <Skeleton className="h-96" />;
  if (!s) return <ErrorBox error={error} />;
  const set = (sec: "detection" | "cut" | "render" | "subtitles" | "scoring", k: string, v: unknown) => setS({ ...s, [sec]: { ...s[sec], [k]: v } });
  const save = async () => {
    setBusy(true); setErr(null); setOk(null);
    try {
      await api("/settings", { method: "PUT", body: JSON.stringify({ detection: s.detection, scoring: { priority: s.scoring.priority, review: s.scoring.review },
        cut: s.cut, render: { crf: s.render.crf, max_parallel: s.render.max_parallel, fps: s.render.fps }, subtitles: s.subtitles }) });
      setOk("Paramètres enregistrés : ils s'appliquent au prochain traitement."); reload();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const d = s.detection as Record<string, number>;
  return (
    <>
      <PageHeader title="Paramètres" subtitle="Écrits dans config.yaml (lu par le moteur). Les secrets ne sont jamais affichés."
        right={<Button onClick={save} loading={busy}><Save className="size-4" />Enregistrer</Button>} />
      <div className="space-y-3 mb-4"><ErrorBox error={err} />{ok && <p className="text-sm text-ok">{ok}</p>}</div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardTitle icon={<SlidersHorizontal className="size-4 text-brand2" />}>Détection et sélection</CardTitle>
          <div className="grid grid-cols-2 gap-3">
            <Num label="Messages minimum (10 s)" value={d.min_messages} min={1} max={100} onChange={(v) => set("detection", "min_messages", v)} />
            <Num label="Multiplicateur vs habituel" value={d.ratio} min={1} max={20} step={0.5} onChange={(v) => set("detection", "ratio", v)} />
            <Num label="Délai entre deux moments (s)" value={d.cooldown_seconds} min={10} max={3600} onChange={(v) => set("detection", "cooldown_seconds", v)} />
            <Num label="Retard du chat (s)" value={d.chat_lag_seconds} min={0} max={30} onChange={(v) => set("detection", "chat_lag_seconds", v)} />
            <Num label="Seuil « prioritaire »" value={s.scoring.priority} min={0} max={100} onChange={(v) => set("scoring", "priority", v)} />
            <Num label="Seuil « à examiner »" value={s.scoring.review} min={0} max={100} onChange={(v) => set("scoring", "review", v)} />
          </div>
          <p className="text-[11px] text-mute mt-3">Sous le seuil « à examiner », un clip est rejeté (conservé en base). La sensibilité par chaîne se règle dans Surveillance Twitch.</p>
        </Card>
        <Card>
          <CardTitle icon={<Type className="size-4 text-brand2" />}>Durée, rendu et sous-titres</CardTitle>
          <div className="grid grid-cols-3 gap-3">
            <Num label="Durée min (s)" value={s.cut.min} min={5} max={60} onChange={(v) => set("cut", "min", v)} />
            <Num label="Cible (s)" value={s.cut.target} min={5} max={90} onChange={(v) => set("cut", "target", v)} />
            <Num label="Durée max (s)" value={s.cut.max} min={10} max={120} onChange={(v) => set("cut", "max", v)} />
            <Num label="Qualité CRF (bas = mieux)" value={s.render.crf} min={14} max={35} onChange={(v) => set("render", "crf", v)} />
            <Num label="Images/s" value={s.render.fps} min={24} max={60} onChange={(v) => set("render", "fps", v)} />
            <Num label="Rendus simultanés" value={s.render.max_parallel} min={1} max={2} onChange={(v) => set("render", "max_parallel", v)} />
            <Num label="Taille sous-titres" value={s.subtitles.font_size ?? 72} min={36} max={120} onChange={(v) => set("subtitles", "font_size", v)} />
            <Num label="Position verticale (px)" value={s.subtitles.position_y ?? 1330} min={200} max={1800} onChange={(v) => set("subtitles", "position_y", v)} />
            <div className="flex gap-3 items-end">
              <label className="text-xs text-mute flex flex-col gap-1">Couleur<input type="color" value={s.subtitles.color ?? "#FFFFFF"} onChange={(e) => set("subtitles", "color", e.target.value)} /></label>
              <label className="text-xs text-mute flex flex-col gap-1">Mot actif<input type="color" value={s.subtitles.highlight ?? "#FFE500"} onChange={(e) => set("subtitles", "highlight", e.target.value)} /></label>
            </div>
          </div>
          <p className="text-[11px] text-mute mt-3">Sortie : 1080×1920, H.264 + AAC. Police : DejaVu Sans (installée sur le serveur). Rendus simultanés : 1 est recommandé sur 4 CPU (actuellement le moteur rend un clip à la fois).</p>
        </Card>
        <Card>
          <CardTitle icon={<HardDrive className="size-4 text-brand2" />}>Stockage</CardTitle>
          <p className="text-sm">Dossier de sortie : <code className="text-xs">{s.output_dir}</code></p>
          <div className="mt-3 space-y-1.5 text-sm">
            <p>Disque libre : <b>{fmtBytes(s.disk.free)}</b> / {fmtBytes(s.disk.total)}</p>
            <p className="text-mute">Tampon vidéo des lives : {fmtBytes(s.disk.buffer)} (rotation automatique)</p>
            <p className="text-mute">Fenêtres candidates et aperçus : {fmtBytes(s.disk.candidates)}</p>
            <p className="text-mute">Vidéos terminées : {fmtBytes(s.disk.ready)} (jamais supprimées automatiquement)</p>
          </div>
          <Button variant="outline" className="mt-3" onClick={async () => { const r = await api<{ deleted: number }>("/maintenance/clean-previews", { method: "POST" }); setOk(`${r.deleted} aperçu(s) supprimé(s)`); reload(); }}>
            <Trash2 className="size-4" />Supprimer les aperçus générés</Button>
        </Card>
        <Card>
          <CardTitle icon={<KeyRound className="size-4 text-brand2" />}>API et authentification</CardTitle>
          <ul className="space-y-2 text-sm">
            {[["twitch_client_id", "Twitch Client ID (avatars, clips existants)"], ["twitch_client_secret", "Twitch Client Secret"], ["youtube_api_key", "Clé API YouTube Data v3"]].map(([k, l]) => (
              <li key={k} className="flex justify-between gap-2"><span>{l}</span>{s.api_keys_present[k] ? <Badge tone="ok">Configurée</Badge> : <Badge>Absente</Badge>}</li>))}
            <li className="flex justify-between gap-2"><span>Jeton du tableau de bord</span>{s.dashboard_auth ? <Badge tone="ok">Activé</Badge> : <Badge tone="warn">Désactivé (accès local)</Badge>}</li>
          </ul>
          <p className="text-[11px] text-mute mt-3">Les clés se définissent dans l'environnement du serveur (voir .env.example), jamais dans le navigateur.</p>
        </Card>
      </div>
    </>
  );
}
