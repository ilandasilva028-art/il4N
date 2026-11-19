"use client";
/** Graphique en barres groupées (sans dépendance). Chaque barre affiche sa valeur au survol. */
export function Bars({ data, x, series, height = 180 }: {
  data: Record<string, number | string>[]; x: string; series: { key: string; label: string; color: string }[]; height?: number;
}) {
  const max = Math.max(1, ...data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0)));
  const total = data.reduce((a, d) => a + series.reduce((b, s) => b + (Number(d[s.key]) || 0), 0), 0);
  return (
    <div>
      <div className="flex items-center gap-4 mb-3 text-xs text-mute">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: s.color }} />{s.label}</span>
        ))}
      </div>
      {total === 0 && <p className="text-xs text-mute mb-2">Aucune donnée sur la période : les barres apparaîtront avec les premiers clips.</p>}
      <div className="flex items-end gap-1.5 sm:gap-2" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0 h-full">
            <div className="flex-1 w-full flex items-end justify-center gap-0.5">
              {series.map((s) => {
                const v = Number(d[s.key]) || 0;
                return (
                  <div key={s.key} title={`${s.label} : ${v}`} className="w-full max-w-3 rounded-t transition-all duration-500 hover:opacity-80"
                    style={{ height: `${(v / max) * 100}%`, minHeight: v ? 3 : 1, background: v ? s.color : "#263044" }} />
                );
              })}
            </div>
            <span className="text-[10px] text-mute truncate w-full text-center">{String(d[x])}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ScoreBars({ sub, weights }: { sub: Record<string, number>; weights?: Record<string, number> }) {
  const LABELS: Record<string, string> = {
    interest: "Intérêt et compréhension", reaction: "Réaction du streamer", chat: "Activité du chat",
    surprise: "Surprise / originalité", audio: "Intensité audio", dialogue: "Dialogue / punchline", technical: "Qualité technique",
  };
  return (
    <div className="space-y-2.5">
      {Object.entries(sub).map(([k, v]) => (
        <div key={k}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-mute">{LABELS[k] ?? k}</span>
            <span className="tabular-nums">{weights ? `${Math.round(v * (weights[k] ?? 0))} / ${weights[k]}` : `${Math.round(v * 100)} %`}</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/8"><div className="h-full rounded-full bg-brand transition-all" style={{ width: `${v * 100}%` }} /></div>
        </div>
      ))}
      <p className="text-[11px] text-mute pt-1">Score heuristique de classement : ce n'est pas une probabilité ni une garantie de viralité.</p>
    </div>
  );
}
