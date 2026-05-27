// toolbar — horni lista s nazvem aplikace a tlacitky nastaveni + topologie
// editacni nastroje (pridat router, propojit) byly presunuty
// do sidebaru (drag) a kontextoveho menu (pravy klik)

import { RouterIcon, SettingsIcon, MapIcon } from './Icons';

interface ToolbarProps {
  onToggleSettings: () => void;
  isSettingsOpen: boolean;
  onOpenTopology: () => void;
}

export function Toolbar({
  onToggleSettings,
  isSettingsOpen,
  onOpenTopology,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      {/* nazev aplikace */}
      <div className="toolbar-title">
        <RouterIcon size={20} />
        <span>Routing Simulator</span>
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
