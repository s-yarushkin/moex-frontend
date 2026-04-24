import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Brush,
} from 'recharts';
import { fmt, fmtFull } from '../api/moex';

function formatAxisTs(value, spanMs) {
  if (!value) return '';
  const d = new Date(value);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');

  if (spanMs <= 2 * 86400000) return `${hh}:${min}`;
  if (spanMs <= 45 * 86400000) return `${dd}.${mm} ${hh}:00`;
  return `${dd}.${mm}`;
}

function formatAxisCategory(value, labelMap) {
  return labelMap[value] || value || '';
}

function extremaForVisibleRange(data, lines, visible) {
  let maxItem = null;
  let minItem = null;

  for (const point of data || []) {
    for (const line of lines) {
      if (!visible[line.key]) continue;
      const value = point[line.key];
      if (!Number.isFinite(value)) continue;

      const candidate = {
        value,
        label: point.tooltipLabel || point.label,
      };

      if (!maxItem || value > maxItem.value) maxItem = candidate;
      if (!minItem || value < minItem.value) minItem = candidate;
    }
  }

  return { maxItem, minItem };
}

function glowStrokeWidth(line) {
  return (line.width ?? (line.dash ? 1.8 : 2.6)) + (line.dash ? 2.8 : 4.8);
}

function glowOpacity(line) {
  return line.dash ? 0.12 : 0.2;
}

function OITooltip({ active, payload, label, lines }) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload ?? {};
  const values = {};
  payload.forEach((item) => {
    values[item.dataKey] = item.value;
  });

  const visibleLines = lines.filter((line) => values[line.key] != null);
  if (!visibleLines.length) return null;

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-date">{point.tooltipLabel || point.label || label}</div>
      <div className="chart-tooltip-meta">{point.time ? `точка: ${point.time}` : 'точка периода'}</div>
      {visibleLines.map((line) => (
        <div className="chart-tooltip-row" key={line.key}>
          <span className="chart-tooltip-left">
            <span
              className={`chart-tooltip-swatch ${line.dash ? 'dashed' : ''}`}
              style={{ background: line.color, opacity: line.opacity ?? 1 }}
            />
            {line.label}
          </span>
          <span className="chart-tooltip-value">{fmtFull(values[line.key])}</span>
        </div>
      ))}
    </div>
  );
}

function Legend({ lines, visible, onToggle }) {
  const fizLines = lines.filter((line) => line.side === 'Физлица');
  const yurLines = lines.filter((line) => line.side === 'Юрлица');

  const renderGroup = (title, items) => (
    <div className="legend-group">
      <div className="legend-group-title">{title}</div>
      <div className="legend-group-items">
        {items.map((line) => (
          <button
            key={line.key}
            type="button"
            className={`legend-chip ${visible[line.key] ? 'active' : ''}`}
            onClick={() => onToggle(line.key)}
            title="Нажми, чтобы скрыть/показать линию"
          >
            <span
              className={`legend-line ${line.dash ? 'dashed' : ''}`}
              style={{ background: line.color, opacity: line.opacity ?? 1 }}
            />
            <span>{line.direction}</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="chart-legend-pro stronger">
      {renderGroup('Физлица', fizLines)}
      {renderGroup('Юрлица', yurLines)}
      <div className="legend-hint">
        <span><b>синий</b> = физлица</span>
        <span><b>оранжевый</b> = юрлица</span>
        <span><b>сплошная</b> = Long</span>
        <span><b>пунктир</b> = Short</span>
      </div>
    </div>
  );
}

export default function OIChart({
  data,
  lines,
  visible,
  onToggle,
  loading,
  syncId,
  height = 280,
  showBrush = false,
}) {
  const [brushRange, setBrushRange] = useState(null);
  const firstTs = data?.[0]?.ts ?? 0;
  const lastTs = data?.[data.length - 1]?.ts ?? firstTs;
  const spanMs = Math.max(0, lastTs - firstTs);
  const useCategoryAxis = data?.some((point) =>
    /\d{2}:\d{2}/.test(point?.tooltipLabel || point?.key || ''),
  );
  const xDataKey = useCategoryAxis ? 'key' : 'ts';
  const labelMap = Object.fromEntries((data || []).map((point) => [point.key, point.label]));
  const xInterval =
    data?.length > 260
      ? Math.ceil(data.length / 8)
      : data?.length > 120
        ? Math.ceil(data.length / 7)
        : data?.length > 50
          ? Math.ceil(data.length / 6)
          : 0;
  const visibleData = useMemo(() => {
    if (!showBrush || !brushRange || !data?.length) return data || [];
    const start = Math.max(0, brushRange.startIndex ?? 0);
    const end = Math.min(data.length - 1, brushRange.endIndex ?? data.length - 1);
    return data.slice(start, end + 1);
  }, [brushRange, data, showBrush]);
  const { maxItem, minItem } = useMemo(
    () => extremaForVisibleRange(visibleData, lines, visible),
    [lines, visible, visibleData],
  );

  useEffect(() => {
    setBrushRange(
      data?.length
        ? { startIndex: 0, endIndex: data.length - 1 }
        : null,
    );
  }, [data]);

  return (
    <div className="chart-viewport">
      <Legend lines={lines} visible={visible} onToggle={onToggle} />
      {maxItem || minItem ? (
        <div className="chart-extrema">
          {maxItem ? (
            <div className="chart-extrema-item top">
              <span className="chart-extrema-label">visible max</span>
              <span className="chart-extrema-value">{fmtFull(maxItem.value)}</span>
              <span className="chart-extrema-meta">{maxItem.label}</span>
            </div>
          ) : null}
          {minItem ? (
            <div className="chart-extrema-item bottom">
              <span className="chart-extrema-label">visible min</span>
              <span className="chart-extrema-value">{fmtFull(minItem.value)}</span>
              <span className="chart-extrema-meta">{minItem.label}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <div className="skeleton" style={{ height }} />
      ) : !data?.length ? (
        <div className="empty-chart" style={{ height }}>Нет данных</div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart
            data={data}
            syncId={syncId}
            syncMethod="value"
            margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
          >
            <CartesianGrid stroke="#202835" vertical strokeOpacity={0.28} strokeDasharray="2 7" />
            <XAxis
              dataKey={xDataKey}
              type={useCategoryAxis ? 'category' : 'number'}
              domain={useCategoryAxis ? undefined : ['dataMin', 'dataMax']}
              scale={useCategoryAxis ? undefined : 'time'}
              tickFormatter={(value) => (
                useCategoryAxis
                  ? formatAxisCategory(value, labelMap)
                  : formatAxisTs(value, spanMs)
              )}
              tick={{ fill: '#858f9e', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval={xInterval}
              minTickGap={14}
            />
            <YAxis
              tickFormatter={fmt}
              tick={{ fill: '#858f9e', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={56}
            />
            <Tooltip
              content={<OITooltip lines={lines} />}
              cursor={{ stroke: '#9fb9ff88', strokeWidth: 1.4 }}
              filterNull={false}
              isAnimationActive={false}
            />

            {lines.map((line) => (
              visible[line.key] ? (
                <Fragment key={line.key}>
                  <Line
                    key={`${line.key}-glow`}
                    type="linear"
                    dataKey={line.key}
                    stroke={line.color}
                    strokeOpacity={glowOpacity(line)}
                    strokeWidth={glowStrokeWidth(line)}
                    strokeDasharray={line.dash || undefined}
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                  />
                  <Line
                    key={line.key}
                    type="linear"
                    dataKey={line.key}
                    stroke={line.color}
                    strokeOpacity={line.opacity ?? 1}
                    strokeWidth={line.width ?? (line.dash ? 1.8 : 2.6)}
                    strokeDasharray={line.dash || undefined}
                    strokeLinecap="round"
                    dot={false}
                    activeDot={{ r: 4.5, stroke: line.color, fill: '#0b0f14', strokeWidth: 2 }}
                    connectNulls
                    isAnimationActive={data.length < 220}
                  />
                </Fragment>
              ) : null
            ))}

            {showBrush && data.length > 10 ? (
              <Brush
                dataKey={xDataKey}
                startIndex={brushRange?.startIndex}
                endIndex={brushRange?.endIndex}
                onChange={(next) => {
                  if (!next) return;
                  setBrushRange({
                    startIndex: next.startIndex ?? 0,
                    endIndex: next.endIndex ?? data.length - 1,
                  });
                }}
                tickFormatter={(value) => (
                  useCategoryAxis
                    ? formatAxisCategory(value, labelMap)
                    : formatAxisTs(value, spanMs)
                )}
                height={28}
                stroke="#334155"
                fill="#0f141b"
                travellerWidth={7}
              />
            ) : null}
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
