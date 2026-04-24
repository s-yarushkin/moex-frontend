const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || 'https://moex-backend.onrender.com';

function parseISS(json, table) {
  if (!json || !json[table]) return [];

  const { columns, data } = json[table];
  if (!columns || !data) return [];

  return data.map((row) => {
    const obj = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function backendFetch(url, retries = 4) {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      const text = await res.text();

      if (!res.ok) {
        lastError = new Error(`HTTP ${res.status}: ${text}`);
        if (res.status >= 500 && attempt < retries) {
          await wait(700 * attempt);
          continue;
        }
        throw lastError;
      }

      try {
        return JSON.parse(text);
      } catch {
        throw new Error(`Некорректный JSON: ${text}`);
      }
    } catch (e) {
      lastError = e;
      if (attempt < retries) {
        await wait(700 * attempt);
        continue;
      }
    }
  }

  throw lastError;
}

export async function fetchFutOI({ ticker, from, till, onLog }) {
  const normalizedTicker = String(ticker || '').trim().toUpperCase();

  const params = new URLSearchParams({
    ticker: normalizedTicker,
    from,
    till,
  });

  const url = `${BACKEND_URL}/api/futoi?${params.toString()}`;

  try {
    console.log('REQUEST:', url);
    onLog?.({ label: 'render backend', status: 'start', url });

    const raw = await backendFetch(url, 4);
    const rows = parseISS(raw, 'futoi');

    onLog?.({
      label: 'render backend',
      status: rows.length ? 'ok' : 'empty',
      rows: rows.length,
      url,
    });

    if (!rows.length) {
      throw new Error(`Нет данных для «${normalizedTicker}» за ${from}—${till}.`);
    }

    return rows;
  } catch (err) {
    onLog?.({
      label: 'render backend',
      status: 'error',
      url,
      message: err.message,
    });
    throw err;
  }
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function normalizeTime(time) {
  const parts = String(time || '00:00:00').split(':').map((v) => Number(v));
  return {
    h: Number.isFinite(parts[0]) ? parts[0] : 0,
    m: Number.isFinite(parts[1]) ? parts[1] : 0,
    s: Number.isFinite(parts[2]) ? parts[2] : 0,
  };
}

function makeTs(date, time) {
  const { h, m, s } = normalizeTime(time);
  return new Date(`${date}T${pad2(h)}:${pad2(m)}:${pad2(s)}`).getTime();
}

function bucketInfo(date, time, interval) {
  const { h, m } = normalizeTime(time);

  if (interval === '1D') {
    return {
      key: date,
      label: date.slice(5),
      tooltipLabel: date,
      sortKey: `${date} 23:59:59`,
      ts: new Date(`${date}T23:59:59`).getTime(),
    };
  }

  if (interval === '1H') {
    return {
      key: `${date} ${pad2(h)}:00`,
      label: `${date.slice(5)} ${pad2(h)}:00`,
      tooltipLabel: `${date} ${pad2(h)}:00`,
      sortKey: `${date} ${pad2(h)}:00:00`,
      ts: new Date(`${date}T${pad2(h)}:00:00`).getTime(),
    };
  }

  const step = interval === '15M' ? 15 : 5;
  const minutes = Math.floor(m / step) * step;
  return {
    key: `${date} ${pad2(h)}:${pad2(minutes)}`,
    label: `${date.slice(5)} ${pad2(h)}:${pad2(minutes)}`,
    tooltipLabel: `${date} ${pad2(h)}:${pad2(minutes)}`,
    sortKey: `${date} ${pad2(h)}:${pad2(minutes)}:00`,
    ts: new Date(`${date}T${pad2(h)}:${pad2(minutes)}:00`).getTime(),
  };
}

export function processRows(rows, interval = '1D') {
  const byBucket = {};

  for (const r of rows || []) {
    const date = String(r.tradedate ?? '');
    const time = String(r.tradetime ?? '');
    const grp = String(r.clgroup ?? '').toLowerCase();

    if (!date || !grp) continue;

    const bucket = bucketInfo(date, time, interval);
    const rowTs = makeTs(date, time);

    if (!byBucket[bucket.key]) {
      byBucket[bucket.key] = {
        key: bucket.key,
        sortKey: bucket.sortKey,
        ts: bucket.ts,
        date,
        time,
        label: bucket.label,
        tooltipLabel: bucket.tooltipLabel,
        _latest: {},
      };
    }

    const current = byBucket[bucket.key];
    const previousLatestForGroup = current._latest[grp];

    if (!previousLatestForGroup || rowTs >= previousLatestForGroup) {
      current._latest[grp] = rowTs;
      current.date = date;
      current.time = time;
      current[`${grp}_long`] = Number(r.pos_long ?? 0);
      current[`${grp}_short`] = Number(r.pos_short ?? 0);
      current[`${grp}_long_num`] = Number(r.pos_long_num ?? 0);
      current[`${grp}_short_num`] = Number(r.pos_short_num ?? 0);
      current[`${grp}_pos`] = Number(r.pos ?? 0);
    }
  }

  return Object.values(byBucket)
    .map(({ _latest, ...item }) => item)
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}

export const LINE_CFG = {
  fiz_long: {
    label: 'Физ · Long',
    side: 'Физлица',
    direction: 'Long',
    color: '#48f0ff',
    dash: '',
    opacity: 1,
    width: 3.4,
  },
  fiz_short: {
    label: 'Физ · Short',
    side: 'Физлица',
    direction: 'Short',
    color: '#9fe8ff',
    dash: '6 6',
    opacity: 0.72,
    width: 2.1,
  },
  yur_long: {
    label: 'Юр · Long',
    side: 'Юрлица',
    direction: 'Long',
    color: '#ff8a5b',
    dash: '',
    opacity: 1,
    width: 3.4,
  },
  yur_short: {
    label: 'Юр · Short',
    side: 'Юрлица',
    direction: 'Short',
    color: '#ffc19a',
    dash: '6 6',
    opacity: 0.72,
    width: 2.1,
  },
  fiz_long_num: {
    label: 'Физ · Long',
    side: 'Физлица',
    direction: 'Long',
    color: '#48f0ff',
    dash: '',
    opacity: 1,
    width: 3.4,
  },
  fiz_short_num: {
    label: 'Физ · Short',
    side: 'Физлица',
    direction: 'Short',
    color: '#9fe8ff',
    dash: '6 6',
    opacity: 0.72,
    width: 2.1,
  },
  yur_long_num: {
    label: 'Юр · Long',
    side: 'Юрлица',
    direction: 'Long',
    color: '#ff8a5b',
    dash: '',
    opacity: 1,
    width: 3.4,
  },
  yur_short_num: {
    label: 'Юр · Short',
    side: 'Юрлица',
    direction: 'Short',
    color: '#ffc19a',
    dash: '6 6',
    opacity: 0.72,
    width: 2.1,
  },
};

export const TICKERS = [
  { id: 'NG', name: 'Природный газ' },
  { id: 'BR', name: 'Brent' },
  { id: 'SI', name: 'USD/RUB' },
  { id: 'RI', name: 'RTS' },
  { id: 'MX', name: 'IMOEX' },
  { id: 'GD', name: 'Золото' },
  { id: 'SR', name: 'Сбер' },
  { id: 'LK', name: 'Лукойл' },
  { id: 'GZ', name: 'Газпром' },
  { id: 'EU', name: 'EUR/RUB' },
  { id: 'YN', name: 'CNY/RUB' },
  { id: 'NM', name: 'Норникель' },
  { id: 'RN', name: 'Роснефть' },
  { id: 'VI', name: 'RVI' },
  { id: 'AF', name: 'Алроса' },
];

const LS_KEY = 'moex_oi_settings';

export const DEFAULT_SETTINGS = {
  ticker1: 'NG',
  ticker2: 'BR',
  defaultRange: '1D',
  defaultInterval: '5M',
  liveMode: false,
  refreshInterval: 300,
};

export function loadSettings() {
  try {
    const stored = localStorage.getItem(LS_KEY);
    return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(LS_KEY, JSON.stringify(settings));
}

export const PRESETS = ['1D', '1W', '1M', '3M', '6M', '1Y'];

export const INTERVALS = [
  { id: '5M', label: '5м', description: 'каждые 5 минут' },
  { id: '15M', label: '15м', description: 'каждые 15 минут' },
  { id: '1H', label: '1ч', description: 'каждый час' },
  { id: '1D', label: '1д', description: 'каждый день' },
];

export function getRange(preset) {
  const till = new Date();
  const from = new Date();

  switch (preset) {
    case '1D':
      from.setDate(from.getDate() - 1);
      break;
    case '1W':
      from.setDate(from.getDate() - 7);
      break;
    case '1M':
      from.setMonth(from.getMonth() - 1);
      break;
    case '3M':
      from.setMonth(from.getMonth() - 3);
      break;
    case '6M':
      from.setMonth(from.getMonth() - 6);
      break;
    case '1Y':
      from.setFullYear(from.getFullYear() - 1);
      break;
    default:
      from.setDate(from.getDate() - 1);
  }

  return {
    from: toDate(from),
    till: toDate(till),
  };
}

export function daysBetween(from, till) {
  const a = new Date(`${from}T00:00:00`).getTime();
  const b = new Date(`${till}T00:00:00`).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86400000));
}

export function autoIntervalForRange(from, till, fallback = '5M') {
  const days = daysBetween(from, till);
  if (days <= 2) return '5M';
  if (days <= 10) return '15M';
  if (days <= 45) return '1H';
  return fallback || '1D';
}

export function toDate(d) {
  return d.toISOString().split('T')[0];
}

export function fmt(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return Number(n).toLocaleString('ru-RU');
}

export function fmtFull(n) {
  return n == null || Number.isNaN(Number(n)) ? '—' : Number(n).toLocaleString('ru-RU');
}

export function exportCSV(rows, ticker) {
  if (!rows.length) return;

  const cols = Object.keys(rows[0]);
  const csv = [
    cols.join(','),
    ...rows.map((r) => cols.map((c) => r[c] ?? '').join(',')),
  ].join('\n');

  const url = URL.createObjectURL(
    new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
  );

  const a = document.createElement('a');
  a.href = url;
  a.download = `futoi_${ticker}_${toDate(new Date())}.csv`;
  a.click();

  URL.revokeObjectURL(url);
}
