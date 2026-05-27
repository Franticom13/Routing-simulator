// floating action bar — plovouci panel dole uprostred
// obsahuje: simulacni ovladani (krok, vse, reset), vyber protokolu, badge

import React from 'react';
import {
  PlayIcon,
  FastForwardIcon,
  ResetIcon,
  CheckIcon,
} from './Icons';

interface FloatingBarProps {
  selectedProtocol: string;
  onStep: () => void;
  onRunAll: () => void;
  onReset: () => void;
  iteration: number;
  isConverged: boolean;
  isSimulationRunning: boolean;
  ospfPhase: string;
  protocolSelectComponent: React.ReactNode;
}

export function FloatingBar({
  selectedProtocol,
  onStep,
  onRunAll,
  onReset,
  iteration,
  isConverged,
  isSimulationRunning,
  ospfPhase,
  protocolSelectComponent,
}: FloatingBarProps) {
  // text badge iterace
  function getIterationText(): string {
    if (iteration === 0) {
      return 'Připraveno';
    }
    if (selectedProtocol === 'OSPF' && ospfPhase) {
      if (ospfPhase === 'neighbor-discovery') { return 'Fáze 1: Objevení'; }
      if (ospfPhase === 'lsa-flooding') { return 'Fáze 2: Flooding'; }
      if (ospfPhase === 'dijkstra') { return 'Fáze 3: Dijkstra'; }
    }
    return 'Iterace ' + iteration;
  }

  // styl badge podle stavu
  function getBadgeClass(): string {
    if (isConverged) {
      return 'badge badge-success';
    }
    if (iteration > 0) {
      return 'badge badge-warning';
    }
    return 'badge badge-neutral';
  }


  return (
    <div className="floating-bar">
        {/* vyber protokolu */}
        {protocolSelectComponent}

        <div className="floating-bar-divider" />

        {/* ovladani simulace */}
        <button
          className="btn btn-ghost btn-sm"
          onClick={onReset}
          title="Resetovat simulaci"
        >
          <ResetIcon size={14} />
        </button>

        <button
          className="btn btn-primary"
          onClick={onStep}
          disabled={isConverged || isSimulationRunning}
          title={iteration === 0 ? 'Začít simulaci' : 'Další krok'}
        >
          <PlayIcon size={14} />
          {iteration === 0 ? 'Začít' : 'Další krok'}
        </button>

        <button
          className="btn btn-secondary btn-sm"
          onClick={onRunAll}
          disabled={isConverged || isSimulationRunning}
          title="Spustit vše"
        >
          <FastForwardIcon size={14} />
          Vše
        </button>

        <div className="floating-bar-divider" />

        {/* badge s iteraci */}
        <span className={getBadgeClass()}>
          {isConverged && <CheckIcon size={11} />}
          {getIterationText()}
        </span>
    </div>
  );
}
