import { PRESETS, INTERVALS } from '../api/moex';

export default function GlobalControls({
  from,
  till,
  preset,
  interval,
  onFromChange,
  onTillChange,
  onPresetChange,
  onIntervalChange,
  onRefresh,
  loading,
}) {
  return (
    <section className="controls-bar">
      <div className="controls-main controls-main-wide">
        <div className="control-group-inline">
          <span className="control-caption">Диапазон</span>
          <div className="preset-tabs" role="tablist" aria-label="Диапазон">
            {PRESETS.map((item) => (
              <button
                key={item}
                className={`preset-tab ${preset === item ? 'active' : ''}`}
                onClick={() => onPresetChange(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="control-group-inline">
          <span className="control-caption">Шаг</span>
          <div className="preset-tabs compact" role="tablist" aria-label="Шаг графика">
            {INTERVALS.map((item) => (
              <button
                key={item.id}
                className={`preset-tab interval-tab ${interval === item.id ? 'active' : ''}`}
                onClick={() => onIntervalChange(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="date-range-inline">
          <input
            type="date"
            className="date-input"
            value={from}
            max={till}
            onChange={(e) => onFromChange(e.target.value)}
          />
          <span className="date-dash">—</span>
          <input
            type="date"
            className="date-input"
            value={till}
            min={from}
            onChange={(e) => onTillChange(e.target.value)}
          />
        </div>
      </div>

      <button className="ghost-button refresh-button" onClick={onRefresh} disabled={loading}>
        <span className={loading ? 'spin' : ''}>↻</span>
        {loading ? 'Обновление' : 'Обновить'}
      </button>
    </section>
  );
}
