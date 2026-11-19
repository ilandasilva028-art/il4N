"use client";
import { BarChart3, CheckCircle2, Clock, Gauge, Timer, TriangleAlert, XCircle, Film } from "lucide-react";
import { fmtDur, useApi } from "@/lib/api";
import { Card, CardTitle, Empty, ErrorBox, PageHeader, Skeleton, Stat } from "@/components/ui";
import { Bars } from "@/components/charts";

type Stats = {
  detected: number; approved: number; rejected: number; produced: number; failed: number; error_rate: number | null;
  avg_duration: number | null; avg_processing: number | null;
  by_creator: { creator: string; detected: number; produced: number; approved: number; avg_score: number | null }[];
  weekly: { week: string; detected: number; produced: number }[]; tiktok: null;
};

export default function StatsPage() {
  const { data, error, loading } = useApi<Stats>("/stats", 30000);
  return (
    <>
      <PageHeader title="Statistiques" subtitle="Statistiques internes calculées depuis la base de données." />
      <ErrorBox error={error} />
      {loading && !data ? <Skeleton className="h-96" /> : data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Moments détectés" value={data.detected} icon={<Film className="size-4" />} />
            <Stat label="Vidéos produites" value={data.produced} icon={<CheckCircle2 className="size-4" />} tone="ok" />
            <Stat label="Clips acceptés" value={data.approved} icon={<CheckCircle2 className="size-4" />} tone="ok" />
            <Stat label="Clips rejetés / refusés" value={data.rejected} icon={<XCircle className="size-4" />} tone="warn" />
            <Stat label="Durée moyenne" value={data.avg_duration != null ? fmtDur(data.avg_duration) : "—"} icon={<Clock className="size-4" />} hint={data.avg_duration == null ? "aucune vidéo produite" : undefined} />
            <Stat label="Temps de traitement moyen" value={data.avg_processing != null ? fmtDur(data.avg_processing) : "—"} icon={<Timer className="size-4" />} />
            <Stat label="Taux d'erreur" value={data.error_rate != null ? `${Math.round(data.error_rate * 100)} %` : "—"} icon={<TriangleAlert className="size-4" />} tone={data.error_rate ? "bad" : "ok"} />
            <Stat label="Erreurs" value={data.failed} icon={<Gauge className="size-4" />} tone={data.failed ? "bad" : "ok"} />
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardTitle icon={<BarChart3 className="size-4 text-brand2" />}>Évolution hebdomadaire</CardTitle>
              {data.weekly.length ? <Bars data={data.weekly} x="week" series={[{ key: "detected", label: "Détectés", color: "#7548E8" }, { key: "produced", label: "Produits", color: "#22C55E" }]} />
                : <Empty title="Pas encore de données hebdomadaires" />}
            </Card>
            <Card>
              <CardTitle>Répartition par streamer</CardTitle>
              {!data.by_creator.length ? <Empty title="Aucune donnée" /> : (
                <table className="w-full text-sm">
                  <thead><tr className="text-mute text-xs text-left"><th className="pb-2">Streamer</th><th>Détectés</th><th>Produits</th><th>Acceptés</th><th>Score moyen</th></tr></thead>
                  <tbody>{data.by_creator.map((r) => (
                    <tr key={r.creator} className="border-t border-line"><td className="py-2">{r.creator}</td><td>{r.detected}</td><td>{r.produced ?? 0}</td><td>{r.approved ?? 0}</td><td>{r.avg_score ?? "—"}</td></tr>))}
                  </tbody>
                </table>)}
            </Card>
          </div>
          <Card>
            <CardTitle>Performances TikTok</CardTitle>
            <Empty title="Aucune intégration TikTok vérifiée">Les vues, likes et interactions ne sont affichés que s'ils proviennent d'une intégration officielle autorisée. Aucune donnée n'est inventée.</Empty>
          </Card>
        </div>
      )}
    </>
  );
}
