// Kontextove menu pro pravy klik na router uzel
// Pouziva CSS tridy .dropdown-menu, .dropdown-item z index.css
// Zavre se pri kliknuti mimo, stisknuti Escape nebo scrollovani

import { useEffect, useRef } from 'react';
import { LinkIcon, TrashIcon, EditIcon } from './Icons';

// rozhrani pro props kontextoveho menu
interface ContextMenuProps {
  isOpen: boolean;
  x: number;
  y: number;
  routerId: string;
  routerLabel: string;
  onConnect: (routerId: string) => void;
  onRename: (routerId: string) => void;
  onDelete: (routerId: string) => void;
  onClose: () => void;
}

// velikost menu pro clamping do viewportu
const MENU_WIDTH = 200;
const MENU_HEIGHT_ESTIMATE = 160;

// vypocet pozice — udrzuje menu ve viewportu
function clampPosition(x: number, y: number) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let clampedX = x;
  let clampedY = y;

  if (x + MENU_WIDTH > viewportWidth) {
    clampedX = viewportWidth - MENU_WIDTH - 8;
  }

  if (y + MENU_HEIGHT_ESTIMATE > viewportHeight) {
    clampedY = viewportHeight - MENU_HEIGHT_ESTIMATE - 8;
  }

  return { left: clampedX, top: clampedY };
}

// hlavni komponenta kontextoveho menu
export function ContextMenu({
  isOpen,
  x,
  y,
  routerId,
  routerLabel,
  onConnect,
  onRename,
  onDelete,
  onClose,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // zavreni pri kliknuti mimo menu
  useEffect(function handleClickOutside() {
    if (!isOpen) {
      return;
    }

    function onDocumentMouseDown(event: MouseEvent) {
      if (!menuRef.current) {
        return;
      }
      if (!menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', onDocumentMouseDown, true);
    return function cleanup() {
      document.removeEventListener('mousedown', onDocumentMouseDown, true);
    };
  }, [isOpen, onClose]);

  // zavreni pri stisknuti Escape
  useEffect(function handleEscapeKey() {
    if (!isOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return function cleanup() {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  // zavreni pri scrollovani
  useEffect(function handleScroll() {
    if (!isOpen) {
      return;
    }

    function onScroll() {
      onClose();
    }

    window.addEventListener('scroll', onScroll, true);
    return function cleanup() {
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [isOpen, onClose]);

  // handlery pro polozky menu
  function handleConnect() {
    onConnect(routerId);
    onClose();
  }

  function handleRename() {
    onRename(routerId);
    onClose();
  }

  function handleDelete() {
    onDelete(routerId);
    onClose();
  }

  // pokud neni otevrene, nevykreslovat
  if (!isOpen) {
    return null;
  }

  // vypocitat pozici s clampingem
  const position = clampPosition(x, y);

  return (
    <div
      ref={menuRef}
      className="dropdown-menu"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        minWidth: MENU_WIDTH,
        zIndex: 1000,
      }}
    >
      {/* hlavicka s nazvem routeru */}
      <div
        style={{
          padding: '6px 12px 4px',
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          borderBottom: '1px solid var(--border)',
          marginBottom: '4px',
          userSelect: 'none',
        }}
      >
        {routerLabel}
      </div>

      {/* polozka: propojit */}
      <div className="dropdown-item" onClick={handleConnect}>
        <LinkIcon size={16} />
        <span>Propojit</span>
      </div>

      {/* polozka: prejmenovat */}
      <div className="dropdown-item" onClick={handleRename}>
        <EditIcon size={16} />
        <span>Přejmenovat</span>
      </div>

      {/* oddelovac pred nebezpecnou akci */}
      <div
        style={{
          height: '1px',
          background: 'var(--border)',
          margin: '4px 0',
        }}
      />

      {/* polozka: smazat (nebezpecna akce) */}
      <div
        className="dropdown-item danger"
        onClick={handleDelete}
      >
        <TrashIcon size={16} />
        <span>Smazat</span>
      </div>
    </div>
  );
}
