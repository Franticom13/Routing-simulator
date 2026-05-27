// nastavení panel — dropdown pod settings tlačítkem
// pozadí, rychlost animací, snap to grid, zobrazit metriky
// zavře se kliknutím ven nebo Escape klávesou

import { useEffect, useRef } from 'react';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  background: string; // 'none' | 'dots' | 'lines' | 'cross'
  onBackgroundChange: (bg: string) => void;
  animationSpeed: number; // 0.2 az 2
  onAnimationSpeedChange: (speed: number) => void;
  snapToGrid: boolean;
  onSnapToGridChange: (snap: boolean) => void;
  showMetrics: boolean;
  onShowMetricsChange: (show: boolean) => void;
}

// možnosti pozadí
const BACKGROUND_OPTIONS = [
  { value: 'none', label: 'Žádné' },
  { value: 'dots', label: 'Tečky' },
  { value: 'lines', label: 'Čáry' },
  { value: 'cross', label: 'Kříže' },
];

export function SettingsPanel({
  isOpen,
  onClose,
  background,
  onBackgroundChange,
  animationSpeed,
  onAnimationSpeedChange,
  snapToGrid,
  onSnapToGridChange,
  showMetrics,
  onShowMetricsChange,
}: SettingsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // zavreni kliknutim mimo panel
  useEffect(function () {
    if (!isOpen) {
      return;
    }

    function handleDocumentClick(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        // ignorovat klik na settings tlacitko (to si resi toggle sam)
        const target = event.target as HTMLElement;
        if (target.closest('.settings-trigger')) {
          return;
        }
        onClose();
      }
    }

    // zpozdit registraci aby se nechytil klik co otevrel panel
    var timerId = setTimeout(function () {
      document.addEventListener('mousedown', handleDocumentClick, true);
    }, 10);

    return function () {
      clearTimeout(timerId);
      document.removeEventListener('mousedown', handleDocumentClick, true);
    };
  }, [isOpen, onClose]);

  // zavreni Escape klavesou
  useEffect(function () {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return function () {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  // formátování rychlosti pro zobrazení
  var speedDisplay = animationSpeed.toFixed(1) + 'x';

  return (
    <div className="settings-panel" ref={panelRef}>
      {/* sekce: pozadí */}
      <div className="settings-section">
        <div className="settings-label">Pozadí</div>
        <div className="settings-bg-options">
          {BACKGROUND_OPTIONS.map(function (option) {
            var isActive = background === option.value;
            return (
              <button
                key={option.value}
                className={isActive ? 'settings-bg-pill active' : 'settings-bg-pill'}
                onClick={function () { onBackgroundChange(option.value); }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="settings-divider" />

      {/* sekce: rychlost animací */}
      <div className="settings-section">
        <div className="settings-label">Rychlost animací</div>
        <div className="settings-speed-row">
          <input
            type="range"
            className="settings-slider"
            min="0.2"
            max="2"
            step="0.1"
            value={animationSpeed}
            onChange={function (e) { onAnimationSpeedChange(parseFloat(e.target.value)); }}
          />
          <span className="settings-speed-value">{speedDisplay}</span>
        </div>
      </div>

      <div className="settings-divider" />

      {/* sekce: snap to grid */}
      <div className="settings-section">
        <div className="settings-toggle-row">
          <span className="settings-toggle-label">Snap to grid</span>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={snapToGrid}
              onChange={function (e) { onSnapToGridChange(e.target.checked); }}
            />
            <span className="settings-toggle-track" />
          </label>
        </div>
      </div>

      <div className="settings-divider" />

      {/* sekce: zobrazit metriky */}
      <div className="settings-section">
        <div className="settings-toggle-row">
          <span className="settings-toggle-label">Zobrazit metriky</span>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={showMetrics}
              onChange={function (e) { onShowMetricsChange(e.target.checked); }}
            />
            <span className="settings-toggle-track" />
          </label>
        </div>
      </div>
    </div>
  );
}
