// NetworkEdge — custom React Flow edge pro propoj mezi routery
// pouziva floating edges — bod pripojeni se pocita dynamicky
// jako prunik primky (stred-stred) s obrysem obdelniku nodu

import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  useInternalNode,
  type EdgeProps,
} from '@xyflow/react';

interface NetworkEdgeData {
  metric?: number;
  isChanged?: boolean;
  isPathHighlighted?: boolean;
  isHovered?: boolean;
  particleKey?: number;
  particleTarget?: string;
  particlePills?: string[];
  showMetrics?: boolean;
  [key: string]: unknown;
}

// vypocet pruseciku primky ze stredu nodu smerem k cilovemu bodu
// s obrysem obdelniku nodu — vraci bod na hrane nodu
function getNodeIntersection(
  node: ReturnType<typeof useInternalNode>,
  targetPoint: { x: number; y: number }
): { x: number; y: number } {
  if (!node || !node.measured.width || !node.measured.height) {
    return targetPoint;
  }

  const w = node.measured.width / 2;
  const h = node.measured.height / 2;
  const cx = node.internals.positionAbsolute.x + w;
  const cy = node.internals.positionAbsolute.y + h;

  const dx = targetPoint.x - cx;
  const dy = targetPoint.y - cy;

  // pokud jsou stredy na stejnem miste, vrat stred
  if (dx === 0 && dy === 0) {
    return { x: cx, y: cy };
  }

  const slope = Math.abs(dy / dx);
  const aspectRatio = h / w;

  let ix: number;
  let iy: number;

  if (slope <= aspectRatio) {
    // prunik s levou nebo pravou stranou
    if (dx > 0) {
      ix = w;
    } else {
      ix = -w;
    }
    iy = ix * (dy / dx);
  } else {
    // prunik s horni nebo spodni stranou
    if (dy > 0) {
      iy = h;
    } else {
      iy = -h;
    }
    ix = iy * (dx / dy);
  }

  return { x: cx + ix, y: cy + iy };
}

// vypocet stredu nodu z jeho pozice a rozmeru
function getNodeCenter(node: ReturnType<typeof useInternalNode>): { x: number; y: number } {
  if (!node || !node.measured.width || !node.measured.height) {
    return { x: 0, y: 0 };
  }

  return {
    x: node.internals.positionAbsolute.x + node.measured.width / 2,
    y: node.internals.positionAbsolute.y + node.measured.height / 2,
  };
}

export function NetworkEdge({
  id,
  source,
  target,
  data,
  selected,
}: EdgeProps) {
  const edgeData = (data || {}) as NetworkEdgeData;

  // nacteni internich dat obou nodu pro vypocet pozice a rozmeru
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode) {
    return null;
  }

  // stredy obou nodu
  const sourceCenter = getNodeCenter(sourceNode);
  const targetCenter = getNodeCenter(targetNode);

  // pruseciky primky (stred-stred) s okraji obou nodu
  const sourceIntersection = getNodeIntersection(sourceNode, targetCenter);
  const targetIntersection = getNodeIntersection(targetNode, sourceCenter);

  // vypocet cesty a stredniho bodu pro label
  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX: sourceIntersection.x,
    sourceY: sourceIntersection.y,
    targetX: targetIntersection.x,
    targetY: targetIntersection.y,
  });

  // urceni stylu podle stavu
  let strokeColor = 'var(--border-strong)';
  let strokeWidth = 2;
  let strokeDasharray = 'none';
  let edgeClass = '';

  if (edgeData.isPathHighlighted) {
    strokeColor = 'var(--primary)';
    strokeWidth = 3;
    edgeClass = 'edge-active';
  }

  if (edgeData.isChanged) {
    strokeColor = 'var(--warning)';
    strokeWidth = 3;
    strokeDasharray = '6 3';
    edgeClass = 'edge-changed';
  }

  if (selected) {
    strokeColor = 'var(--primary)';
    strokeWidth = 3;
  }

  if (!selected && edgeData.isHovered) {
    strokeColor = 'var(--primary-light, var(--primary))';
    strokeWidth = 2.5;
    edgeClass = 'edge-hovered';
  }

  // zobrazeni metriky — podle showMetrics flagu (default: true)
  var metricsVisible = edgeData.showMetrics !== false;
  let metricLabel: string;
  if (edgeData.metric !== undefined) {
    metricLabel = String(edgeData.metric);
  } else {
    metricLabel = '?';
  }

  // smer pills — inward: od vzdalejsiho k blizkejsimu, outward: opacne
  // pills jedou AZ do stredu ciloveho routeru (ne jen k okraji)
  const goesToSource = edgeData.particleTarget === source;
  // inward: startuje na vzdalejsim nodu, cil je stred blizssiho nodu
  const inStartX = goesToSource ? targetIntersection.x : sourceIntersection.x;
  const inStartY = goesToSource ? targetIntersection.y : sourceIntersection.y;
  const inEndX = goesToSource ? sourceCenter.x : targetCenter.x;
  const inEndY = goesToSource ? sourceCenter.y : targetCenter.y;
  const inDx = inEndX - inStartX;
  const inDy = inEndY - inStartY;
  // outward: opacny smer
  const outStartX = goesToSource ? sourceIntersection.x : targetIntersection.x;
  const outStartY = goesToSource ? sourceIntersection.y : targetIntersection.y;
  const outEndX = goesToSource ? targetCenter.x : sourceCenter.x;
  const outEndY = goesToSource ? targetCenter.y : sourceCenter.y;
  const outDx = outEndX - outStartX;
  const outDy = outEndY - outStartY;

  // pills data — muze byt pole stringu (legacy) nebo pole {label, outgoing}
  const rawPills: any[] = edgeData.particlePills || [];
  const hasPills = edgeData.particleKey !== undefined && edgeData.particleKey > 0 && rawPills.length > 0;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth: strokeWidth,
          strokeDasharray: strokeDasharray,
          transition: 'stroke 0.15s ease, stroke-width 0.15s ease, opacity 0.15s ease',
          cursor: 'pointer',
          opacity: edgeData.isHovered && !selected ? 0.7 : undefined,
        }}
        className={edgeClass}
        interactionWidth={20}
      />

      {/* label s metrikou na strednim bodu — podminene zobrazeni */}
      <EdgeLabelRenderer>
        {metricsVisible && (
          <div
            className="edge-label"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
          >
            {metricLabel}
          </div>
        )}

        {/* animovane pills — pojmenovane pilulky putujici po lince */}
        {hasPills && rawPills.map(function (pill, index) {
          // podpora starsiho formatu (string) i noveho ({label, outgoing})
          const isObject = typeof pill === 'object' && pill !== null;
          const label = isObject ? pill.label : pill;
          const isOutgoing = isObject ? pill.outgoing : false;
          const isReverse = isObject ? (pill.reverse || false) : false;

          // vybrat smer podle typu pill — reverse obraci smer
          var useReverse = isOutgoing || isReverse;
          const startX = useReverse ? outStartX : inStartX;
          const startY = useReverse ? outStartY : inStartY;
          const dx = useReverse ? outDx : inDx;
          const dy = useReverse ? outDy : inDy;

          return (
            <div
              key={'pill-' + edgeData.particleKey + '-' + label + '-' + index}
              className={'edge-pill' + (isOutgoing ? ' edge-pill-outgoing' : '')}
              style={{
                position: 'absolute',
                left: startX + 'px',
                top: startY + 'px',
                zIndex: 0,
                '--pill-dx': dx + 'px',
                '--pill-dy': dy + 'px',
                animationDelay: (index * 0.08) + 's',
              } as React.CSSProperties}
            >
              {label}
            </div>
          );
        })}
      </EdgeLabelRenderer>
    </>
  );
}
