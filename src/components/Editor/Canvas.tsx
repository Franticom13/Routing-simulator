// Canvas — wrapper kolem React Flow
// zobrazuje platno s volitelnym vzorem, routery, a propoji
// zajistuje drag & drop, zoom, pan, a pridavani novych routeru/hran
// podpora hromadneho vyberu pravym tlacitkem mysi

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  SelectionMode,
  useReactFlow,
  type Node,
  type Edge,
  type OnConnect,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { RouterNodeMemo } from './RouterNode';
import { NetworkEdge } from './NetworkEdge';

// registrace custom node a edge typu
const nodeTypes = {
  router: RouterNodeMemo,
};

const edgeTypes = {
  network: NetworkEdge,
};

interface CanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: any) => void;
  onEdgesChange: (changes: any) => void;
  onConnect: OnConnect;
  onNodeClick: NodeMouseHandler;
  onPaneClick: () => void;
  onNodeDragStart: () => void;
  onNodeDragStop: (event: React.MouseEvent, node: Node) => void;
  onDropRouter: (position: { x: number; y: number }) => void;
  onNodeContextMenu: (event: React.MouseEvent, node: any) => void;
  onEdgeContextMenu: (event: React.MouseEvent, edge: any) => void;
  onSelectionContextMenu: (event: React.MouseEvent, nodes: any[]) => void;
  onDeleteSelected: (nodeIds: string[], edgeIds: string[]) => void;
  backgroundType: string; // 'none' | 'dots' | 'lines' | 'cross'
  snapToGrid: boolean;
  showMetrics: boolean;
}

// mapovani retezce na BackgroundVariant enum
function getBackgroundVariant(type: string): BackgroundVariant | null {
  if (type === 'dots') {
    return BackgroundVariant.Dots;
  }
  if (type === 'lines') {
    return BackgroundVariant.Lines;
  }
  if (type === 'cross') {
    return BackgroundVariant.Cross;
  }
  return null;
}

export function Canvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onPaneClick,
  onNodeDragStart,
  onNodeDragStop,
  onDropRouter,
  onNodeContextMenu,
  onEdgeContextMenu,
  onSelectionContextMenu,
  onDeleteSelected,
  backgroundType,
  snapToGrid,
  showMetrics,
}: CanvasProps) {
  // pristup k instanci React Flow pro prevod souradnic
  const reactFlowInstance = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // stav vyberu pravym tlacitkem
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);

  // hover stav pro hrany
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);


  // povoli drop na platno (nastaveni efektu presunu)
  function handleDragOver(event: React.DragEvent) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }

  // zpracovani drop eventu — prevede pozici na souradnice platna
  function handleDrop(event: React.DragEvent) {
    event.preventDefault();

    // kontrola ze jde o router node data
    const hasData = event.dataTransfer.types.includes('application/routernode');
    if (!hasData) {
      return;
    }

    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    onDropRouter(position);
  }

  // === SELEKCE OBDELNIKEM (pravy klik NEBO shift+levy klik) ===

  // zahajit selekci
  function handleMouseDown(e: React.MouseEvent) {
    // pravy klik (button 2) NEBO shift+levy klik (button 0 + shift)
    var isRightClick = e.button === 2;
    var isShiftLeftClick = e.button === 0 && e.shiftKey;
    if (!isRightClick && !isShiftLeftClick) { return; }

    // ignorovat pokud klikneme na node, edge, controls, minimap
    const target = e.target as HTMLElement;
    if (target.closest('.react-flow__node') || target.closest('.react-flow__edge') ||
        target.closest('.react-flow__controls') || target.closest('.react-flow__minimap')) {
      return;
    }

    e.preventDefault();
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) { return; }

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsSelecting(true);
    setSelectionStart({ x, y });
    setSelectionEnd({ x, y });
  }

  // aktualizovat obdelnik selekce
  const handleMouseMove = useCallback(function (e: MouseEvent) {
    if (!isSelecting || !wrapperRef.current) { return; }
    const rect = wrapperRef.current.getBoundingClientRect();
    setSelectionEnd({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, [isSelecting]);

  // dokoncit selekci — vybrat nody a edgy uvnitr obdelniku
  const handleMouseUp = useCallback(function () {
    if (!isSelecting || !selectionStart || !selectionEnd || !wrapperRef.current) {
      setIsSelecting(false);
      return;
    }

    // prepocitat screen souradnice na flow souradnice
    const rect = wrapperRef.current.getBoundingClientRect();
    const topLeftScreen = {
      x: Math.min(selectionStart.x, selectionEnd.x) + rect.left,
      y: Math.min(selectionStart.y, selectionEnd.y) + rect.top,
    };
    const bottomRightScreen = {
      x: Math.max(selectionStart.x, selectionEnd.x) + rect.left,
      y: Math.max(selectionStart.y, selectionEnd.y) + rect.top,
    };

    const topLeftFlow = reactFlowInstance.screenToFlowPosition(topLeftScreen);
    const bottomRightFlow = reactFlowInstance.screenToFlowPosition(bottomRightScreen);

    // najit nody uvnitr obdelniku
    const selectedNodeIds: string[] = [];
    nodes.forEach(function (node) {
      const nx = node.position.x;
      const ny = node.position.y;
      const nw = (node.measured?.width || node.width || 80) as number;
      const nh = (node.measured?.height || node.height || 80) as number;

      // node se pocita jako selected pouze pokud je CELE uvnitr obdelniku
      var fullyInside = nx >= topLeftFlow.x && nx + nw <= bottomRightFlow.x &&
                        ny >= topLeftFlow.y && ny + nh <= bottomRightFlow.y;
      if (fullyInside) {
        selectedNodeIds.push(node.id);
      }
    });

    // najit edgy kde oba konce jsou selected
    const selectedEdgeIds: string[] = [];
    const selectedSet = new Set(selectedNodeIds);
    edges.forEach(function (edge) {
      if (selectedSet.has(edge.source) && selectedSet.has(edge.target)) {
        selectedEdgeIds.push(edge.id);
      }
    });

    // nastavit selected stav na nodech a edgach pres onNodesChange/onEdgesChange
    if (selectedNodeIds.length > 0 || selectedEdgeIds.length > 0) {
      // oznacit nody
      var nodeChanges = nodes.map(function (node) {
        return {
          type: 'select' as const,
          id: node.id,
          selected: selectedNodeIds.indexOf(node.id) !== -1,
        };
      });
      onNodesChange(nodeChanges);

      // oznacit edgy
      var edgeChanges = edges.map(function (edge) {
        return {
          type: 'select' as const,
          id: edge.id,
          selected: selectedEdgeIds.indexOf(edge.id) !== -1,
        };
      });
      onEdgesChange(edgeChanges);
    }

    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  }, [isSelecting, selectionStart, selectionEnd, nodes, edges, reactFlowInstance, onNodesChange, onEdgesChange]);

  // globalni mouse event listenery pro selekci (aby fungovaly i mimo canvas)
  useEffect(function () {
    if (!isSelecting) { return; }
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return function () {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isSelecting, handleMouseMove, handleMouseUp]);

  // klavesovy handler — Delete/Backspace pro smazani vybranych
  useEffect(function () {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // ignorovat pokud jsme v inputu
        var tag = (e.target as HTMLElement).tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') { return; }

        var selectedNodes = nodes.filter(function (n) { return n.selected; });
        var selectedEdges = edges.filter(function (edge) { return edge.selected; });

        if (selectedNodes.length > 0 || selectedEdges.length > 0) {
          e.preventDefault();
          onDeleteSelected(
            selectedNodes.map(function (n) { return n.id; }),
            selectedEdges.map(function (edge) { return edge.id; })
          );
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return function () { document.removeEventListener('keydown', handleKeyDown); };
  }, [nodes, edges, onDeleteSelected]);

  // zabranit kontextovemu menu na canvasu (protoze pravy klik = selekce)
  function handleContextMenu(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    // povolit context menu na nodech, edgach, a selekci (NodesSelection overlay)
    if (target.closest('.react-flow__node') || target.closest('.react-flow__edge') ||
        target.closest('.react-flow__nodesselection')) {
      return;
    }
    e.preventDefault();
  }

  // vlozit showMetrics do dat kazde hrany aby NetworkEdge mohl cist
  var edgesWithMetrics = edges.map(function (edge) {
    return {
      ...edge,
      data: { ...edge.data, showMetrics: showMetrics, isHovered: edge.id === hoveredEdgeId },
    };
  });

  // typ pozadi
  var bgVariant = getBackgroundVariant(backgroundType);

  // vypocet obdelniku selekce pro renderovani
  var selectionRect: { left: number; top: number; width: number; height: number } | null = null;
  if (isSelecting && selectionStart && selectionEnd) {
    selectionRect = {
      left: Math.min(selectionStart.x, selectionEnd.x),
      top: Math.min(selectionStart.y, selectionEnd.y),
      width: Math.abs(selectionEnd.x - selectionStart.x),
      height: Math.abs(selectionEnd.y - selectionStart.y),
    };
  }

  return (
    <div
      ref={wrapperRef}
      className={hoveredEdgeId !== null ? 'edge-hovered' : undefined}
      style={{ width: '100%', height: '100%', position: 'relative' }}
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
    >
      <ReactFlow
        nodes={nodes}
        edges={edgesWithMetrics}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onEdgeMouseEnter={function (_event: React.MouseEvent, edge: Edge) {
          setHoveredEdgeId(edge.id);
          // nastavit cursor primo na vsech moznych vrstvach pres DOM
          var root = wrapperRef.current;
          if (root) {
            root.querySelectorAll('.react-flow__pane, .react-flow__renderer, .react-flow, [class*="react-flow"]').forEach(function (el) {
              (el as HTMLElement).style.cursor = 'pointer';
            });
          }
        }}
        onEdgeMouseLeave={function () {
          setHoveredEdgeId(null);
          var root = wrapperRef.current;
          if (root) {
            root.querySelectorAll('.react-flow__pane, .react-flow__renderer, .react-flow, [class*="react-flow"]').forEach(function (el) {
              (el as HTMLElement).style.cursor = '';
            });
          }
        }}
        onSelectionContextMenu={onSelectionContextMenu}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{
          type: 'network',
          animated: false,
        }}
        defaultViewport={{ x: 0, y: 0, zoom: 1.5 }}
        snapToGrid={snapToGrid}
        snapGrid={[20, 20]}
        connectionLineStyle={{
          stroke: 'var(--primary)',
          strokeWidth: 2,
        }}
        style={{ width: '100%', height: '100%' }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        selectNodesOnDrag={false}
        multiSelectionKeyCode="Shift"
        selectionMode={SelectionMode.Full}
      >
        {/* volitelný vzor na pozadí */}
        {bgVariant !== null && (
          <Background
            variant={bgVariant}
            gap={20}
            size={backgroundType === 'cross' ? 6 : 1.5}
            color={backgroundType === 'dots' ? '#D6D3D1' : '#E7E5E4'}
          />
        )}

        {/* ovladaci prvky (zoom +/-) */}
        <Controls
          showInteractive={false}
        />

        {/* minimapa */}
        <MiniMap
          nodeColor="var(--primary-lighter)"
          nodeStrokeColor="var(--primary)"
          nodeStrokeWidth={2}
          maskColor="rgba(245, 245, 244, 0.7)"
          style={{
            borderRadius: 10,
            border: '1px solid var(--border)',
          }}
        />
      </ReactFlow>

      {/* obdelnik selekce */}
      {selectionRect && (
        <div
          className="selection-rectangle"
          style={{
            left: selectionRect.left,
            top: selectionRect.top,
            width: selectionRect.width,
            height: selectionRect.height,
          }}
        />
      )}
    </div>
  );
}
