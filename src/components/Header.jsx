import { useMemo, useState } from 'react';
import { useLiveCountdown } from '../hooks/useTimer';

function calcStatus(apiLog, loading) {
  if (loading) return 'loading';
  if (!apiLog.length) return 'idle';
  const hasCors = apiLog.some((e) => e.status === 'cors');
  const hasErr = apiLog.some((e) => e.status === 'error');
  const hasOk = apiLog.some((e) => e.status === 'ok' && e.rows > 2);
  const hasWarn = apiLog.some((e) => e.status === 'ok' && e.rows <= 2);
  if (hasCors) return 'cors';
  if (hasErr && !hasOk) return 'err';
  if (hasOk) return 'ok';
  if (hasWarn) return 'warn';
  return 'err';
}

const STATUS_LABEL = {
  ok: 'Данные загружены',
  warn: 'Мало данных',
  err: 'Ошибка API',
  cors: 'CORS / нужен proxy',
  idle: 'Нет запросов',
  loading: 'Загрузка…',
};

export default function Header({
  liveMode,
  onToggleLive,
  refreshInterval,
  onRefreshFire,
  onSettingsOpen,
  apiLog,
  loading,
  ticker1,
  ticker2,
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const countdown = useLiveCountdown(refreshInterval, liveMode, onRefreshFire);
  const status = calcStatus(apiLog, loading);
  const mm = String(Math.floor(countdown / 60)).padStart(2, '0');
  const ss = String(countdown % 60).padStart(2, '0');

  const groupedLog = useMemo(
    () => apiLog.reduce((acc, entry) => {
      const key = entry.ticker ?? '?';
      acc[key] = acc[key] || [];
      acc[key].push(entry);
      return acc;
    }, {}),
    [apiLog],
  );

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <div className="brand-mark">OI</div>
          <div className="brand-copy">
            <div className="brand-kicker">Open Interest Observatory</div>
            <div className="brand-title-row">
              <div className="brand-title">MOEX OI</div>
              <div className="brand-route">{ticker1} / {ticker2}</div>
            </div>
            <div className="brand-subtitle">Синхронное сравнение позиций и поведения участников по фьючерсам MOEX</div>
          </div>
        </div>

        <div className="topbar-center">
          <button className="status-pill" onClick={() => setDrawerOpen((v) => !v)}>
            <span className={`status-dot ${status}`} />
            <span>{STATUS_LABEL[status]}</span>
          </button>
        </div>

        <div className="topbar-right">
          <button className={`live-pill ${liveMode ? 'on' : ''}`} onClick={onToggleLive}>
            <span className="live-dot" />
            {liveMode ? `LIVE ${mm}:${ss}` : 'LIVE OFF'}
          </button>
          <button className="ghost-button" onClick={onSettingsOpen}>Настройки</button>
        </div>
      </header>

      <div className={`api-panel ${drawerOpen ? 'open' : ''}`}>
        <div className="api-panel-inner">
          {!apiLog.length && <div className="api-muted">Пока нет диагностических записей.</div>}

          {Object.entries(groupedLog).map(([ticker, entries]) => (
            <div className="api-block" key={ticker}>
              <div className="api-block-title">{ticker}</div>
              {entries.map((entry, index) => (
                <div className="api-row" key={`${ticker}-${index}`}>
                  <span className={`api-row-dot ${entry.status === 'ok' ? 'ok' : entry.status === 'cors' ? 'cors' : entry.status === 'empty' ? 'warn' : 'err'}`} />
                  <span className="api-row-label">{entry.label}</span>
                  {entry.rows ? <span className="api-row-meta">{entry.rows} строк</span> : null}
                  {entry.message ? <span className="api-row-message">{entry.message}</span> : null}
                </div>
              ))}
            </div>
          ))}

          {apiLog.some((e) => e.status === 'cors') && (
            <div className="api-hint">
              Для live-доступа с API-ключом запускай проект через <code>npm run dev</code> или через собственный backend proxy.
              При статическом хостинге браузер режет прямые запросы к <code>apim.moex.com</code>.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
