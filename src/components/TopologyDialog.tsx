// TopologyDialog — overlay s backdrop blur
// umožňuje export/import topologie a výběr z předdefinovaných topologií
// mini preview zobrazuje SVG náhled (kolečka + čáry)

import React, { useState, useRef, useEffect } from 'react';
import { ExportIcon, ImportIcon } from './Icons';

// typ pro předdefinovanou topologii
interface PresetTopology {
  name: string;
  description: string;
  routers: { id: string; label: string; position: { x: number; y: number } }[];
  links: { source: string; target: string; metric: number }[];
}

// 6 předdefinovaných topologií
const PRESET_TOPOLOGIES: PresetTopology[] = [
  {
    name: 'Hvězda',
    description: '1 centrální router připojený ke 4 okolním',
    routers: [
      { id: 'r1', label: 'Router A', position: { x: 400, y: 250 } },
      { id: 'r2', label: 'Router B', position: { x: 400, y: 50 } },
      { id: 'r3', label: 'Router C', position: { x: 600, y: 250 } },
      { id: 'r4', label: 'Router D', position: { x: 400, y: 450 } },
      { id: 'r5', label: 'Router E', position: { x: 200, y: 250 } },
    ],
    links: [
      { source: 'r1', target: 'r2', metric: 1 },
      { source: 'r1', target: 'r3', metric: 1 },
      { source: 'r1', target: 'r4', metric: 1 },
      { source: 'r1', target: 'r5', metric: 1 },
    ],
  },
  {
    name: 'Kruh',
    description: '6 routerů v kruhovém zapojení',
    routers: [
      { id: 'r1', label: 'Router A', position: { x: 400, y: 60 } },
      { id: 'r2', label: 'Router B', position: { x: 600, y: 170 } },
      { id: 'r3', label: 'Router C', position: { x: 600, y: 370 } },
      { id: 'r4', label: 'Router D', position: { x: 400, y: 480 } },
      { id: 'r5', label: 'Router E', position: { x: 200, y: 370 } },
      { id: 'r6', label: 'Router F', position: { x: 200, y: 170 } },
    ],
    links: [
      { source: 'r1', target: 'r2', metric: 1 },
      { source: 'r2', target: 'r3', metric: 1 },
      { source: 'r3', target: 'r4', metric: 1 },
      { source: 'r4', target: 'r5', metric: 1 },
      { source: 'r5', target: 'r6', metric: 1 },
      { source: 'r6', target: 'r1', metric: 1 },
    ],
  },
  {
    name: 'Mesh',
    description: '5 routerů plně propojených',
    routers: [
      { id: 'r1', label: 'Router A', position: { x: 400, y: 60 } },
      { id: 'r2', label: 'Router B', position: { x: 590, y: 200 } },
      { id: 'r3', label: 'Router C', position: { x: 520, y: 430 } },
      { id: 'r4', label: 'Router D', position: { x: 280, y: 430 } },
      { id: 'r5', label: 'Router E', position: { x: 210, y: 200 } },
    ],
    links: [
      // obvod — ruzne ceny
      { source: 'r1', target: 'r2', metric: 1 },
      { source: 'r2', target: 'r3', metric: 3 },
      { source: 'r3', target: 'r4', metric: 1 },
      { source: 'r4', target: 'r5', metric: 1 },
      { source: 'r5', target: 'r1', metric: 2 },
      // diagonaly — nektre levne, nektre drahe
      { source: 'r1', target: 'r3', metric: 3 },
      { source: 'r1', target: 'r4', metric: 6 },
      { source: 'r2', target: 'r4', metric: 2 },
      { source: 'r2', target: 'r5', metric: 5 },
      { source: 'r3', target: 'r5', metric: 4 },
    ],
  },
  {
    name: 'Lineární',
    description: '5 routerů v řadě za sebou',
    routers: [
      { id: 'r1', label: 'Router A', position: { x: 100, y: 250 } },
      { id: 'r2', label: 'Router B', position: { x: 300, y: 250 } },
      { id: 'r3', label: 'Router C', position: { x: 500, y: 250 } },
      { id: 'r4', label: 'Router D', position: { x: 700, y: 250 } },
      { id: 'r5', label: 'Router E', position: { x: 900, y: 250 } },
    ],
    links: [
      { source: 'r1', target: 'r2', metric: 1 },
      { source: 'r2', target: 'r3', metric: 2 },
      { source: 'r3', target: 'r4', metric: 1 },
      { source: 'r4', target: 'r5', metric: 3 },
    ],
  },
  {
    name: 'Strom',
    description: 'Hierarchická stromová struktura',
    routers: [
      { id: 'r1', label: 'Router A', position: { x: 400, y: 60 } },
      { id: 'r2', label: 'Router B', position: { x: 220, y: 240 } },
      { id: 'r3', label: 'Router C', position: { x: 580, y: 240 } },
      { id: 'r4', label: 'Router D', position: { x: 60, y: 440 } },
      { id: 'r5', label: 'Router E', position: { x: 300, y: 440 } },
      { id: 'r6', label: 'Router F', position: { x: 500, y: 440 } },
      { id: 'r7', label: 'Router G', position: { x: 740, y: 440 } },
    ],
    links: [
      { source: 'r1', target: 'r2', metric: 1 },
      { source: 'r1', target: 'r3', metric: 1 },
      { source: 'r2', target: 'r4', metric: 2 },
      { source: 'r2', target: 'r5', metric: 2 },
      { source: 'r3', target: 'r6', metric: 2 },
      { source: 'r3', target: 'r7', metric: 2 },
    ],
  },
  {
    name: 'Dual ring',
    description: 'Dva propojené kruhy — redundantní síť',
    routers: [
      { id: 'r1', label: 'Router A', position: { x: 200, y: 100 } },
      { id: 'r2', label: 'Router B', position: { x: 400, y: 100 } },
      { id: 'r3', label: 'Router C', position: { x: 400, y: 300 } },
      { id: 'r4', label: 'Router D', position: { x: 200, y: 300 } },
      { id: 'r5', label: 'Router E', position: { x: 600, y: 100 } },
      { id: 'r6', label: 'Router F', position: { x: 600, y: 300 } },
    ],
    links: [
      { source: 'r1', target: 'r2', metric: 1 },
      { source: 'r2', target: 'r3', metric: 1 },
      { source: 'r3', target: 'r4', metric: 1 },
      { source: 'r4', target: 'r1', metric: 1 },
      { source: 'r2', target: 'r5', metric: 2 },
      { source: 'r5', target: 'r6', metric: 1 },
      { source: 'r6', target: 'r3', metric: 2 },
    ],
  },
];

interface TopologyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: () => void;
  onImport: (json: string) => void;
  onLoadPreset: (preset: PresetTopology) => void;
}

// mini SVG náhled topologie
function TopologyPreview({ topology }: { topology: PresetTopology }) {
  // vypočítat bounding box a normalizovat do SVG
  var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  topology.routers.forEach(function (r) {
    if (r.position.x < minX) minX = r.position.x;
    if (r.position.y < minY) minY = r.position.y;
    if (r.position.x > maxX) maxX = r.position.x;
    if (r.position.y > maxY) maxY = r.position.y;
  });

  var rangeX = maxX - minX;
  var rangeY = maxY - minY;
  var padding = 14;
  var w = 120;
  var h = 80;

  function toSvgX(x: number) {
    if (rangeX === 0) return w / 2;
    return padding + ((x - minX) / rangeX) * (w - padding * 2);
  }
  function toSvgY(y: number) {
    if (rangeY === 0) return h / 2;
    return padding + ((y - minY) / rangeY) * (h - padding * 2);
  }

  // mapa id → pozice
  var posMap: Record<string, { sx: number; sy: number }> = {};
  topology.routers.forEach(function (r) {
    posMap[r.id] = { sx: toSvgX(r.position.x), sy: toSvgY(r.position.y) };
  });

  return (
    <svg width={w} height={h} viewBox={'0 0 ' + w + ' ' + h} className="topology-preview-svg">
      {/* linky */}
      {topology.links.map(function (link, i) {
        var s = posMap[link.source];
        var t = posMap[link.target];
        if (!s || !t) return null;
        return (
          <line
            key={i}
            x1={s.sx} y1={s.sy}
            x2={t.sx} y2={t.sy}
            stroke="var(--border-strong)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        );
      })}
      {/* particles — viditelné jen na hover karty */}
      <g className="topology-particles">
        {topology.links.map(function (link, i) {
          var s = posMap[link.source];
          var t = posMap[link.target];
          if (!s || !t) return null;
          // cesta pro animateMotion (relativní z 0,0)
          var dur = (0.8 + i * 0.3) + 's';
          return (
            <circle
              key={'p' + i}
              r="2"
              fill="var(--primary-light)"
              opacity="0.9"
            >
              <animateMotion
                dur={dur}
                repeatCount="indefinite"
                path={'M ' + s.sx + ' ' + s.sy + ' L ' + t.sx + ' ' + t.sy}
              />
            </circle>
          );
        })}
      </g>
      {/* routery */}
      {topology.routers.map(function (r) {
        var pos = posMap[r.id];
        return (
          <circle
            key={r.id}
            cx={pos.sx} cy={pos.sy}
            r="5"
            fill="var(--primary)"
            stroke="var(--bg)"
            strokeWidth="1.5"
          />
        );
      })}
    </svg>
  );
}

export function TopologyDialog({
  isOpen,
  onClose,
  onExport,
  onImport,
  onLoadPreset,
}: TopologyDialogProps) {
  var [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  var [showSuccess, setShowSuccess] = useState(false);
  var [isClosing, setIsClosing] = useState(false);
  var fileInputRef = useRef<HTMLInputElement>(null);
  var panelRef = useRef<HTMLDivElement>(null);

  // resetovat výběr při otevření
  useEffect(function () {
    if (isOpen) {
      setSelectedIndex(null);
      setShowSuccess(false);
      setIsClosing(false);
    }
  }, [isOpen]);

  // zavřít Escape klávesou
  useEffect(function () {
    if (!isOpen) return;

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

  if (!isOpen) return null;

  // zobrazit uspech, fade out, zavrit
  function triggerSuccess() {
    setShowSuccess(true);
    setTimeout(function () {
      setIsClosing(true);
      setTimeout(function () {
        onClose();
      }, 300);
    }, 1000);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    var file = event.target.files?.[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function (e) {
      var text = e.target?.result;
      if (typeof text === 'string') {
        onImport(text);
        triggerSuccess();
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  function handleLoadSelected() {
    if (selectedIndex === null) return;
    onLoadPreset(PRESET_TOPOLOGIES[selectedIndex]);
    triggerSuccess();
  }

  function handleExportAndClose() {
    onExport();
  }

  return (
    <>
      {/* backdrop */}
      <div className={'topology-backdrop' + (isClosing ? ' closing' : '')} onClick={onClose} />

      {/* dialog */}
      <div className={'topology-dialog' + (isClosing ? ' closing' : '')} ref={panelRef}>
        {/* hlavička */}
        <div className="topology-dialog-header">
          <h2 className="topology-dialog-title">Topologie</h2>
          <button className="topology-dialog-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* export / import */}
        <div className="topology-dialog-section">
          <div className="topology-dialog-section-label">Soubor</div>
          <div className="topology-dialog-actions">
            <button className="btn btn-secondary" onClick={handleExportAndClose}>
              <ExportIcon size={15} />
              <span>Exportovat JSON</span>
            </button>
            <button className="btn btn-secondary" onClick={function () { fileInputRef.current?.click(); }}>
              <ImportIcon size={15} />
              <span>Importovat JSON</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>
        </div>

        <div className="topology-dialog-divider" />

        {/* předdefinované topologie */}
        <div className="topology-dialog-section">
          <div className="topology-dialog-section-label">Předdefinované topologie</div>
          <div className="topology-presets-grid">
            {PRESET_TOPOLOGIES.map(function (preset, index) {
              var isSelected = selectedIndex === index;
              return (
                <div
                  key={index}
                  className={'topology-preset-card' + (isSelected ? ' selected' : '')}
                  onClick={function () { setSelectedIndex(index); }}
                >
                  <div className="topology-preset-preview">
                    <TopologyPreview topology={preset} />
                  </div>
                  <div className="topology-preset-info">
                    <div className="topology-preset-name">{preset.name}</div>
                    <div className="topology-preset-desc">{preset.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* spodní lišta s tlačítkem načíst — vždy renderovaná, .visible řídí slide */}
        <div className={'topology-dialog-footer' + (selectedIndex !== null ? ' visible' : '')}>
          <div className="topology-dialog-footer-info">
            <span className="topology-preset-badge">
              {selectedIndex !== null ? PRESET_TOPOLOGIES[selectedIndex].name : ''}
            </span>
            <span className="topology-footer-detail">
              {selectedIndex !== null
                ? PRESET_TOPOLOGIES[selectedIndex].routers.length + ' routerů, ' + PRESET_TOPOLOGIES[selectedIndex].links.length + ' linek'
                : ''}
            </span>
          </div>
          <button className="btn btn-primary" onClick={handleLoadSelected}>
            Načíst topologii
          </button>
        </div>

        {/* success overlay s animovanym checkmarkem */}
        {showSuccess && (
          <div className="topology-success-overlay">
            <div className="topology-success-circle">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle className="topology-success-bg" cx="24" cy="24" r="22" />
                <path
                  className="topology-success-check"
                  d="M14 24L21 31L34 18"
                  stroke="#fff"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </div>
            <span className="topology-success-text">Topologie načtena</span>
          </div>
        )}
      </div>
    </>
  );
}
