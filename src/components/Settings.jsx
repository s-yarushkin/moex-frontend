import { useState } from 'react';
import { TICKERS, INTERVALS } from '../api/moex';

export default function Settings({ settings, onSave, onClose }) {
  const [form, setForm] = useState({ ...settings });

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    onSave(form);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-head">
          <div>
            <div className="modal-title">Настройки</div>
            <div className="modal-subtitle">Стартовые тикеры, диапазон, шаг графика и live-режим.</div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body clean">
          <div className="backend-note">
            API-ключ хранится на Render backend. Во фронте ключ не нужен и не сохраняется.
          </div>

          <div className="form-grid">
            <label className="form-block">
              <span className="form-label">Левый инструмент</span>
              <select className="form-input" value={form.ticker1} onChange={(e) => updateField('ticker1', e.target.value)}>
                {TICKERS.map((item) => <option key={item.id} value={item.id}>{item.id} — {item.name}</option>)}
              </select>
            </label>

            <label className="form-block">
              <span className="form-label">Правый инструмент</span>
              <select className="form-input" value={form.ticker2} onChange={(e) => updateField('ticker2', e.target.value)}>
                {TICKERS.map((item) => <option key={item.id} value={item.id}>{item.id} — {item.name}</option>)}
              </select>
            </label>
          </div>

          <div className="form-block">
            <span className="form-label">Диапазон по умолчанию</span>
            <div className="segmented-row">
              {['1D', '1W', '1M', '3M', '6M', '1Y'].map((item) => (
                <button
                  key={item}
                  className={`segment-btn ${form.defaultRange === item ? 'active' : ''}`}
                  onClick={() => updateField('defaultRange', item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="form-block">
            <span className="form-label">Шаг графика по умолчанию</span>
            <div className="segmented-row">
              {INTERVALS.map((item) => (
                <button
                  key={item.id}
                  className={`segment-btn ${form.defaultInterval === item.id ? 'active' : ''}`}
                  onClick={() => updateField('defaultInterval', item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-block">
            <span className="form-label">Интервал автообновления</span>
            <div className="segmented-row">
              {[60, 120, 300, 600].map((value) => (
                <button
                  key={value}
                  className={`segment-btn ${form.refreshInterval === value ? 'active' : ''}`}
                  onClick={() => updateField('refreshInterval', value)}
                >
                  {value >= 60 ? `${value / 60}м` : `${value}с`}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="ghost-button" onClick={onClose}>Отмена</button>
          <button className="primary-button" onClick={handleSave}>Сохранить</button>
        </div>
      </div>
    </div>
  );
}
