import { useState, useMemo } from 'react';
import { fmtFull, exportCSV } from '../api/moex';

const PAGE = 25;

const COLS = [
  { key: 'ticker',        label: 'Тикер',        cls: 'left' },
  { key: 'tradedate',     label: 'Дата',         cls: 'left' },
  { key: 'tradetime',     label: 'Время',        cls: 'left' },
  { key: 'clgroup',       label: 'Группа',       cls: 'left' },
  { key: 'pos_long',      label: 'Лонг',         cls: '' },
  { key: 'pos_short',     label: 'Шорт',         cls: '' },
  { key: 'pos_long_num',  label: 'Лонг (лиц)',   cls: '' },
  { key: 'pos_short_num', label: 'Шорт (лиц)',   cls: '' },
];

export default function DataTable({ rows1, ticker1, rows2, ticker2 }) {
  const [sortKey, setSortKey]     = useState('tradedate');
  const [sortDir, setSortDir]     = useState('desc');
  const [groupF,  setGroupF]      = useState('all');
  const [tickerF, setTickerF]     = useState('all');
  const [page, setPage]           = useState(1);

  const allRows = useMemo(() => [
    ...(rows1 ?? []).map(r => ({ ...r, ticker: ticker1 })),
    ...(rows2 ?? []).map(r => ({ ...r, ticker: ticker2 })),
  ], [rows1, rows2, ticker1, ticker2]);

  function sortRows(rows) {
    return [...rows].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
    setPage(1);
  }

  const filtered = useMemo(() => {
    let rows = allRows;
    if (groupF  !== 'all') rows = rows.filter(r => r.clgroup === groupF);
    if (tickerF !== 'all') rows = rows.filter(r => r.ticker  === tickerF);
    return sortRows(rows);
  }, [allRows, groupF, tickerF, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE);
  const pageRows   = filtered.slice((page - 1) * PAGE, page * PAGE);

  function renderGroup(g) {
    return g === 'fiz' ? <span className="c-fiz">Физ</span>
         : g === 'yur' ? <span className="c-yur">Юр</span>
         : g;
  }
  function ind(key) { return sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕'; }

  return (
    <div className="table-wrap">
      <div className="table-head">
        <span className="table-title">ДАННЫЕ · {filtered.length} строк</span>
        <div className="table-actions">
          <div className="tbl-filter">
            {[['all','Все'],['fiz','Физ'],['yur','Юр']].map(([v,l]) => (
              <button key={v} className={`tf-btn ${groupF===v?'active':''}`}
                onClick={() => { setGroupF(v); setPage(1); }}>{l}</button>
            ))}
          </div>

          {ticker2 && (
            <div className="tbl-filter">
              {[['all','Оба'],[ticker1,ticker1],[ticker2,ticker2]].map(([v,l]) => (
                <button key={v} className={`tf-btn ${tickerF===v?'active':''}`}
                  onClick={() => { setTickerF(v); setPage(1); }}>{l}</button>
              ))}
            </div>
          )}

          <button className="csv-btn"
            onClick={() => exportCSV(filtered, `${ticker1}_${ticker2 ?? ''}`)}
            disabled={!filtered.length}
          >
            ↓ CSV
          </button>
        </div>
      </div>

      <div className="tbl-scroll">
        <table className="data-tbl">
          <thead>
            <tr>
              {COLS.map(c => (
                <th key={c.key} className={c.cls} onClick={() => handleSort(c.key)}>
                  {c.label}{ind(c.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r, i) => (
              <tr key={i}>
                <td className={`left c-ticker`}>{r.ticker}</td>
                <td className="left">{r.tradedate}</td>
                <td className="left">{r.tradetime?.slice(0,5)}</td>
                <td className="left">{renderGroup(r.clgroup)}</td>
                <td className="c-long">{fmtFull(r.pos_long)}</td>
                <td className="c-short">{fmtFull(r.pos_short)}</td>
                <td>{fmtFull(r.pos_long_num)}</td>
                <td>{fmtFull(r.pos_short_num)}</td>
              </tr>
            ))}
            {!pageRows.length && (
              <tr><td colSpan={8} style={{ textAlign:'center', color:'var(--dim)', padding: 28 }}>
                Нет данных
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="tbl-page">
          <span>Стр. {page} / {totalPages}</span>
          <div className="pg-btns">
            <button className="pg-btn" onClick={() => setPage(1)} disabled={page===1}>«</button>
            <button className="pg-btn" onClick={() => setPage(p=>p-1)} disabled={page===1}>‹</button>
            {Array.from({length: Math.min(5, totalPages)}, (_,i) => {
              const s = Math.max(1, Math.min(page-2, totalPages-4));
              const p = s + i;
              return <button key={p} className={`pg-btn ${p===page?'active':''}`} onClick={() => setPage(p)}>{p}</button>;
            })}
            <button className="pg-btn" onClick={() => setPage(p=>p+1)} disabled={page===totalPages}>›</button>
            <button className="pg-btn" onClick={() => setPage(totalPages)} disabled={page===totalPages}>»</button>
          </div>
        </div>
      )}
    </div>
  );
}
