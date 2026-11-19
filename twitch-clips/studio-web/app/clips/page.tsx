"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Clock, Film, Search, Twitch, Youtube, HardDrive } from "lucide-react";
import { fmtDate, fmtDur, media, useApi, type Clip } from "@/lib/api";
import { Card, Empty, ErrorBox, Input, PageHeader, ScorePill, Select, Skeleton, StateBadge } from "@/components/ui";

const PLAT: Record<string, React.ReactNode> = { twitch: <Twitch className="size-3.5" />, youtube: <Youtube className="size-3.5" />, local: <HardDrive className="size-3.5" /> };

export default function Clips() {
  const [f, setF] = useState({ platform: "", creator: "", state: "", min_score: "", q: "", since: "", dur: "", order: "recent" });
  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (f.platform) p.set("platform", f.platform);
    if (f.creator) p.set("creator", f.creator);
    if (f.state) p.set("state", f.state);
    if (f.min_score) p.set("min_score", f.min_score);
    if (f.q) p.set("q", f.q);
    if (f.since) p.set("since", String(Date.now() / 1000 - Number(f.since) * 86400));
    if (f.dur === "short") p.set("max_dur", "20");
    if (f.dur === "mid") { p.set("min_dur", "20"); p.set("max_dur", "35"); }
    if (f.dur === "long") p.set("min_dur", "35");
    p.set("order", f.order);
    return p.toString();
  }, [f]);
  const { data, error, loading } = useApi<Clip[]>(`/clips?${qs}`, 10000);
  const creators = useApi<{ name: string }[]>("/channels");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <>
      <PageHeader title="Clips détectés" subtitle="Tous les moments repérés et leur traitement. Cliquez pour ouvrir la fiche détaillée." />
      <Card className="mb-5 space-y-3">
        <div className="relative"><Search className="size-4 absolute left-3 top-2.5 text-mute" />
          <Input className="pl-9" placeholder="Rechercher un nom, une source ou un passage transcrit…" value={f.q} onChange={set("q")} /></div>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2">
          <Select value={f.platform} onChange={set("platform")}><option value="">Toutes plateformes</option><option value="twitch">Twitch</option><option value="local">Import local</option><option value="youtube">YouTube</option></Select>
          <Select value={f.creator} onChange={set("creator")}><option value="">Tous les streamers</option>{creators.data?.map((c) => <option key={c.name}>{c.name}</option>)}</Select>
          <Select value={f.state} onChange={set("state")}><option value="">Tous les statuts</option>
            {[["DISCOVERED", "Repérés"], ["CANDIDATE", "À analyser"], ["ANALYZED", "Prêts à monter"], ["RENDERING", "Montage"], ["READY", "Terminés"], ["SENT", "Livrés"], ["REJECTED", "Rejetés"], ["FAILED", "Erreurs"]].map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
          <Select value={f.min_score} onChange={set("min_score")}><option value="">Tout score</option><option value="65">Score ≥ 65</option><option value="80">Score ≥ 80</option></Select>
          <Select value={f.since} onChange={set("since")}><option value="">Toutes dates</option><option value="1">24 h</option><option value="7">7 jours</option><option value="30">30 jours</option></Select>
          <Select value={f.dur} onChange={set("dur")}><option value="">Toutes durées</option><option value="short">&lt; 20 s</option><option value="mid">20 à 35 s</option><option value="long">&gt; 35 s</option></Select>
          <Select value={f.order} onChange={set("order")}><option value="recent">Plus récents</option><option value="score">Meilleur score (file de priorité)</option></Select>
        </div>
      </Card>
      <ErrorBox error={error} />
      {loading && !data ? <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-64" />)}</div>
        : !data?.length ? <Empty title="Aucun clip ne correspond" icon={<Film className="size-5" />}>Les moments apparaissent ici dès que la surveillance en détecte ou qu'une vidéo autorisée est importée.</Empty>
        : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {data.map((c) => (
              <Link key={c.id} href={`/clips/${c.id}`} className="group rounded-2xl border border-line bg-card overflow-hidden hover:border-brand/50 transition fade-in">
                <div className="aspect-video bg-card2 relative overflow-hidden">
                  {c.has_video ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={media(`/clips/${c.id}/thumb`)} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition" />
                  ) : <div className="w-full h-full grid place-items-center text-xs text-mute p-3 text-center">Pas de vidéo<br />(repérage sans téléchargement)</div>}
                  <div className="absolute top-2 left-2"><StateBadge state={c.state} label={c.stage} /></div>
                  {c.duration && <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 text-[11px] flex items-center gap-1"><Clock className="size-3" />{fmtDur(c.duration)}</span>}
                </div>
                <div className="p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-sm font-medium truncate">{PLAT[c.platform]}{c.creator}</span>
                    <ScorePill score={c.score} />
                  </div>
                  <p className="text-xs text-mute truncate">{c.hook || (c.kind ? `Chat : ${c.kind} · ${c.chat_count} msgs` : c.transcript || "—")}</p>
                  <p className="text-[11px] text-mute">{fmtDate(c.detected_at)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
    </>
  );
}
