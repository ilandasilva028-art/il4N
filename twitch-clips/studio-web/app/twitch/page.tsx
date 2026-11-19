"use client";
import { useState } from "react";
import { ExternalLink, HeartPulse, Pause, Play, Plus, RefreshCw, Trash2, Radio } from "lucide-react";
import { api, fmtDate, useApi, type Clip } from "@/lib/api";
import { Badge, Button, Card, Empty, ErrorBox, Input, PageHeader, RIGHTS_FR, Select, Skeleton, StateBadge } from "@/components/ui";

type Channel = {
  name: string; rights: string; enabled: boolean; sensitivity: string; layout: string; cam_box: number[] | null;
  worker: string; heartbeat_age: number | null; live: boolean | null; category: string | null; title: string | null;
  recording: boolean | null; clips: number; last_event: number | null; avatar: string | null; url: string;
};

function ChannelCard({ ch, onChange }: { ch: Channel; onChange: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [check, setCheck] = useState<{ live: boolean; category: string | null; title: string | null } | null>(null);
  const [open, setOpen] = useState(false);
  const ev = useApi<Clip[]>(open ? `/channels/${ch.name}/events?limit=20` : null);
  const act = async (k: string, fn: () => Promise<unknown>) => {
    setBusy(k); setErr(null);
    try { await fn(); onChange(); } catch (e) { setErr((e as Error).message); } finally { setBusy(null); }
  };
  const patch = (b: object) => act("patch", () => api(`/channels/${ch.name}`, { method: "PATCH", body: JSON.stringify(b) }));
  const live = check?.live ?? ch.live;
  return (
    <Card className="flex flex-col gap-4 min-w-0">
      <div className="flex items-start gap-3">
        <div className="size-12 rounded-full bg-gradient-to-br from-brand to-fuchsia-500 grid place-items-center text-lg font-semibold shrink-0 uppercase" title="Avatar : nécessite l'API Twitch (TWITCH_CLIENT_ID)">
          {ch.name.slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <a href={ch.url} target="_blank" rel="noreferrer" className="font-semibold hover:text-brand2 flex items-center gap-1">{ch.name}<ExternalLink className="size-3" /></a>
            {live == null ? <Badge>État inconnu</Badge> : live ? <Badge tone="bad"><span className="size-1.5 rounded-full bg-bad animate-pulse" />En direct</Badge> : <Badge>Hors ligne</Badge>}
          </div>
          <p className="text-sm text-mute truncate mt-0.5">{(check?.title ?? ch.title) || (live ? "Titre indisponible" : "—")}</p>
          {(check?.category ?? ch.category) && <p className="text-xs text-mute">{check?.category ?? ch.category}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-bg/60 p-2.5 min-w-0"><p className="text-mute">Processus</p>
          <p className={`flex items-center gap-1.5 mt-0.5 font-medium ${ch.worker === "actif" ? "text-ok" : ch.worker === "arrêté" ? "text-mute" : "text-warn"}`}>
            <HeartPulse className="size-3.5" />{ch.worker}{ch.heartbeat_age != null && <span className="text-mute font-normal">· {ch.heartbeat_age}s</span>}</p></div>
        <div className="rounded-lg bg-bg/60 p-2.5 min-w-0"><p className="text-mute">Moments détectés</p><p className="mt-0.5 font-medium truncate">{ch.clips} · dernier {fmtDate(ch.last_event)}</p></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="text-xs text-mute space-y-1">Droits de réutilisation
          <Select className="w-full" value={ch.rights} onChange={(e) => patch({ rights: e.target.value })}>
            {Object.entries(RIGHTS_FR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select></label>
        <label className="text-xs text-mute space-y-1">Sensibilité de détection
          <Select className="w-full" value={ch.sensitivity} onChange={(e) => patch({ sensitivity: e.target.value })}>
            <option value="basse">Basse (moins de clips)</option><option value="normale">Normale</option><option value="haute">Haute (plus de clips)</option>
          </Select></label>
      </div>
      {ch.rights === "discovered" && <p className="text-[11px] text-warn">Mode repérage : le chat est analysé mais aucune vidéo n'est téléchargée. Passez en « autorisé » seulement si le créateur vous a donné son accord.</p>}
      <ErrorBox error={err} />
      <div className="flex flex-wrap gap-2">
        <Button variant={ch.enabled ? "outline" : "primary"} loading={busy === "patch"} onClick={() => patch({ enabled: !ch.enabled })}>
          {ch.enabled ? <><Pause className="size-4" />Arrêter la surveillance</> : <><Play className="size-4" />Lancer la surveillance</>}</Button>
        <Button variant="ghost" loading={busy === "check"} onClick={() => act("check", async () => setCheck(await api(`/channels/${ch.name}/refresh`, { method: "POST" })))}>
          <RefreshCw className="size-4" />Vérifier maintenant</Button>
        <Button variant="ghost" onClick={() => setOpen(!open)}>Historique</Button>
        <Button variant="danger" className="ml-auto" loading={busy === "del"} onClick={() => confirm(`Ne plus suivre ${ch.name} ?`) && act("del", () => api(`/channels/${ch.name}`, { method: "DELETE" }))}>
          <Trash2 className="size-4" /></Button>
      </div>
      {open && (
        <div className="border-t border-line pt-3 space-y-2 max-h-64 overflow-auto">
          {ev.loading ? <Skeleton className="h-16" /> : !ev.data?.length ? <p className="text-sm text-mute">Aucun événement enregistré.</p> :
            ev.data.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{fmtDate(c.detected_at)} · {c.kind ?? "?"} · {c.chat_count ?? "?"} msgs (habituel ~{c.chat_baseline ?? "?"})</span>
                <StateBadge state={c.state} label={c.stage} />
              </div>))}
        </div>
      )}
    </Card>
  );
}

export default function Twitch() {
  const { data, error, loading, reload } = useApi<Channel[]>("/channels", 10000);
  const [name, setName] = useState("");
  const [rights, setRights] = useState("discovered");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const add = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    try { await api("/channels", { method: "POST", body: JSON.stringify({ name: name.trim(), rights }) }); setName(""); reload(); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <>
      <PageHeader title="Surveillance Twitch" subtitle="États issus des processus de surveillance (signal de vie toutes les 60 s) et de Twitch." />
      <Card className="mb-5">
        <form onSubmit={add} className="flex flex-col sm:flex-row gap-2">
          <Input placeholder="Nom de la chaîne Twitch (ex. squeezie)" value={name} onChange={(e) => setName(e.target.value)} required pattern="[A-Za-z0-9_]{3,25}" />
          <Select value={rights} onChange={(e) => setRights(e.target.value)} className="sm:w-56">
            {Object.entries(RIGHTS_FR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Button type="submit" loading={busy}><Plus className="size-4" />Ajouter</Button>
        </form>
        <div className="mt-2"><ErrorBox error={err} /></div>
      </Card>
      <ErrorBox error={error} />
      {loading && !data ? <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-72" />)}</div>
        : !data?.length ? <Empty title="Aucune chaîne suivie" icon={<Radio className="size-5" />}>Ajoutez une chaîne Twitch ci-dessus.</Empty>
        : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{data.map((ch) => <ChannelCard key={ch.name} ch={ch} onChange={reload} />)}</div>}
    </>
  );
}
