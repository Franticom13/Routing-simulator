// SVG ikony pro celou aplikaci
// vsechny jsou outline styl, currentColor, zakulacene konce
// velikosti: 16px (male), 20px (stredni), 24px (velke)

import { useEffect, useRef } from 'react';

// spolecne props pro vsechny ikony
interface IconProps {
  size?: number;
  className?: string;
}

// router ikona — obdelnik s teckami a anteny
export function RouterIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="2" y="8" width="20" height="8" rx="2" />
      <circle cx="7" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <path d="M12 2v6M12 16v6" />
    </svg>
  );
}

// play ikona — dalsi krok

// animovana ikona routeru — pulsujici anteny a blikajici LED pri hoveru
// pouziva requestAnimationFrame pro plynulou animaci bez re-renderu
interface AnimatedRouterIconProps {
  size?: number;
  hovered: boolean;
}

export function AnimatedRouterIcon({ size = 20, hovered }: AnimatedRouterIconProps) {
  var topAntennaRef = useRef<SVGPathElement>(null);
  var bottomAntennaRef = useRef<SVGPathElement>(null);
  var led1Ref = useRef<SVGCircleElement>(null);
  var led2Ref = useRef<SVGCircleElement>(null);
  var signalRef = useRef<SVGGElement>(null);
  var rafRef = useRef(0);
  var progressRef = useRef(0);

  useEffect(function () {
    return function () { cancelAnimationFrame(rafRef.current); };
  }, []);

  useEffect(function () {
    cancelAnimationFrame(rafRef.current);
    var startTime = performance.now();
    var fromProgress = progressRef.current;

    if (hovered) {
      // faze 1: anteny se protahnou, LED zvetseni, signal arcs
      function tickOn(now: number) {
        var elapsed = Math.min((now - startTime) / 350, 1);
        // bouncy ease: overshoot
        var t = elapsed < 0.5
          ? 2 * elapsed * elapsed
          : 1 - Math.pow(-2 * elapsed + 2, 2) / 2;
        // overshoot na konci
        var bounce = elapsed < 1
          ? t + Math.sin(elapsed * Math.PI) * 0.15
          : 1;
        var current = fromProgress + (1 - fromProgress) * bounce;
        progressRef.current = Math.min(current, 1.15);

        // antena nahoru se prodlouzi (y1 se posune nahoru)
        var antennaStretch = current * 2.5;
        if (topAntennaRef.current) {
          topAntennaRef.current.setAttribute('d', 'M12 ' + (2 - antennaStretch) + 'v' + (6 + antennaStretch));
        }
        if (bottomAntennaRef.current) {
          bottomAntennaRef.current.setAttribute('d', 'M12 16v' + (6 + antennaStretch));
        }

        // LED zvetseni
        var ledScale = 1 + current * 0.5;
        if (led1Ref.current) {
          led1Ref.current.setAttribute('r', String(1 * ledScale));
        }
        if (led2Ref.current) {
          led2Ref.current.setAttribute('r', String(1 * ledScale));
        }

        // signalove oblouky
        if (signalRef.current) {
          signalRef.current.setAttribute('opacity', String(Math.min(current, 1)));
        }

        if (elapsed < 1) {
          rafRef.current = requestAnimationFrame(tickOn);
        } else {
          progressRef.current = 1;
        }
      }
      rafRef.current = requestAnimationFrame(tickOn);
    } else {
      // faze 2: navrat
      if (fromProgress === 0) { return; }
      function tickOff(now: number) {
        var elapsed = Math.min((now - startTime) / 300, 1);
        var eased = 1 - Math.pow(1 - elapsed, 3);
        var current = fromProgress * (1 - eased);
        progressRef.current = current;

        var antennaStretch = current * 2.5;
        if (topAntennaRef.current) {
          topAntennaRef.current.setAttribute('d', 'M12 ' + (2 - antennaStretch) + 'v' + (6 + antennaStretch));
        }
        if (bottomAntennaRef.current) {
          bottomAntennaRef.current.setAttribute('d', 'M12 16v' + (6 + antennaStretch));
        }

        var ledScale = 1 + current * 0.5;
        if (led1Ref.current) {
          led1Ref.current.setAttribute('r', String(1 * ledScale));
        }
        if (led2Ref.current) {
          led2Ref.current.setAttribute('r', String(1 * ledScale));
        }

        if (signalRef.current) {
          signalRef.current.setAttribute('opacity', String(Math.min(current, 1)));
        }

        if (elapsed < 1) {
          rafRef.current = requestAnimationFrame(tickOff);
        }
      }
      rafRef.current = requestAnimationFrame(tickOff);
    }
  }, [hovered]);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ overflow: 'visible' }}
    >
      {/* telo routeru */}
      <rect x="2" y="8" width="20" height="8" rx="2" />
      {/* LED indikatory */}
      <circle ref={led1Ref} cx="7" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle ref={led2Ref} cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      {/* anteny */}
      <path ref={topAntennaRef} d="M12 2v6" />
      <path ref={bottomAntennaRef} d="M12 16v6" />
      {/* signalove oblouky — viditelne jen pri hoveru */}
      <g ref={signalRef} opacity="0" strokeWidth="1.5">
        <path d="M8 1.5a5.5 5.5 0 0 1 8 0" fill="none" />
        <path d="M9.5 3.5a3 3 0 0 1 5 0" fill="none" />
      </g>
    </svg>
  );
}
export function PlayIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polygon points="5,3 19,12 5,21" />
    </svg>
  );
}

// fast forward — spustit vse
export function FastForwardIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polygon points="13,19 22,12 13,5" />
      <polygon points="2,19 11,12 2,5" />
    </svg>
  );
}

// reset ikona
export function ResetIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="1,4 1,10 7,10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  );
}

// plus ikona — pridat
export function PlusIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

// smazat ikona
export function TrashIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="3,6 5,6 21,6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

// tabulka ikona
export function TableIcon({ size = 18, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  );
}

// nastaveni ikona (gear)
export function SettingsIcon({ size = 18, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

// cesta ikona (path between two points)
export function PathIcon({ size = 18, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="5" cy="19" r="3" />
      <circle cx="19" cy="5" r="3" />
      <path d="M5 16V9a4 4 0 0 1 4-4h3" />
      <polyline points="13 2 16 5 13 8" />
    </svg>
  );
}

// propoj ikona (link)
export function LinkIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

// check ikona
export function CheckIcon({ size = 14, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="20,6 9,17 4,12" />
    </svg>
  );
}

// topologie ikona (network)
export function NetworkIcon({ size = 18, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="5" r="3" />
      <circle cx="5" cy="19" r="3" />
      <circle cx="19" cy="19" r="3" />
      <line x1="12" y1="8" x2="5" y2="16" />
      <line x1="12" y1="8" x2="19" y2="16" />
      <line x1="5" y1="19" x2="19" y2="19" />
    </svg>
  );
}

// animovana network ikona — cary zmizi, kulicky se vymeni po smeru hodinovych rucicek, cary se vrati
interface AnimatedNetworkIconProps {
  size?: number;
  hovered: boolean;
}

export function AnimatedNetworkIcon({ size = 18, hovered }: AnimatedNetworkIconProps) {
  var topRef = useRef<SVGCircleElement>(null);
  var leftRef = useRef<SVGCircleElement>(null);
  var rightRef = useRef<SVGCircleElement>(null);
  var linesRef = useRef<SVGGElement>(null);
  var rafRef = useRef(0);
  var progressRef = useRef(0);

  // puvodni pozice: top, left, right
  var origX = [12, 5, 19];
  var origY = [5, 19, 19];

  // cilove pozice po clockwise swapu:
  // top -> right, right -> left, left -> top
  var targetX = [19, 12, 5]; // kam se kazda kulicka presune
  var targetY = [19, 5, 19];

  // kolme vektory pro oblouk (clockwise smer)
  // top->right: oblouk doprava
  var perpX = [0.895, -0.895, 0];
  var perpY = [-0.447, -0.447, 1];
  var ARC = 4; // velikost oblouku v pixelech

  function applyState(t: number) {
    // t = 0..1 celkovy prubeh animace
    // faze 1 (0-0.2): cary zmizi
    // faze 2 (0.2-0.8): kulicky po oblouku na cilove pozice
    // faze 3 (0.8-1.0): cary se vrati
    var lineOpacity = 1;
    var moveProgress = 0;

    if (t <= 0.2) {
      lineOpacity = 1 - (t / 0.2);
      moveProgress = 0;
    } else if (t <= 0.8) {
      lineOpacity = 0;
      var raw = (t - 0.2) / 0.6;
      // ease-in-out
      if (raw < 0.5) {
        moveProgress = 2 * raw * raw;
      } else {
        moveProgress = 1 - Math.pow(-2 * raw + 2, 2) / 2;
      }
    } else {
      lineOpacity = (t - 0.8) / 0.2;
      moveProgress = 1;
    }

    // interpolace pozic s obloukem
    var refs = [topRef, leftRef, rightRef];
    for (var i = 0; i < 3; i++) {
      var el = refs[i].current;
      if (!el) { continue; }
      var sx = origX[i];
      var sy = origY[i];
      var tx = targetX[i];
      var ty = targetY[i];
      // linearna interpolace + sinovy oblouk
      var arcOffset = Math.sin(moveProgress * Math.PI) * ARC;
      var newX = sx + (tx - sx) * moveProgress + perpX[i] * arcOffset;
      var newY = sy + (ty - sy) * moveProgress + perpY[i] * arcOffset;
      el.setAttribute('cx', String(newX));
      el.setAttribute('cy', String(newY));
    }

    if (linesRef.current) {
      linesRef.current.setAttribute('opacity', String(lineOpacity));
    }
  }

  useEffect(function () {
    return function () { cancelAnimationFrame(rafRef.current); };
  }, []);

  useEffect(function () {
    cancelAnimationFrame(rafRef.current);
    var startTime = performance.now();
    var fromProgress = progressRef.current;

    if (hovered) {
      function tickOn(now: number) {
        var elapsed = Math.min((now - startTime) / 600, 1);
        var current = fromProgress + (1 - fromProgress) * elapsed;
        progressRef.current = current;
        applyState(current);

        if (elapsed < 1) {
          rafRef.current = requestAnimationFrame(tickOn);
        } else {
          progressRef.current = 1;
        }
      }
      rafRef.current = requestAnimationFrame(tickOn);
    } else {
      if (fromProgress === 0) { return; }
      function tickOff(now: number) {
        var elapsed = Math.min((now - startTime) / 600, 1);
        var eased = 1 - Math.pow(1 - elapsed, 3);
        var current = fromProgress * (1 - eased);
        progressRef.current = current;
        applyState(current);

        if (elapsed < 1) {
          rafRef.current = requestAnimationFrame(tickOff);
        }
      }
      rafRef.current = requestAnimationFrame(tickOff);
    }
  }, [hovered]);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ overflow: 'visible' }}
    >
      <g ref={linesRef}>
        <line x1="12" y1="8" x2="5" y2="16" />
        <line x1="12" y1="8" x2="19" y2="16" />
        <line x1="5" y1="19" x2="19" y2="19" />
      </g>
      <circle ref={topRef} cx="12" cy="5" r="3" />
      <circle ref={leftRef} cx="5" cy="19" r="3" />
      <circle ref={rightRef} cx="19" cy="19" r="3" />
    </svg>
  );
}

// info ikona
export function InfoIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

// cursor / select ikona
export function CursorIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
      <path d="M13 13l6 6" />
    </svg>
  );
}

// upravit ikona (tuzka)
export function EditIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

// grip ikona (pretahovaci madlo)
export function GripIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="9" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="18" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

// export ikona (download/stáhnout)
export function ExportIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

// import ikona (upload/nahrát)
export function ImportIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

// mapa/topologie ikona — grid s body (odlišná od NetworkIcon)
export function MapIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="16" cy="8" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="8" cy="16" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="16" cy="16" r="1.5" fill="currentColor" stroke="none" />
      <line x1="8" y1="8" x2="16" y2="8" />
      <line x1="8" y1="16" x2="16" y2="16" />
      <line x1="8" y1="8" x2="8" y2="16" />
      <line x1="16" y1="8" x2="16" y2="16" />
      <line x1="8" y1="8" x2="16" y2="16" />
    </svg>
  );
}
