// routovaci tabulka — zobrazeni tabulky pro vybrany router
// zvyrazneni zmenenych bunek zlutou barvou
// preklad ID na nazvy routeru

import React from 'react';
import type { RoutingEntry, Change } from '../core/types';

interface RoutingTableProps {
  routerId: string;
  entries: RoutingEntry[];
  changes: Change[];
  protocolName: string;
  routerNames: Record<string, string>;
}

export function RoutingTable({
  routerId,
  entries,
  changes,
  protocolName,
  routerNames,
}: RoutingTableProps) {
  // zjisti jestli je bunka zmenena v aktualnim kroku
  function isCellChanged(destination: string): boolean {
    return changes.some(function (change) {
      return change.routerId === routerId && change.entry.destination === destination;
    });
  }

  // zjisti typ zmeny pro danou destinaci
  function getChangeType(destination: string): string | null {
    const change = changes.find(function (c) {
      return c.routerId === routerId && c.entry.destination === destination;
    });
    if (change) {
      return change.type;
    }
    return null;
  }

  // prelozi ID routeru na jeho nazev
  function toLabel(id: string): string {
    if (routerNames[id]) {
      return routerNames[id];
    }
    return id;
  }

  // pokud neni zadny zaznam
  if (entries.length === 0) {
    return (
      <div className="routing-table-wrapper">
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Žádné záznamy v tabulce
          </div>
        </div>
      </div>
    );
  }

  var isEigrp = protocolName === 'EIGRP';

  return (
    <div className="routing-table-wrapper">
      <table className="routing-table">
        <thead>
          <tr>
            {isEigrp && <th>Role</th>}
            <th>Cíl</th>
            <th>Next Hop</th>
            <th>Metrika</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(function (entry, index) {
            const changed = isCellChanged(entry.destination);
            const changeType = getChangeType(entry.destination);
            const cellClass = changed ? 'cell-changed' : '';
            var isFeasible = entry.role === 'FS';
            var rowStyle: React.CSSProperties = {};
            if (isFeasible) {
              rowStyle = { opacity: 0.55 };
            }

            return (
              <tr key={entry.destination + '-' + (entry.role || '') + '-' + index} style={rowStyle}>
                {isEigrp && (
                  <td className={cellClass}>
                    <span style={{
                      display: 'inline-block',
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: isFeasible ? 'var(--text-muted)' : 'var(--bg)',
                      background: isFeasible ? 'var(--bg-hover)' : 'var(--primary)',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      letterSpacing: '0.5px',
                    }}>
                      {entry.role || 'S'}
                    </span>
                  </td>
                )}
                <td className={cellClass}>{toLabel(entry.destination)}</td>
                <td className={cellClass}>
                  {entry.nextHop === routerId ? 'přímo' : toLabel(entry.nextHop)}
                </td>
                <td className={cellClass}>
                  {entry.metric}
                  {changeType === 'updated' && changed && (
                    <span style={{ 
                      fontSize: '10px', 
                      marginLeft: '4px',
                      opacity: 0.7 
                    }}>
                      ↓
                    </span>
                  )}

                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
