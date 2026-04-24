import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Header from './components/Header';
import Settings from './components/Settings';
import GlobalControls from './components/GlobalControls';
import InstrumentPanel from './components/InstrumentPanel';
import DataTable from './components/DataTable';
import { fetchFutOI, processRows, getRange, loadSettings, saveSettings, autoIntervalForRange } from './api/moex';

async function loadOne({ ticker, from, till, interval, onLog }) {
  const raw = await fetchFutOI({ ticker, from, till, onLog });
  const chart = processRows(raw, interval);
  return { raw, chart };
}

function calcRange(preset, customFrom, customTill) {
  if (preset === 'custom') {
    return { from: customFrom, till: customTill };
  }
  return getRange(preset);
}

function defaultIntervalForPreset(preset) {
  if (preset === '1D') return '5M';
  if (preset === '1W') return '15M';
  if (preset === '1M') return '1H';
  return '1D';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function App() {
  const [settings, setSettings] = useState(() => loadSettings());
  const [showSettings, setShowSettings] = useState(false);
  const [liveMode, setLiveMode] = useState(() => loadSettings().liveMode ?? false);

  const initRange = useMemo(() => getRange(settings.defaultRange), [settings.defaultRange]);
  const [preset, setPreset] = useState(settings.defaultRange);
  const [interval, setInterval] = useState(settings.defaultInterval || defaultIntervalForPreset(settings.defaultRange));
  const [customFrom, setCustomFrom] = useState(initRange.from);
  const [customTill, setCustomTill] = useState(initRange.till);
  const [ticker1, setTicker1] = useState(settings.ticker1);
  const [ticker2, setTicker2] = useState(settings.ticker2);

  const empty = { raw: [], chart: [], loading: false, error: null };
  const [state1, setState1] = useState(empty);
  const [state2, setState2] = useState(empty);
  const [apiLog, setApiLog] = useState([]);
  const genRef = useRef(0);

  function handlePreset(nextPreset) {
    setPreset(nextPreset);
    setInterval(defaultIntervalForPreset(nextPreset));
    if (nextPreset !== 'custom') {
      const { from, till } = getRange(nextPreset);
      setCustomFrom(from);
      setCustomTill(till);
    }
  }

  const loadAll = useCallback(async () => {
    const { from, till } = calcRange(preset, customFrom, customTill);
    const gen = ++genRef.current;

    setState1((s) => ({ ...s, loading: true, error: null }));
    setState2((s) => ({ ...s, loading: true, error: null }));
    setApiLog([]);

    const mkLog = (ticker) => (entry) => setApiLog((prev) => [...prev, { ...entry, ticker }]);

    // Загружаем последовательно, а не одновременно: Render free + MOEX иногда
    // отдают transient fetch failed при параллельных запросах, особенно на BR.
    const r1 = await loadOne({ ticker: ticker1, from, till, interval, onLog: mkLog(ticker1) })
      .then((value) => ({ status: 'fulfilled', value }))
      .catch((reason) => ({ status: 'rejected', reason }));

    await sleep(450);

    const r2 = await loadOne({ ticker: ticker2, from, till, interval, onLog: mkLog(ticker2) })
      .then((value) => ({ status: 'fulfilled', value }))
      .catch((reason) => ({ status: 'rejected', reason }));

    if (genRef.current !== gen) return;

    setState1({
      loading: false,
      error: r1.status === 'rejected' ? r1.reason.message : null,
      raw: r1.status === 'fulfilled' ? r1.value.raw : [],
      chart: r1.status === 'fulfilled' ? r1.value.chart : [],
    });

    setState2({
      loading: false,
      error: r2.status === 'rejected' ? r2.reason.message : null,
      raw: r2.status === 'fulfilled' ? r2.value.raw : [],
      chart: r2.status === 'fulfilled' ? r2.value.chart : [],
    });
  }, [ticker1, ticker2, preset, customFrom, customTill, interval]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const loading = state1.loading || state2.loading;

  function handleSaveSettings(nextSettings) {
    const cleanSettings = { ...nextSettings };
    delete cleanSettings.apiKey;
    setSettings(cleanSettings);
    saveSettings(cleanSettings);
    setTicker1(cleanSettings.ticker1);
    setTicker2(cleanSettings.ticker2);
    setPreset(cleanSettings.defaultRange);
    setInterval(cleanSettings.defaultInterval || defaultIntervalForPreset(cleanSettings.defaultRange));
    const { from, till } = getRange(cleanSettings.defaultRange);
    setCustomFrom(from);
    setCustomTill(till);
    setLiveMode(Boolean(cleanSettings.liveMode));
  }

  function handleLiveToggle() {
    const nextLiveMode = !liveMode;
    setLiveMode(nextLiveMode);
    const nextSettings = { ...settings, liveMode: nextLiveMode };
    setSettings(nextSettings);
    saveSettings(nextSettings);
  }

  return (
    <div className="app-shell">
      <Header
        liveMode={liveMode}
        onToggleLive={handleLiveToggle}
        refreshInterval={settings.refreshInterval}
        onRefreshFire={loadAll}
        onSettingsOpen={() => setShowSettings(true)}
        apiLog={apiLog}
        loading={loading}
        ticker1={ticker1}
        ticker2={ticker2}
      />

      {showSettings && (
        <Settings
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      <main className="page">
        <GlobalControls
          from={customFrom}
          till={customTill}
          preset={preset}
          interval={interval}
          onFromChange={(value) => {
            setCustomFrom(value);
            setPreset('custom');
            setInterval(autoIntervalForRange(value, customTill, interval));
          }}
          onTillChange={(value) => {
            setCustomTill(value);
            setPreset('custom');
            setInterval(autoIntervalForRange(customFrom, value, interval));
          }}
          onPresetChange={handlePreset}
          onIntervalChange={setInterval}
          onRefresh={loadAll}
          loading={loading}
        />

        <section className="panels-grid">
          <InstrumentPanel
            title="Инструмент 1"
            ticker={ticker1}
            onTickerChange={setTicker1}
            data={state1.chart}
            loading={state1.loading}
            error={state1.error}
            syncId="moex-oi-global"
          />

          <InstrumentPanel
            title="Инструмент 2"
            ticker={ticker2}
            onTickerChange={setTicker2}
            data={state2.chart}
            loading={state2.loading}
            error={state2.error}
            syncId="moex-oi-global"
          />
        </section>

        <DataTable rows1={state1.raw} ticker1={ticker1} rows2={state2.raw} ticker2={ticker2} />
      </main>
    </div>
  );
}
