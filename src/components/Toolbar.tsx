// toolbar — horni lista s nazvem aplikace a tlacitky nastaveni + topologie + undo/redo

import { RouterIcon, SettingsIcon, MapIcon, UndoIcon, RedoIcon } from './Icons';

interface ToolbarProps {
  onToggleSettings: () => void;
  isSettingsOpen: boolean;
  onOpenTopology: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function Toolbar({
  onToggleSettings,
  isSettingsOpen,
  onOpenTopology,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      {/* nazev aplikace */}
      <div className="toolbar-title">
        <RouterIcon size={20} />
        <span>Routing Simulator</span>
      </div>

      {/* undo/redo */}
      <div className="toolbar-history">
        <button
          className="btn-icon"
          onClick={onUndo}
          disabled={!canUndo}
          title="Zpět (Ctrl+Z)"
        >
          <UndoIcon size={16} />
        </button>
        <button
          className="btn-icon"
          onClick={onRedo}
          disabled={!canRedo}
          title="Znovu (Ctrl+Shift+Z)"
        >
          <RedoIcon size={16} />
        </button>
      </div>

      {/* topologie */}
      <button
        className="btn btn-secondary settings-btn"
        onClick={onOpenTopology}
        title="Topologie"
      >
        <MapIcon size={16} />
        <span>Topologie</span>
      </button>

      {/* nastavení */}
      <button
        className={isSettingsOpen ? 'btn btn-primary settings-trigger settings-btn' : 'btn btn-secondary settings-trigger settings-btn'}
        onClick={onToggleSettings}
        title="Nastavení"
      >
        <SettingsIcon size={16} />
        <span>Nastavení</span>
      </button>
    </div>
  );
}
