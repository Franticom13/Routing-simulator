// RenameDialog — custom modal pro prejmenování routeru
// nahrazuje window.prompt()

import React, { useState, useEffect } from 'react';
import { CheckIcon } from './Icons';

interface RenameDialogProps {
  isOpen: boolean;
  currentName: string;
  onConfirm: (newName: string) => void;
  onCancel: () => void;
}

export function RenameDialog({
  isOpen,
  currentName,
  onConfirm,
  onCancel,
}: RenameDialogProps) {
  const [nameValue, setNameValue] = useState(currentName);

  // synchronizovat s aktualnim nazvem pri otevreni
  useEffect(function syncName() {
    if (isOpen) {
      setNameValue(currentName);
    }
  }, [isOpen, currentName]);

  if (!isOpen) {
    return null;
  }

  // handler pro potvrzeni
  function handleConfirm() {
    const trimmed = nameValue.trim();
    if (trimmed === '') {
      return;
    }
    onConfirm(trimmed);
  }

  // handler pro stisk Enter / Escape
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
          Přejmenovat router
        </div>

        <label className="input-label">Nový název</label>
        <input
          className="input"
          type="text"
          value={nameValue}
          onChange={function (e) { setNameValue(e.target.value); }}
          onKeyDown={handleKeyDown}
          autoFocus
          spellCheck={false}
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
