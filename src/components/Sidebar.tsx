// sidebar — levy panel s prehledy routeru a routovaci tabulkou
// obsahuje draggable prvek pro pridani noveho routeru na canvas

import React, { useState } from 'react';
import { RoutingTable } from './RoutingTable';
import { TableIcon, PathIcon, AnimatedRouterIcon, AnimatedNetworkIcon } from './Icons';
import type { RoutingEntry, Change, RouterNode as RouterNodeType } from '../core/types';

interface SidebarProps {
  selectedRouter: RouterNodeType | null;
  routingEntries: RoutingEntry[];
  changes: Change[];
  routers: RouterNodeType[];
  protocolName: string;
  iteration: number;
  onSelectRouter: (routerId: string) => void;
  onTogglePath: () => void;
  pathSource: string | null;
  pathTarget: string | null;
  isPathMode: boolean;
  allRoutingTables: Record<string, RoutingEntry[]>;
  allChanges: Change[];
}

export function Sidebar({
  selectedRouter,
  routingEntries,
  changes,
  routers,
  protocolName,
  onSelectRouter,
  onTogglePath,
  pathSource,
  pathTarget,
  isPathMode,
  allRoutingTables,
  allChanges,
}: SidebarProps) {
  // zjisti jestli ma router nejake zmeny v aktualni iteraci
  function routerHasChanges(routerId: string): boolean {
    return allChanges.some(function (change) {
      return change.routerId === routerId;
    });
  }

  return (
    <div className="sidebar">
      {/* draggable prvek pro pridani noveho routeru */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">Přidat</div>
        <SidebarDragItem />
      </div>

      {/* sekce: prehled routeru */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">Routery</div>

        {routers.length === 0 && (
          <div className="empty-state" style={{ padding: '16px' }}>
            <div className="empty-state-text">
              Přetáhněte router na plátno
            </div>
          </div>
        )}

        {routers.map(function (router) {
          const isSelected = selectedRouter !== null && selectedRouter.id === router.id;
          const hasChanges = routerHasChanges(router.id);
          const entryCount = allRoutingTables[router.id]
            ? allRoutingTables[router.id].length
            : 0;

          return (
            <SidebarRouterItem
              key={router.id}
              router={router}
              isSelected={isSelected}
              hasChanges={hasChanges}
              entryCount={entryCount}
              onSelect={onSelectRouter}
            />
          );
        })}
      </div>

      {/* tlacitko pro vizualizaci cesty */}
      <div className="sidebar-section">
        <div
          className={'sidebar-nav-item' + (isPathMode ? ' active' : '')}
          onClick={onTogglePath}
        >
          <PathIcon size={16} />
          <span>Cesta</span>
        </div>
      </div>

      {/* sekce: routovaci tabulka vybraneho routeru */}
      {selectedRouter !== null && (
        <div className="sidebar-section" style={{ animationDelay: '50ms' }}>
          <div className="sidebar-section-title">
            <TableIcon size={14} /> Tabulka — {selectedRouter.label}
          </div>

          <RoutingTable
            routerId={selectedRouter.id}
            entries={routingEntries}
            changes={changes}
            protocolName={protocolName}
            routerNames={routers.reduce(function (map, r) {
              map[r.id] = r.label;
              return map;
            }, {} as Record<string, string>)}
          />
        </div>
      )}

      {/* toast pro vizualizaci cesty — zobrazi se nahore uprostred */}
      {isPathMode && (
        <div className="path-toast">
          <div className="path-toast-title">
            <PathIcon size={14} />
            <span style={{ flex: 1 }}>Vizualizace cesty</span>
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"
              style={{ cursor: 'pointer', flexShrink: 0 }}
              onClick={onTogglePath}
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
          <div className="path-toast-body">
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Klikněte na dva routery
            </span>
            <span className="badge badge-primary" style={{ padding: '3px 10px', fontSize: '12px' }}>
              {pathSource ? routers.find(function (r) { return r.id === pathSource; })?.label || '—' : 'Zdroj'}
            </span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
            <span className="badge badge-primary" style={{ padding: '3px 10px', fontSize: '12px' }}>
              {pathTarget ? routers.find(function (r) { return r.id === pathTarget; })?.label || '—' : 'Cíl'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// draggable prvek pro pridani noveho routeru — s animovanou ikonou
function SidebarDragItem() {
  var [hovered, setHovered] = useState(false);

  function handleDragStart(event: React.DragEvent) {
    event.dataTransfer.setData('application/routernode', '');
    event.dataTransfer.effectAllowed = 'move';
  }

  return (
    <div
      className="sidebar-drag-item"
      draggable
      onDragStart={handleDragStart}
      onMouseEnter={function () { setHovered(true); }}
      onMouseLeave={function () { setHovered(false); }}
    >
      <div className="router-icon">
        <AnimatedRouterIcon size={18} hovered={hovered} />
      </div>
      <span>Nový router</span>
    </div>
  );
}

// polozka routeru v sidebaru — s animovanou ikonou
interface SidebarRouterItemProps {
  router: RouterNodeType;
  isSelected: boolean;
  hasChanges: boolean;
  entryCount: number;
  onSelect: (routerId: string) => void;
}

function SidebarRouterItem({ router, isSelected, hasChanges, entryCount, onSelect }: SidebarRouterItemProps) {
  var [hovered, setHovered] = useState(false);

  return (
    <div
      className={'sidebar-nav-item' + (isSelected ? ' active' : '')}
      onClick={function () { onSelect(router.id); }}
      onMouseEnter={function () { setHovered(true); }}
      onMouseLeave={function () { setHovered(false); }}
    >
      <AnimatedNetworkIcon size={16} hovered={hovered} />
      <span style={{ flex: 1 }}>{router.label}</span>
      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
        {entryCount}
      </span>
      {hasChanges && (
        <span className="badge badge-warning" style={{ padding: '1px 6px', fontSize: '10px' }}>
          !
        </span>
      )}
    </div>
  );
}
