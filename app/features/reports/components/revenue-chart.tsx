import { formatRupiah } from "~/features/orders/order-display";
import type { RevenuePoint } from "../types";

export function RevenueChart({ points }: { points: RevenuePoint[] }) {
  const max = Math.max(...points.map((point) => point.amount), 1);
  const width = 800;
  const height = 240;
  const chartHeight = 170;
  const plotStart = 40;
  const plotEnd = width - 20;
  const xPosition = (index: number) =>
    points.length === 1
      ? (plotStart + plotEnd) / 2
      : plotStart + (index / (points.length - 1)) * (plotEnd - plotStart);
  const labelInterval = Math.max(1, Math.ceil(points.length / 8));
  const showLabel = (index: number) =>
    index === 0 || index === points.length - 1 || index % labelInterval === 0;
  if (!points.some((point) => point.amount > 0)) return <div className="flex h-64 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">Belum ada pendapatan pada periode ini.</div>;
  return <svg role="img" aria-label="Grafik pendapatan" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" className="h-64 w-full"><line x1="34" y1="190" x2={width - 10} y2="190" stroke="#cbd5e1" /><polyline fill="none" stroke="#2563eb" strokeWidth="3" strokeLinejoin="round" points={points.map((point, index) => `${xPosition(index)},${190 - point.amount / max * chartHeight}`).join(" ")} />{points.map((point, index) => { const x = xPosition(index); const y = 190 - point.amount / max * chartHeight; return <g key={point.key}><circle cx={x} cy={y} r="4" fill="#2563eb"><title>{point.label}: {formatRupiah(point.amount)}</title></circle>{showLabel(index) ? <text x={x} y="214" textAnchor="middle" fontSize="10" fill="#64748b">{point.label}</text> : null}</g>; })}</svg>;
}
