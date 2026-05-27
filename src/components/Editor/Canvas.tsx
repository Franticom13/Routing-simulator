// Canvas — wrapper kolem React Flow
// zobrazuje platno s volitelnym vzorem, routery, a propoji
// zajistuje drag & drop, zoom, pan, a pridavani novych routeru/hran

import React from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
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
  onNodeDragStop: (event: React.MouseEvent, node: Node) => void;
  onDropRouter: (position: { x: number; y: number }) => void;
  onNodeContextMenu: (event: React.MouseEvent, node: any) => void;
  onEdgeContextMenu: (event: React.MouseEvent, edge: any) => void;
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
  onNodeDragStop,
  onDropRouter,
  onNodeContextMenu,
  onEdgeContextMenu,
  backgroundType,
  snapToGrid,
  showMetrics,
}: CanvasProps) {
  // pristup k instanci React Flow pro prevod souradnic
  const reactFlowInstance = useReactFlow();

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

  // vlozit showMetrics do dat kazde hrany aby NetworkEdge mohl cist
  var edgesWithMetrics = edges.map(function (edge) {
    return {
      ...edge,
      data: { ...edge.data, showMetrics: showMetrics },
    };
  });

  // typ pozadi
  var bgVariant = getBackgroundVariant(backgroundType);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edgesWithMetrics}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      onNodeDragStop={onNodeDragStop}
      onNodeContextMenu={onNodeContextMenu}
      onEdgeContextMenu={onEdgeContextMenu}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      defaultEdgeOptions={{
        type: 'network',
        animated: false,
      }}
      fitView
      snapToGrid={snapToGrid}
      snapGrid={[20, 20]}
      connectionLineStyle={{
        stroke: 'var(--primary)',
        strokeWidth: 2,
      }}
      style={{ width: '100%', height: '100%' }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
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
  );
}
