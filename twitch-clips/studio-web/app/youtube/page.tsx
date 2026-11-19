"use client";
import { useState } from "react";
import { ExternalLink, FileUp, Search, Trash2, Youtube } from "lucide-react";
import { api, fmtDate, useApi } from "@/lib/api";
import { Badge, Button, Card, CardTitle, Empty, ErrorBox, Input, PageHeader, Select, Skeleton } from "@/components/ui";

type Result = { id: string; title: string; channel: string; published: string; thumb: string; url: string };
type Settings = { youtube_channels: string[]; api_keys_present: Record<string, boolean> };
type Source = { id: number; creator: string; source_id: string; url: string; title: string; rights: string; discovered_at: number; meta: { interest?: number; views?: string; duration?: string } };

function Importer() {
  const [file, setFile] = useState<File | null>(null);
  const [creator, setCreator] = useState("");
  const [rights, setRights] = useState("owned");
  const [url, setUrl] = useState("");
  const [n, setN] = useState(3);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmRights, setConfirmRights] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!file) return;
    setBusy(true); setErr(null); setMsg(null);
    const fd = new FormData();
    fd.append("file", file); fd.append("creator", creator); fd.append("rights", rights); fd.append("max_moments", String(n));
    if (url) fd.append("url", url);
    try {
      const r = await api<{ file: string }>("/import", { method: "POST", body: fd });
      setMsg(`Importé (${r.file}). Recherche des moments en cours : ils apparaîtront dans Production puis dans Clips détectés.`);
      setFile(null);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Card>
      <CardTitle icon={<FileUp className="size-4 text-brand2" />}>Importer une vidéo locale autorisée</CardTitle>
      <form onSubmit={submit} className="space-y-3">
        <input type="file" accept="video/mp4,video/quicktime,video/x-matroska,video/webm,.ts" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-mute file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:text-white file:text-sm" required />
        <div className="grid sm:grid-cols-2 gap-2">
          <Input placeholder="Créateur (pour le crédit)" value={creator} onChange={(e) => setCreator(e.target.value)} required />
          <Select value={rights} onChange={(e) => setRights(e.target.value)}>
            <option value="owned">Contenu personnel</option><option value="authorized">Autorisé par le créateur</option>
          </Select>
          <Input placeholder="Lien de la source originale (facultatif)" value={url} onChange={(e) => setUrl(e.target.value)} type="url" />
          <Select value={n} onChange={(e) => setN(Number(e.target.value))}>
            {[1, 2, 3, 5, 8, 10].map((x) => <option key={x} value={x}>{x} moment(s) maximum</option>)}
          </Select>
        </div>
        <label className="flex items-start gap-2 text-xs text-mute">
          <input type="checkbox" checked={confirmRights} onChange={(e) => setConfirmRights(e.target.checked)} className="mt-0.5 accent-[#7548E8]" required />
          Je confirme posséder cette vidéo ou disposer de l'autorisation de la réutiliser. Un crédit ne remplace pas une autorisation.
        </label>
        <Button type="submit" loading={busy} disabled={!confirmRights}>Importer et analyser</Button>
      </form>
      <div className="mt-3 space-y-2">{msg && <p className="text-sm text-ok">{msg}</p>}<ErrorBox error={err} /></div>
    </Card>
  );
}

export default function YouTube() {
  const settings = useApi<Settings>("/settings");
  const sources = useApi<Source[]>("/youtube/sources");
  const [q, setQ] = useState("");
  const [after, setAfter] = useState("");
  const [dur, setDur] = useState("any");
  const [res, setRes] = useState<Result[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [chId, setChId] = useState("");
  const keyOk = settings.data?.api_keys_present.youtube_api_key;
  const search = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    const p = new URLSearchParams({ q, duration: dur });
    if (after) p.set("published_after", new Date(after).toISOString());
    try { setRes(await api<Result[]>(`/youtube/search?${p}`)); } catch (e) { setErr((e as Error).message); setRes(null); } finally { setBusy(false); }
  };
  const follow = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null);
    try { await api("/youtube/channels", { method: "POST", body: JSON.stringify({ channel_id: chId.trim() }) }); setChId(""); settings.reload(); }
    catch (e) { setErr((e as Error).message); }
  };
  return (
    <>
      <PageHeader title="Recherche YouTube" subtitle="Découverte via l'API officielle (métadonnées uniquement). Aucun téléchargement depuis YouTube." />
      {settings.data && !keyOk && (
        <div className="mb-5 rounded-xl border border-warn/30 bg-warn/10 text-warn p-3 text-sm">
          Clé <code>YOUTUBE_API_KEY</code> non configurée sur le serveur : la recherche et le suivi automatique sont indisponibles. L'import de vidéos locales autorisées fonctionne.
        </div>
      )}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <form onSubmit={search} className="flex flex-col md:flex-row gap-2">
              <Input placeholder="Rechercher des vidéos…" value={q} onChange={(e) => setQ(e.target.value)} required minLength={2} />
              <Input type="date" value={after} onChange={(e) => setAfter(e.target.value)} className="md:w-40" title="Publiées après" />
              <Select value={dur} onChange={(e) => setDur(e.target.value)} className="md:w-40">
                <option value="any">Toutes durées</option><option value="short">Moins de 4 min</option><option value="medium">4 à 20 min</option><option value="long">Plus de 20 min</option>
              </Select>
              <Button type="submit" loading={busy} disabled={!keyOk}><Search className="size-4" />Rechercher</Button>
            </form>
          </Card>
          <ErrorBox error={err} />
          {busy ? <div className="grid sm:grid-cols-2 gap-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-56" />)}</div>
            : res && (res.length === 0 ? <Empty title="Aucun résultat" /> : (
              <div className="grid sm:grid-cols-2 gap-3">
                {res.map((v) => (
                  <Card key={v.id} className="p-0 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={v.thumb} alt="" className="w-full aspect-video object-cover" />
                    <div className="p-3 space-y-1">
                      <p className="text-sm font-medium line-clamp-2">{v.title}</p>
                      <p className="text-xs text-mute">{v.channel} · {new Date(v.published).toLocaleDateString("fr-FR")}</p>
                      <div className="flex items-center justify-between pt-1">
                        <Badge>Repérage seulement</Badge>
                        <a href={v.url} target="_blank" rel="noreferrer" className="text-xs text-brand2 flex items-center gap-1">Source originale<ExternalLink className="size-3" /></a>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>))}
          <Card>
            <CardTitle icon={<Youtube className="size-4 text-brand2" />}>Vidéos découvertes (chaînes suivies)</CardTitle>
            {sources.loading ? <Skeleton className="h-24" /> : !sources.data?.length ? <Empty title="Aucune vidéo découverte">Ajoutez une chaîne suivie et une clé API, puis lancez une découverte.</Empty> : (
              <ul className="divide-y divide-line">
                {sources.data.map((s) => (
                  <li key={s.id} className="py-2 flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0"><p className="truncate">{s.title}</p><p className="text-xs text-mute">{s.creator} · intérêt {s.meta.interest ?? "—"} · {fmtDate(s.discovered_at)}</p></div>
                    <a href={s.url} target="_blank" rel="noreferrer" className="text-brand2"><ExternalLink className="size-4" /></a>
                  </li>))}
              </ul>)}
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <CardTitle icon={<Youtube className="size-4 text-brand2" />}>Chaînes suivies</CardTitle>
            <form onSubmit={follow} className="flex gap-2 mb-3">
              <Input placeholder="ID de chaîne (UC…)" value={chId} onChange={(e) => setChId(e.target.value)} required />
              <Button type="submit">Suivre</Button>
            </form>
            {!settings.data?.youtube_channels.length ? <p className="text-sm text-mute">Aucune chaîne suivie.</p> : (
              <ul className="space-y-1.5">{settings.data.youtube_channels.map((c) => (
                <li key={c} className="flex items-center justify-between text-sm"><code className="truncate">{c}</code>
                  <Button variant="ghost" onClick={async () => { await api(`/youtube/channels/${c}`, { method: "DELETE" }); settings.reload(); }}><Trash2 className="size-4" /></Button></li>))}
              </ul>)}
            <Button variant="outline" className="mt-3 w-full" disabled={!keyOk}
              onClick={async () => { setErr(null); try { await api("/youtube/discover", { method: "POST" }); sources.reload(); } catch (e) { setErr((e as Error).message); } }}>
              Lancer une découverte</Button>
          </Card>
          <Importer />
        </div>
      </div>
    </>
  );
}
