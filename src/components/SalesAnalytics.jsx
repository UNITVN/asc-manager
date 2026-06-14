import { useState } from "react";
import {
  computeChartNiceMax,
  estimateChartLeftPad,
  formatAxisDate,
  formatAxisMetricValue,
  formatMetricCell,
  formatShortDate,
  metricValue,
  totalMetricValue,
} from "../lib/salesMetrics.js";

function buildChartGeometry(daily, metric, currency) {
  const width = 640;
  const height = 220;
  const pad = { top: 12, right: 12, bottom: 28, left: 44 };

  const values = daily.map((day) => metricValue(day, metric, currency));
  const max = Math.max(...values, 1);
  const niceMax = computeChartNiceMax(max, metric);

  const yTickValues = [0, 0.25, 0.5, 0.75, 1].map((t) => niceMax * t);
  pad.left = estimateChartLeftPad(
    yTickValues.map((value) => formatAxisMetricValue(value, metric, currency)),
  );

  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const points = daily.map((day, index) => {
    const value = metricValue(day, metric, currency);
    const x = pad.left + (daily.length > 1 ? (index / (daily.length - 1)) * plotW : plotW / 2);
    const y = pad.top + plotH - (value / niceMax) * plotH;
    return { x, y, value, date: day.date };
  });

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    y: pad.top + plotH - t * plotH,
    value: niceMax * t,
  }));

  const xLabels = daily.length <= 1
    ? points
    : [0, Math.floor(daily.length / 3), Math.floor((daily.length * 2) / 3), daily.length - 1]
        .filter((v, i, arr) => arr.indexOf(v) === i)
        .map((index) => ({
          x: pad.left + (index / (daily.length - 1)) * plotW,
          label: formatAxisDate(daily[index].date),
        }));

  const line = points.map((p) => `${p.x},${p.y}`).join(" ");

  return { width, height, pad, plotW, plotH, points, yTicks, xLabels, line, niceMax };
}

export default function SalesAnalytics({
  daily,
  totals,
  metric,
  currency,
  metricLabel,
  chartOnly = false,
}) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  if (!daily?.length) {
    return (
      <p className="text-[13px] text-dark-dim m-0 py-8 text-center">
        No data for this period.
      </p>
    );
  }

  const chart = buildChartGeometry(daily, metric, currency);
  const tableRows = [...daily].reverse();
  const total = chartOnly ? null : totalMetricValue(totals, daily, metric, currency);

  return (
    <div className="space-y-0">
      <div className="relative px-1 py-2">
        <svg
          viewBox={`0 0 ${chart.width} ${chart.height}`}
          className="w-full h-auto"
          role="img"
          aria-label={`${metricLabel} trend`}
        >
          {chart.yTicks.map((tick) => (
            <g key={tick.y}>
              <line
                x1={chart.pad.left}
                x2={chart.width - chart.pad.right}
                y1={tick.y}
                y2={tick.y}
                stroke="currentColor"
                className="text-dark-border"
                strokeDasharray="4 4"
              />
              <text
                x={chart.pad.left - 8}
                y={tick.y + 4}
                textAnchor="end"
                className="fill-dark-phantom text-[10px]"
              >
                {formatAxisMetricValue(tick.value, metric, currency)}
              </text>
            </g>
          ))}

          <polyline
            fill="none"
            stroke="#007aff"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={chart.line}
          />

          {chart.points.map((point) => {
            const active = hoveredPoint?.date === point.date;
            return (
              <g key={point.date}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="12"
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredPoint(point)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={active ? 4 : 2.5}
                  fill="#007aff"
                  pointerEvents="none"
                />
              </g>
            );
          })}

          {chart.xLabels.map((label) => (
            <text
              key={label.label}
              x={label.x}
              y={chart.height - 8}
              textAnchor="middle"
              className="fill-dark-dim text-[10px]"
            >
              {label.label}
            </text>
          ))}
        </svg>

        {hoveredPoint && (
          <div
            className="absolute z-10 pointer-events-none -translate-x-1/2 -translate-y-full"
            style={{
              left: `${(hoveredPoint.x / chart.width) * 100}%`,
              top: `${(hoveredPoint.y / chart.height) * 100}%`,
              marginTop: "-8px",
            }}
          >
            <div className="bg-dark-card border border-dark-border-light rounded-lg px-2.5 py-1.5 shadow-lg text-center whitespace-nowrap">
              <p className="text-[10px] text-dark-dim m-0">{formatShortDate(hoveredPoint.date)}</p>
              <p className="text-[12px] font-semibold text-dark-text m-0 mt-0.5">
                {formatMetricCell(hoveredPoint.value, metric, currency)}
              </p>
            </div>
          </div>
        )}
      </div>

      {!chartOnly && (
      <div className="border-t border-dark-border">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-dark-border">
              <th className="text-left font-semibold text-dark-dim text-[11px] uppercase tracking-wide px-4 py-3">
                {metricLabel}
              </th>
              <th className="text-right font-semibold text-dark-dim text-[11px] uppercase tracking-wide px-4 py-3">
                <span className="inline-flex items-center gap-1">
                  Total {metricLabel}
                  <span className="text-dark-phantom">↓</span>
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-dark-border">
              <td className="px-4 py-3 text-dark-text">
                <span className="inline-flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "#007aff" }} />
                  Total
                </span>
              </td>
              <td className="px-4 py-3 text-right font-semibold text-dark-text">
                {formatMetricCell(total, metric, currency)}
              </td>
            </tr>
            {tableRows.map((day) => {
              const value = metricValue(day, metric, currency);
              return (
                <tr key={day.date} className="border-b border-dark-border last:border-b-0">
                  <td className="px-4 py-3 text-dark-text">
                    <span className="inline-flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 opacity-40" style={{ background: "#007aff" }} />
                      {new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-dark-text">
                    {formatMetricCell(value, metric, currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
