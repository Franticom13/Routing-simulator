// Vlastni dropdown komponenta pro vyber smerovacího protokolu
// Pouziva CSS tridy .dropdown, .dropdown-menu, .dropdown-item z index.css
// Zavre se pri kliknuti mimo nebo stisknuti Escape

import React, { useState, useRef, useEffect } from 'react';
import { CheckIcon } from './Icons';

// dostupne protokoly
const PROTOCOLS = ['RIP', 'OSPF', 'EIGRP'];

interface ProtocolSelectProps {
  value: string;
  onChange: (value: string) => void;
}

// chevron ikona — sipka dolu vedle vybraneho protokolu
function ChevronDownIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      width={10}
      height={6}
      viewBox="0 0 10 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transition: 'transform 0.15s ease',
        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
      }}
    >
      <path d="M1 1L5 5L9 1" />
    </svg>
  );
}

// hlavni dropdown komponenta
export function ProtocolSelect({ value, onChange }: ProtocolSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  var textRef = useRef<HTMLSpanElement>(null);
  var [btnWidth, setBtnWidth] = useState<number | null>(null);

  // mereni sirky textu pro plynulou zmenu sirky tlacitka
  useEffect(function () {
    var el = textRef.current;
    if (!el) { return; }
    var observer = new ResizeObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        // sirka textu + gap(6) + chevron(10) + padding(24*2) + border(2)
        setBtnWidth(entries[i].contentBoxSize[0].inlineSize + 68);
      }
    });
    observer.observe(el);
    return function () { observer.disconnect(); };
  }, []);

  // zavreni pri kliknuti mimo dropdown
  useEffect(function handleClickOutside() {
    if (!isOpen) {
      return;
    }

    function onDocumentClick(event: MouseEvent) {
      if (!dropdownRef.current) {
        return;
      }
      if (!dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    // capture: true — zachyti event pred React Flow
    document.addEventListener('mousedown', onDocumentClick, true);
    return function cleanup() {
      document.removeEventListener('mousedown', onDocumentClick, true);
    };
  }, [isOpen]);

  // zavreni pri stisknuti Escape
  useEffect(function handleEscapeKey() {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return function cleanup() {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  // prepinani otevreni/zavreni menu
  function handleToggle() {
    setIsOpen(!isOpen);
  }

  // vyber protokolu a zavreni menu
  function handleSelect(protocol: string) {
    onChange(protocol);
    setIsOpen(false);
  }

  // zjisteni, zda je polozka aktivni
  function getItemClassName(protocol: string) {
    if (protocol === value) {
      return 'dropdown-item active';
    }
    return 'dropdown-item';
  }

  var triggerStyle: React.CSSProperties = {
    gap: '6px',
    transition: 'width 0.3s ease',
    whiteSpace: 'nowrap',
  };
  if (btnWidth !== null) {
    triggerStyle.width = btnWidth;
  }

  return (
    <div className="dropdown" ref={dropdownRef}>
      {/* trigger tlacitko — pill tvar se stinem */}
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={handleToggle}
        style={triggerStyle}
      >
        <span ref={textRef}>{value}</span>
        <ChevronDownIcon isOpen={isOpen} />
      </button>

      {/* rozbalovaci menu — otevreni nahoru (floating bar je dole) */}
      {isOpen && (
        <div className="dropdown-menu" style={{ bottom: 'calc(100% + 6px)', top: 'auto' }}>
          {PROTOCOLS.map(function renderItem(protocol) {
            return (
              <div
                key={protocol}
                className={getItemClassName(protocol)}
                onClick={function onItemClick() { handleSelect(protocol); }}
              >
                {/* check ikona pro aktivni polozku */}
                {protocol === value && <CheckIcon size={12} />}
                <span>{protocol}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
