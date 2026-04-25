import { useMemo, useState } from 'react';
import { TICKERS, LINE_CFG, fmt } from '../api/moex';
import OIChart from './OIChart';

const CONTRACT_LINES = ['fiz_long', 'fiz_short', 'yur_long', 'yur_short'].map((key) => ({ key, ...LINE_CFG[key] }));
const PERSONS_LINES = ['fiz_long_num', 'fiz_short_num', 'yur_long_num', 'yur_short_num'].map((key) => ({ key, ...LINE_CFG[key] }));
const ALL_ON = Object.fromEntries([...CONTRACT_LINES, ...PERSONS_LINES].map((line) => [line.key, true]));

function calcMiniStats(data) {
  if (!data?.length) return null;
  const last = data[data.length - 1];
  return {
    fizNet: (last.fiz_long ?? 0) - (last.fiz_short ?? 0),
    yurNet: (last.yur_long ?? 0) - (last.yur_short ?? 0),
    lastLabel: last.label,
  };
}

export default function InstrumentPanel({ title, ticker, onTickerChange, data, loading, error, syncId }) {
  const [visible, setVisible] = useState(ALL_ON);
  const stats = useMemo(() => calcMiniStats(data), [data]);
  const instrumentName = TICKERS.find((item) => item.id === ticker)?.name ?? '';

  function toggleLine(key) {
    setVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <section className="instrument-card">
      <div className="panel-strip">
        <div className="panel-strip-main">
          <div className="panel-strip-kicker">{title}</div>
          <div className="panel-strip-instrument">
            <select className="ticker-dropdown compact" value={ticker} onChange={(e) => onTickerChange(e.target.value)}>
              {TICKERS.map((item) => (
                <option key={item.id} value={item.id}>{item.id}</option>
              ))}
            </select>
            <span className="instrument-name">{instrumentName}</span>
          </div>
        </div>

        {stats && (
          <div className="panel-strip-meta">
            <div className="mini-kpi">
              <span className="mini-kpi-label">Физ нетто</span>
              <span className={`mini-kpi-value ${stats.fizNet >= 0 ? 'positive' : 'negative'}`}>
                {stats.fizNet >= 0 ? '+' : ''}{fmt(stats.fizNet)}
              </span>
            </div>
            <div className="mini-kpi">
              <span className="mini-kpi-label">Юр нетто</span>
              <span className={`mini-kpi-value ${stats.yurNet >= 0 ? 'positive' : 'negative'}`}>
                {stats.yurNet >= 0 ? '+' : ''}{fmt(stats.yurNet)}
              </span>
            </div>
            <div className="mini-kpi muted">
              <span className="mini-kpi-label">Последняя точка</span>
              <span className="mini-kpi-value neutral">{stats.lastLabel}</span>
            </div>
          </div>
        )}
      </div>

      {loading && <div className="loading-bar" />}
      {error && <div className="panel-error">{error}</div>}

      <div className="chart-stack">
        <div className="chart-card">
          <div className="chart-card-title">Позиции</div>
          <OIChart
            data={data}
            lines={CONTRACT_LINES}
            visible={visible}
            onToggle={toggleLine}
            loading={loading}
            syncId={syncId}
            height={340}
            showBrush
          />
        </div>

        <div className="chart-card">
          <div className="chart-card-title">Количество лиц</div>
          <OIChart
            data={data}
            lines={PERSONS_LINES}
            visible={visible}
            onToggle={toggleLine}
            loading={loading}
            syncId={syncId}
            height={230}
          />
        </div>
      </div>
    </section>
  );
}
