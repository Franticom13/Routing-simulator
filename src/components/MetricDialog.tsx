// MetricDialog — modal pro zadani metriky pri propojeni dvou routeru
// zobrazi se po kliknuti na "propojit" a vyberu dvou routeru

import React, { useState } from 'react';
import { CheckIcon } from './Icons';

interface MetricDialogProps {
  isOpen: boolean;
  sourceName: string;
  targetName: string;
  defaultValue?: number;
  onConfirm: (metric: number) => void;
  onCancel: () => void;
}

export function MetricDialog({
  isOpen,
  sourceName,
  targetName,
  defaultValue,
  onConfirm,
  onCancel,
}: MetricDialogProps) {
  const [metricValue, setMetricValue] = useState(String(defaultValue || 1));

  // aktualizovat hodnotu kdyz se dialog otevre s novou defaultValue
  React.useEffect(function () {
    if (isOpen) {
      setMetricValue(String(defaultValue || 1));
    }
  }, [isOpen, defaultValue]);

  if (!isOpen) {
    return null;
  }

  // handler pro potvrzeni
  function handleConfirm() {
    const metric = parseInt(metricValue, 10);
    if (isNaN(metric) || metric < 1) {
      return;
    }
    onConfirm(metric);
    setMetricValue('1');
  }

  // handler pro stisk Enter
  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Enter') {
      handleConfirm();
    }
    if (event.key === 'Escape') {
      onCancel();
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(28, 25, 23, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.15s ease',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'var(--bg)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          boxShadow: 'var(--shadow-lg)',
          minWidth: '300px',
          animation: 'scaleIn 0.2s ease',
        }}
        onClick={function (e) { e.stopPropagation(); }}
      >
        <div style={{
          fontSize: '15px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: '16px',
        }}>
          Metrika propoje
        </div>

        <div style={{
          fontSize: '13px',
          color: 'var(--text-secondary)',
          marginBottom: '12px',
        }}>
          {sourceName} → {targetName}
        </div>

        <label className="input-label">Metrika (cena linky)</label>
        <input
          className="input input-mono"
          type="number"
          min="1"
          max="100"
          value={metricValue}
          onChange={function (e) { setMetricValue(e.target.value); }}
          onKeyDown={handleKeyDown}
          autoFocus
        />

        <div style={{
          display: 'flex',
          gap: '8px',
          marginTop: '16px',
          justifyContent: 'flex-end',
        }}>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>
            Zrušit
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleConfirm}>
            <CheckIcon size={12} />
            Potvrdit
          </button>
        </div>
      </div>
    </div>
  );
}
