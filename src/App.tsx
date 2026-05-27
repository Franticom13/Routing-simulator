// hlavni komponenta aplikace
// propojuje toolbar, sidebar, floating bar, canvas, a context menu
// drzi stav simulace, grafu, a interakci

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Node,
  type Edge,
} from '@xyflow/react';
import { Toolbar } from './components/Toolbar';
import { SettingsPanel } from './components/SettingsPanel';
import { Sidebar } from './components/Sidebar';
import { Canvas } from './components/Editor/Canvas';
import { MetricDialog } from './components/MetricDialog';
import { FloatingBar } from './components/FloatingBar';
import { ProtocolSelect } from './components/ProtocolSelect';
import { ContextMenu } from './components/ContextMenu';
import { RenameDialog } from './components/RenameDialog';
import { TopologyDialog } from './components/TopologyDialog';
import { NetworkIcon } from './components/Icons';

// core logika
import type {
  RouterNode as RouterNodeType,
  RoutingEntry,
  Change,
  SimulationStep,
  NetworkState,
} from './core/types';
import type { Protocol } from './core/protocols/Protocol';
import { convertToNetworkState } from './core/graph';
import {
  createSimulation,
  setProtocol as simSetProtocol,
  reset as simReset,
  step as simStep,
  isConverged as simIsConverged,
  findPath as simFindPath,
  type SimulationEngine,
} from './core/simulation';
import { RIPProtocol } from './core/protocols/RIP';
import { OSPFProtocol } from './core/protocols/OSPF';
import { EIGRPProtocol } from './core/protocols/EIGRP';

// pocatecni routery — 7 routeru, sit vyzaduje 4+ iteraci pro konvergenci
//
//     A -----1----- B -----3----- C
//     |             |             |
//     2             1             2
//     |             |             |
//     D -----4----- E -----1----- F
//                   |
//                   3
//                   |
//                   G
//
const INITIAL_NODES: Node[] = [
  {
    id: 'r1',
    type: 'router',
    position: { x: 80, y: 80 },
    data: { label: 'Router A' },
  },
  {
    id: 'r2',
    type: 'router',
    position: { x: 400, y: 80 },
    data: { label: 'Router B' },
  },
  {
    id: 'r3',
    type: 'router',
    position: { x: 720, y: 80 },
    data: { label: 'Router C' },
  },
  {
    id: 'r4',
    type: 'router',
    position: { x: 80, y: 320 },
    data: { label: 'Router D' },
  },
  {
    id: 'r5',
    type: 'router',
    position: { x: 400, y: 320 },
    data: { label: 'Router E' },
  },
  {
    id: 'r6',
    type: 'router',
    position: { x: 720, y: 320 },
    data: { label: 'Router F' },
  },
  {
    id: 'r7',
    type: 'router',
    position: { x: 400, y: 540 },
    data: { label: 'Router G' },
  },
];

const INITIAL_EDGES: Edge[] = [
  // horni rada
  {
    id: 'e1-2',
    source: 'r1',
    target: 'r2',
    type: 'network',
    data: { metric: 1 },
  },
  {
    id: 'e2-3',
    source: 'r2',
    target: 'r3',
    type: 'network',
    data: { metric: 3 },
  },
  // vertikalni propoje
  {
    id: 'e1-4',
    source: 'r1',
    target: 'r4',
    type: 'network',
    data: { metric: 2 },
  },
  {
    id: 'e2-5',
    source: 'r2',
    target: 'r5',
    type: 'network',
    data: { metric: 1 },
  },
  {
    id: 'e3-6',
    source: 'r3',
    target: 'r6',
    type: 'network',
    data: { metric: 2 },
  },
  // dolni rada
  {
    id: 'e4-5',
    source: 'r4',
    target: 'r5',
    type: 'network',
    data: { metric: 4 },
  },
  {
    id: 'e5-6',
    source: 'r5',
    target: 'r6',
    type: 'network',
    data: { metric: 1 },
  },
  // odnoz dolu
  {
    id: 'e5-7',
    source: 'r5',
    target: 'r7',
    type: 'network',
    data: { metric: 3 },
  },
];

// ziskani protokolu podle nazvu
function getProtocol(name: string): Protocol {
  if (name === 'OSPF') {
    return OSPFProtocol;
  }
  if (name === 'EIGRP') {
    return EIGRPProtocol;
  }
  return RIPProtocol;
}

// pocitadlo pro generovani unikatnich ID
let routerCounter = 8;

function AppContent() {
  // react flow stav
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);

  // stav simulace
  const [selectedProtocol, setSelectedProtocol] = useState('RIP');
  const [iteration, setIteration] = useState(0);
  const [isConverged, setIsConverged] = useState(false);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [routingTables, setRoutingTables] = useState<Record<string, RoutingEntry[]>>({});
  const [currentChanges, setCurrentChanges] = useState<Change[]>([]);
  const [simulationState, setSimulationState] = useState<NetworkState | null>(null);

  // pocitadlo pro particle animace na edgech
  const particleCounterRef = useRef(0);

  // stav nastaveni
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [backgroundType, setBackgroundType] = useState('dots');
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showMetrics, setShowMetrics] = useState(true);

  // stav topologie dialogu
  const [isTopologyOpen, setIsTopologyOpen] = useState(false);

  // ref pro aktualni rychlost animace — setTimeout callback cte z refu
  const animationSpeedRef = useRef(animationSpeed);

  // aktualizovat ref pri zmene animationSpeed
  useEffect(function () {
    animationSpeedRef.current = animationSpeed;
  }, [animationSpeed]);

  // prepnuti settings panelu
  function handleToggleSettings() {
    setIsSettingsOpen(function (current) {
      return !current;
    });
  }

  function handleCloseSettings() {
    setIsSettingsOpen(false);
  }

  // stav editoru
  const [selectedRouterId, setSelectedRouterId] = useState<string | null>(null);
  const [isPathMode, setIsPathMode] = useState(false);
  const [pathSource, setPathSource] = useState<string | null>(null);
  const [pathTarget, setPathTarget] = useState<string | null>(null);
  const [_highlightedPath, setHighlightedPath] = useState<string[]>([]);


  // rename dialog stav
  const [renameDialog, setRenameDialog] = useState<{
    isOpen: boolean;
    routerId: string;
    currentName: string;
  }>({
    isOpen: false,
    routerId: '',
    currentName: '',
  });

  // mouse pozice pro vizualni propojovaci caru
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);

  // ID routeru na ktery se cara snapne (hover pri connecting)
  const [snapTarget, setSnapTarget] = useState<string | null>(null);

  // context menu stav
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    routerId: string;
    routerLabel: string;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    routerId: '',
    routerLabel: '',
  });

  // metric dialog stav — edgeId je vyplnene pri editaci existujici hrany
  const [metricDialog, setMetricDialog] = useState<{
    isOpen: boolean;
    sourceId: string;
    targetId: string;
    sourceName: string;
    targetName: string;
    edgeId: string;
    defaultValue: number;
  }>({
    isOpen: false,
    sourceId: '',
    targetId: '',
    sourceName: '',
    targetName: '',
    edgeId: '',
    defaultValue: 1,
  });

  // edge context menu stav
  const [edgeContextMenu, setEdgeContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    edgeId: string;
    edgeLabel: string;
    edgeMetric: number;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    edgeId: '',
    edgeLabel: '',
    edgeMetric: 1,
  });

  // reference na simulacni engine
  const simulationRef = useRef<SimulationEngine | null>(null);

  // ref pro zastaveni Run All smycky
  const runAllTimerRef = useRef<number>(0);

  // prevod react flow nodu na RouterNode pro sidebar
  function getRouters(): RouterNodeType[] {
    return nodes.map(function (node) {
      return {
        id: node.id,
        label: (node.data as any).label || 'Router',
        position: { x: node.position.x, y: node.position.y },
      };
    });
  }

  // vybrany router objekt
  function getSelectedRouter(): RouterNodeType | null {
    if (selectedRouterId === null) {
      return null;
    }
    const node = nodes.find(function (n) { return n.id === selectedRouterId; });
    if (!node) {
      return null;
    }
    return {
      id: node.id,
      label: (node.data as any).label || 'Router',
      position: { x: node.position.x, y: node.position.y },
    };
  }

  // ==================================
  // EDITACNI AKCE
  // ==================================

  // pridat novy router na pozici (z drag & drop)
  function handleAddRouter(position: { x: number; y: number }) {
    const newId = 'r' + routerCounter;
    routerCounter = routerCounter + 1;

    const letterIndex = nodes.length;
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const letter = letterIndex < 26 ? letters[letterIndex] : 'R' + letterIndex;

    const newNode: Node = {
      id: newId,
      type: 'router',
      position: position,
      data: { label: 'Router ' + letter },
    };

    setNodes(function (currentNodes) {
      return [...currentNodes, newNode];
    });
  }

  // smazat router a vsechny jeho hrany
  function handleDeleteRouter(routerId: string) {
    setNodes(function (currentNodes) {
      return currentNodes.filter(function (node) {
        return node.id !== routerId;
      });
    });

    setEdges(function (currentEdges) {
      return currentEdges.filter(function (edge) {
        return edge.source !== routerId && edge.target !== routerId;
      });
    });

    // pokud smazany router byl vybrany, zrusit vyber
    if (selectedRouterId === routerId) {
      setSelectedRouterId(null);
    }

    setContextMenu(function (prev) {
      return { ...prev, isOpen: false };
    });
  }

  // otevrit rename dialog
  function handleRenameRouter(routerId: string) {
    const node = nodes.find(function (n) { return n.id === routerId; });
    if (!node) {
      return;
    }

    const currentLabel = (node.data as any).label || 'Router';
    setRenameDialog({
      isOpen: true,
      routerId: routerId,
      currentName: currentLabel,
    });

    setContextMenu(function (prev) {
      return { ...prev, isOpen: false };
    });
  }

  // potvrzeni prejmenování
  function handleRenameConfirm(newName: string) {
    setNodes(function (currentNodes) {
      return currentNodes.map(function (n) {
        if (n.id === renameDialog.routerId) {
          return { ...n, data: { ...n.data, label: newName } };
        }
        return n;
      });
    });

    setRenameDialog({ isOpen: false, routerId: '', currentName: '' });
  }

  // zruseni prejmenovani
  function handleRenameCancel() {
    setRenameDialog({ isOpen: false, routerId: '', currentName: '' });
  }

  // zahajit propojovani z context menu
  function handleStartConnect(routerId: string) {
    setContextMenu(function (prev) {
      return { ...prev, isOpen: false };
    });

    // oznacit routery ktere uz jsou propojene s timto routerem
    const connectedIds = new Set<string>();
    connectedIds.add(routerId); // sam sebe
    edges.forEach(function (e) {
      if (e.source === routerId) { connectedIds.add(e.target); }
      if (e.target === routerId) { connectedIds.add(e.source); }
    });

    setNodes(function (currentNodes) {
      return currentNodes.map(function (node) {
        return {
          ...node,
          data: { ...node.data, isAlreadyConnected: connectedIds.has(node.id) },
        };
      });
    });

    setConnectingFrom(routerId);
  }

  // stav pro manual connecting
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);

  // prepnuti rezimu vizualizace cesty
  function handleTogglePath() {
    setIsPathMode(function (current) {
      if (!current && selectedRouterId !== null) {
        // pri zapnuti path mode s vybranym routerem ho nastavit jako zdroj
        setPathSource(selectedRouterId);
        setPathTarget(null);
      } else {
        setPathSource(null);
        setPathTarget(null);
      }
      return !current;
    });
    setHighlightedPath([]);
    updateNodeHighlights([]);
    updateEdgeHighlights([]);
  }

  // propojeni dvou routeru (react flow callback)
  const handleConnect = useCallback(function (connection: Connection) {
    const sourceNode = nodes.find(function (n) { return n.id === connection.source; });
    const targetNode = nodes.find(function (n) { return n.id === connection.target; });

    if (!sourceNode || !targetNode) {
      return;
    }

    // kontrola zda uz propoj mezi temito routery existuje (v obou smerech)
    const alreadyConnected = edges.some(function (e) {
      return (e.source === connection.source && e.target === connection.target) ||
             (e.source === connection.target && e.target === connection.source);
    });

    if (alreadyConnected) {
      return;
    }

    setMetricDialog({
      isOpen: true,
      sourceId: connection.source,
      targetId: connection.target,
      sourceName: (sourceNode.data as any).label || 'Router',
      targetName: (targetNode.data as any).label || 'Router',
      edgeId: '',
      defaultValue: 1,
    });
  }, [nodes, edges]);

  // potvrzeni metriky v dialogu — nova hrana nebo editace existujici
  function handleMetricConfirm(metric: number) {
    if (metricDialog.edgeId) {
      // editace existujici hrany
      setEdges(function (currentEdges) {
        return currentEdges.map(function (e) {
          if (e.id === metricDialog.edgeId) {
            return { ...e, data: { ...e.data, metric: metric } };
          }
          return e;
        });
      });
    } else {
      // nova hrana
      const newEdge: Edge = {
        id: 'e' + metricDialog.sourceId + '-' + metricDialog.targetId,
        source: metricDialog.sourceId,
        target: metricDialog.targetId,
        type: 'network',
        data: { metric: metric },
      };
      setEdges(function (currentEdges) {
        return addEdge(newEdge, currentEdges);
      });
    }

    setMetricDialog({
      isOpen: false, sourceId: '', targetId: '',
      sourceName: '', targetName: '', edgeId: '', defaultValue: 1,
    });
  }

  // zavreni metric dialogu
  function handleMetricCancel() {
    setMetricDialog({
      isOpen: false, sourceId: '', targetId: '',
      sourceName: '', targetName: '', edgeId: '', defaultValue: 1,
    });
  }

  // pravy klik na hranu — edge context menu
  function handleEdgeContextMenu(event: React.MouseEvent, edge: Edge) {
    event.preventDefault();
    const sourceNode = nodes.find(function (n) { return n.id === edge.source; });
    const targetNode = nodes.find(function (n) { return n.id === edge.target; });
    const srcLabel = sourceNode ? (sourceNode.data as any).label : edge.source;
    const tgtLabel = targetNode ? (targetNode.data as any).label : edge.target;
    const metric = edge.data ? (edge.data as any).metric || 1 : 1;
    setEdgeContextMenu({
      isOpen: true,
      x: event.clientX,
      y: event.clientY,
      edgeId: edge.id,
      edgeLabel: srcLabel + ' — ' + tgtLabel,
      edgeMetric: metric,
    });
  }

  // editace metriky z edge context menu
  function handleEdgeEditMetric() {
    const edge = edges.find(function (e) { return e.id === edgeContextMenu.edgeId; });
    if (!edge) { return; }
    const sourceNode = nodes.find(function (n) { return n.id === edge.source; });
    const targetNode = nodes.find(function (n) { return n.id === edge.target; });
    setMetricDialog({
      isOpen: true,
      sourceId: edge.source,
      targetId: edge.target,
      sourceName: sourceNode ? (sourceNode.data as any).label : '',
      targetName: targetNode ? (targetNode.data as any).label : '',
      edgeId: edge.id,
      defaultValue: edgeContextMenu.edgeMetric,
    });
    setEdgeContextMenu(function (prev) { return { ...prev, isOpen: false }; });
  }

  // smazani hrany z edge context menu
  function handleEdgeDelete() {
    setEdges(function (currentEdges) {
      return currentEdges.filter(function (e) { return e.id !== edgeContextMenu.edgeId; });
    });
    setEdgeContextMenu(function (prev) { return { ...prev, isOpen: false }; });
  }

  // pravy klik na node — otevre context menu
  function handleNodeContextMenu(event: React.MouseEvent, node: Node) {
    event.preventDefault();
    setContextMenu({
      isOpen: true,
      x: event.clientX,
      y: event.clientY,
      routerId: node.id,
      routerLabel: (node.data as any).label || 'Router',
    });
  }

  // zavreni context menu
  function handleContextMenuClose() {
    setContextMenu(function (prev) {
      return { ...prev, isOpen: false };
    });
  }

  // kliknuti na node
  function handleNodeClick(_event: React.MouseEvent, node: Node) {
    // pokud jsme v connecting mode, propojit
    if (connectingFrom !== null && connectingFrom !== node.id) {
      // kontrola duplicitniho propojeni
      const alreadyConnected = edges.some(function (e) {
        return (e.source === connectingFrom && e.target === node.id) ||
               (e.source === node.id && e.target === connectingFrom);
      });

      if (!alreadyConnected) {
        const sourceNode = nodes.find(function (n) { return n.id === connectingFrom; });
        if (sourceNode) {
          setMetricDialog({
            isOpen: true,
            sourceId: connectingFrom,
            targetId: node.id,
            sourceName: (sourceNode.data as any).label || 'Router',
            targetName: (node.data as any).label || 'Router',
            edgeId: '',
            defaultValue: 1,
          });
        }
      }
      setConnectingFrom(null);
      setSnapTarget(null);
      setMousePosition(null);
      // vymazat flagy propojeni z nodu
      setNodes(function (cn) {
        return cn.map(function (n) {
          return { ...n, data: { ...n.data, isAlreadyConnected: false } };
        });
      });
      return;
    }

    if (isPathMode) {
      if (pathSource === null) {
        setPathSource(node.id);
        return;
      }
      if (pathTarget === null && node.id !== pathSource) {
        setPathTarget(node.id);
        findAndHighlightPath(pathSource, node.id);
        return;
      }
      setPathSource(node.id);
      setPathTarget(null);
      setHighlightedPath([]);
      updateNodeHighlights([]);
      updateEdgeHighlights([]);
      return;
    }

    setSelectedRouterId(node.id);
  }

  // kliknuti na prazdne platno
  function handlePaneClick() {
    if (connectingFrom !== null) {
      setConnectingFrom(null);
      setSnapTarget(null);
      setMousePosition(null);
      setNodes(function (cn) {
        return cn.map(function (n) {
          return { ...n, data: { ...n.data, isAlreadyConnected: false } };
        });
      });
      return;
    }
    if (!isPathMode) {
      setSelectedRouterId(null);
    }
    // po konvergenci vycistit vizualni stav kliknutim na canvas
    if (isConverged) {
      clearNodeHighlights();
    }
  }

  // po pretazeni nodu
  function handleNodeDragStop(_event: React.MouseEvent, _node: Node) {
    // pozice se automaticky aktualizuje
  }

  // ==================================
  // SIMULACE
  // ==================================

  function initializeEngine(): SimulationEngine {
    const engine = createSimulation();
    const protocol = getProtocol(selectedProtocol);
    simSetProtocol(engine, protocol);

    const networkState = convertToNetworkState(nodes, edges);
    simReset(engine, networkState.routers, networkState.links);

    return engine;
  }

  // aktualni faze OSPF pro vizualizaci
  const [ospfPhase, setOspfPhase] = useState<string>('');

  function handleStep() {
    let engine = simulationRef.current;
    if (engine === null || iteration === 0) {
      engine = initializeEngine();
      simulationRef.current = engine;
    }

    const result = simStep(engine);
    if (result === null) {
      setIsConverged(true);
      return;
    }

    const currentPhase = result.phase || '';
    setOspfPhase(currentPhase);
    setIteration(result.iteration);
    setRoutingTables({ ...result.state.routingTables });
    setCurrentChanges([...result.changes]);
    setSimulationState(result.state);
    setIsConverged(simIsConverged(engine));
    updateNodeChanges(result.changes);

    if (selectedProtocol === 'OSPF' && currentPhase === 'dijkstra') {
      // faze 3: computing animace na nodech
      triggerDijkstraAnimation();
    } else if (selectedProtocol === 'OSPF' && currentPhase === 'lsa-flooding') {
      // faze 2: staggered flooding animace
      triggerFloodingAnimation();
    } else if (selectedProtocol === 'OSPF' && currentPhase === 'neighbor-discovery') {
      // faze 1: discovery — s vyberem jen sousedni hrany, bez vyberu vsechny
      if (selectedRouterId !== null) {
        triggerParticles(1, selectedProtocol, result.changes);
      } else {
        triggerAllEdgesPills();
      }
    } else {
      triggerParticles(result.iteration, selectedProtocol, result.changes);
    }
  }

  function handleRunAll() {
    let engine = simulationRef.current;
    if (engine === null || iteration === 0) {
      engine = initializeEngine();
      simulationRef.current = engine;
    }

    setIsSimulationRunning(true);

    function getStepDelay(phase: string): number {
      var speed = animationSpeedRef.current;
      // faze 2 flooding ma staggered animaci — delsi delay
      if (selectedProtocol === 'OSPF' && phase === 'lsa-flooding') {
        // odhad: prumer grafu * 800ms + buffer
        var maxDist = 1;
        for (var ni = 0; ni < nodes.length; ni++) {
          var dist: Record<string, number> = {};
          var bfsQ: string[] = [nodes[ni].id];
          dist[nodes[ni].id] = 0;
          while (bfsQ.length > 0) {
            var cur = bfsQ.shift()!;
            edges.forEach(function (e) {
              var nb: string | null = null;
              if (e.source === cur && dist[e.target] === undefined) { nb = e.target; }
              else if (e.target === cur && dist[e.source] === undefined) { nb = e.source; }
              if (nb !== null) { dist[nb] = dist[cur] + 1; bfsQ.push(nb); }
            });
          }
          for (var k of Object.keys(dist)) {
            if (dist[k] > maxDist) { maxDist = dist[k]; }
          }
        }
        return (maxDist * 800 + 400) / speed;
      }
      if (selectedProtocol === 'OSPF' && phase === 'dijkstra') {
        return 2000 / speed;
      }
      return 1200 / speed;
    }

    function runNextStep() {
      if (simIsConverged(engine!)) {
        setIsSimulationRunning(false);
        setIsConverged(true);
        return;
      }

      const result = simStep(engine!);
      if (result === null) {
        setIsSimulationRunning(false);
        setIsConverged(true);
        return;
      }

      const currentPhase = result.phase || '';
      setOspfPhase(currentPhase);
      setIteration(result.iteration);
      setRoutingTables({ ...result.state.routingTables });
      setCurrentChanges([...result.changes]);
      setSimulationState(result.state);
      updateNodeChanges(result.changes);

      // OSPF phase-aware animace
      if (selectedProtocol === 'OSPF' && currentPhase === 'dijkstra') {
        triggerDijkstraAnimation();
      } else if (selectedProtocol === 'OSPF' && currentPhase === 'lsa-flooding') {
        triggerFloodingAnimation();
      } else if (selectedProtocol === 'OSPF' && currentPhase === 'neighbor-discovery') {
        if (selectedRouterId !== null) {
          triggerParticles(1, selectedProtocol, result.changes);
        } else {
          triggerAllEdgesPills();
        }
      } else {
        triggerParticles(result.iteration, selectedProtocol, result.changes);
      }

      if (simIsConverged(engine!)) {
        setIsSimulationRunning(false);
        setIsConverged(true);
        return;
      }

      runAllTimerRef.current = window.setTimeout(runNextStep, getStepDelay(currentPhase));
    }

    runNextStep();
  }

  // vycistit vizualni stav nodu po konvergenci
  function clearNodeHighlights() {
    setCurrentChanges([]);
    setNodes(function (currentNodes) {
      return currentNodes.map(function (node) {
        return {
          ...node,
          data: { ...node.data, isChanged: false, isDiscovered: false, isComputing: false },
        };
      });
    });
  }

  function handleReset() {
    // zastavit probiahajici Run All
    clearTimeout(runAllTimerRef.current);
    runAllTimerRef.current = 0;
    simulationRef.current = null;
    setIteration(0);
    setIsConverged(false);
    setIsSimulationRunning(false);
    setRoutingTables({});
    setCurrentChanges([]);
    setSimulationState(null);
    setPathSource(null);
    setPathTarget(null);
    setHighlightedPath([]);
    setOspfPhase('');

    setNodes(function (currentNodes) {
      return currentNodes.map(function (node) {
        return {
          ...node,
          data: { ...node.data, isChanged: false, isPathHighlighted: false, isDiscovered: false, isComputing: false },
        };
      });
    });

    setEdges(function (currentEdges) {
      return currentEdges.map(function (edge) {
        return {
          ...edge,
          data: { ...edge.data, isChanged: false, isPathHighlighted: false },
        };
      });
    });
  }

  function handleProtocolChange(protocol: string) {
    setSelectedProtocol(protocol);
    handleReset();
  }

  // ==================================
  // VIZUALNI ZVYRAZNENI
  // ==================================

  function updateNodeChanges(changes: Change[]) {
    // routery kterym se zmenila tabulka (globalni zmeny — zlute zvyrazneni)
    const changedRouterIds = new Set<string>();
    changes.forEach(function (change) {
      changedRouterIds.add(change.routerId);
    });

    // routery ktere vybrany router prave objevil (teal zvyrazneni)
    const discoveredNodeIds = new Set<string>();
    if (selectedRouterId !== null) {
      changes.forEach(function (change) {
        if (change.routerId === selectedRouterId) {
          discoveredNodeIds.add(change.entry.destination);
        }
      });
      // odebrat sam sebe z discovered
      discoveredNodeIds.delete(selectedRouterId);
    }

    setNodes(function (currentNodes) {
      return currentNodes.map(function (node) {
        let showChanged = false;
        let showDiscovered = false;

        if (selectedRouterId !== null) {
          // rezimu vyberu — jen vybrany router sviti zlute, objevene teal
          showChanged = node.id === selectedRouterId && changedRouterIds.has(node.id);
          showDiscovered = discoveredNodeIds.has(node.id);
        } else if (selectedProtocol !== 'OSPF') {
          // globalni rezim (RIP/EIGRP) — vsechny zmenene routery zlute
          showChanged = changedRouterIds.has(node.id);
        }
        // OSPF bez vyberu — zadne zlute, vizualizace pres faze

        return {
          ...node,
          data: {
            ...node.data,
            isChanged: showChanged,
            isDiscovered: showDiscovered,
          },
        };
      });
    });
  }

  interface PillInfo {
    label: string;
    outgoing: boolean;
    reverse: boolean;
  }

  // spustit pill animaci — na zaklade zmen v tabulkach
  function triggerParticles(_stepIteration: number, _protocol: string, stepChanges: Change[]) {
    particleCounterRef.current = particleCounterRef.current + 1;
    const currentKey = particleCounterRef.current;

    function getRouterLabelLocal(routerId: string): string {
      var n = nodes.find(function (nd) { return nd.id === routerId; });
      if (n && n.data && n.data.label) {
        return String(n.data.label).replace('Router ', '');
      }
      return routerId;
    }

    const localEdgePills: Record<string, PillInfo[]> = {};
    for (const edge of edges) {
      localEdgePills[edge.id] = [];
    }

    // Projdeme vsechny zmeny v tomto kroku simulace
    for (const change of stepChanges) {
      if (change.type === 'added' || change.type === 'updated') {
        const sender = change.entry.nextHop;
        const receiver = change.routerId;
        const dest = change.entry.destination;

        // Pokud je vybran router, animujeme pouze informace tykajici se jeho
        if (selectedRouterId !== null && dest !== selectedRouterId) {
          continue;
        }

        // Najdeme hranu odpovidajici tomuto spojeni
        for (const edge of edges) {
          if (edge.source === sender && edge.target === receiver) {
            localEdgePills[edge.id].push({
              label: getRouterLabelLocal(dest),
              outgoing: false,
              reverse: false
            });
            break;
          } else if (edge.target === sender && edge.source === receiver) {
            localEdgePills[edge.id].push({
              label: getRouterLabelLocal(dest),
              outgoing: false,
              reverse: true
            });
            break;
          }
        }
      }
    }

    setEdges(function (currentEdges) {
      return currentEdges.map(function (edge) {
        if (localEdgePills[edge.id] && localEdgePills[edge.id].length > 0) {
          return {
            ...edge,
            data: {
              ...edge.data,
              particleKey: currentKey,
              particlePills: localEdgePills[edge.id],
              particleTarget: edge.target,
            },
          };
        }
        return edge;
      });
    });

    // zvyraznit routery, ktere prave dostaly novou/lepsi informaci v tomto kroku
    setNodes(function (currentNodes) {
      return currentNodes.map(function (node) {
        let isNodeChanged = false;
        for (const change of stepChanges) {
          if (change.routerId === node.id && (change.type === 'added' || change.type === 'updated')) {
            if (selectedRouterId === null || change.entry.destination === selectedRouterId) {
              isNodeChanged = true;
              break;
            }
          }
        }
        if (isNodeChanged) {
          return { ...node, data: { ...node.data, isDiscovered: true } };
        }
        return node;
      });
    });

    // vymazat pills po animaci
    setTimeout(function () {
      setEdges(function (currentEdges) {
        return currentEdges.map(function (edge) {
          if (edge.data && (edge.data as any).particleKey === currentKey) {
            return {
              ...edge,
              data: { ...edge.data, particleKey: 0, particlePills: undefined },
            };
          }
          return edge;
        });
      });
    }, 1100 / animationSpeedRef.current);
  }

  // OSPF faze 2 — flooding
  function triggerFloodingAnimation() {
    particleCounterRef.current = particleCounterRef.current + 1;

    // bez vybraneho routeru — kazdy router flooduje svu LSA po BFS vrstvach
    if (selectedRouterId === null) {
      function getLabel(nodeId: string): string {
        var n = nodes.find(function (nd) { return nd.id === nodeId; });
        if (n && n.data && n.data.label) { return String(n.data.label).replace('Router ', ''); }
        return nodeId;
      }

      // BFS od kazdeho routeru — vzdalenosti
      var allDistances: Record<string, Record<string, number>> = {};
      var diameter = 1;
      for (var ni = 0; ni < nodes.length; ni++) {
        var routerId = nodes[ni].id;
        var dist: Record<string, number> = {};
        var bfsQ: string[] = [routerId];
        dist[routerId] = 0;
        while (bfsQ.length > 0) {
          var cur = bfsQ.shift()!;
          edges.forEach(function (e) {
            var nb: string | null = null;
            if (e.source === cur && dist[e.target] === undefined) { nb = e.target; }
            else if (e.target === cur && dist[e.source] === undefined) { nb = e.source; }
            if (nb !== null) { dist[nb] = dist[cur] + 1; bfsQ.push(nb); }
          });
        }
        allDistances[routerId] = dist;
        for (var dKey of Object.keys(dist)) {
          if (dist[dKey] > diameter) { diameter = dist[dKey]; }
        }
      }

      // pro kazdy BFS layer spustime pills vsech routeru na te vrstve
      for (var layer = 1; layer <= diameter; layer++) {
        (function (capturedLayer) {
          setTimeout(function () {
            particleCounterRef.current = particleCounterRef.current + 1;
            var layerKey = particleCounterRef.current;

            var edgePills: Record<string, { label: string; outgoing: boolean; reverse: boolean }[]> = {};
            var edgeDirections: Record<string, string> = {};

            edges.forEach(function (edgeItem) {
              var edgeId = edgeItem.id;

              // pro kazdy router zkontroluj jestli tato hrana je na jeho vrstve
              for (var ri = 0; ri < nodes.length; ri++) {
                var rid = nodes[ri].id;
                var dists = allDistances[rid];
                var sDist = dists[edgeItem.source] !== undefined ? dists[edgeItem.source] : 999;
                var tDist = dists[edgeItem.target] !== undefined ? dists[edgeItem.target] : 999;

                var isFrontier =
                  (sDist === capturedLayer - 1 && tDist === capturedLayer) ||
                  (tDist === capturedLayer - 1 && sDist === capturedLayer);

                if (isFrontier) {
                  if (!edgePills[edgeId]) { edgePills[edgeId] = []; }
                  // smer: pill jde od blizssiho k vzdalejsimu
                  var fartherNode = sDist <= tDist ? edgeItem.target : edgeItem.source;
                  // nastavit direction pro prvni pill na tomto edge
                  if (!edgeDirections[edgeId]) {
                    edgeDirections[edgeId] = fartherNode;
                  }
                  // reverse = pill jde opacnym smerem nez particleTarget
                  var needsReverse = fartherNode !== edgeDirections[edgeId];
                  edgePills[edgeId].push({ label: getLabel(rid), outgoing: false, reverse: needsReverse });
                }
              }
            });

            setEdges(function (currentEdges) {
              return currentEdges.map(function (edge) {
                if (edgePills[edge.id] && edgePills[edge.id].length > 0) {
                  return {
                    ...edge,
                    data: {
                      ...edge.data,
                      particleKey: layerKey,
                      particlePills: edgePills[edge.id],
                      particleTarget: edgeDirections[edge.id],
                    },
                  };
                }
                return edge;
              });
            });

            // vymazat po animaci
            setTimeout(function () {
              setEdges(function (currentEdges) {
                return currentEdges.map(function (edge) {
                  if (edge.data && (edge.data as any).particleKey === layerKey) {
                    return { ...edge, data: { ...edge.data, particleKey: 0, particlePills: undefined } };
                  }
                  return edge;
                });
              });
            }, 1100 / animationSpeedRef.current);
          }, (capturedLayer - 1) * 800 / animationSpeedRef.current);
        })(layer);
      }
      return;
    }

    // s vybranym routerem — staggered pills po BFS vrstvach
    var centerId = selectedRouterId;

    // BFS od centra
    const distances: Record<string, number> = {};
    const queue: string[] = [centerId];
    distances[centerId] = 0;

    while (queue.length > 0) {
      const current = queue.shift()!;
      edges.forEach(function (edge) {
        let neighbor: string | null = null;
        if (edge.source === current && distances[edge.target] === undefined) {
          neighbor = edge.target;
        } else if (edge.target === current && distances[edge.source] === undefined) {
          neighbor = edge.source;
        }
        if (neighbor !== null) {
          distances[neighbor] = distances[current] + 1;
          queue.push(neighbor);
        }
      });
    }

    let maxDist = 0;
    for (const id of Object.keys(distances)) {
      if (distances[id] > maxDist) { maxDist = distances[id]; }
    }

    function getRouterLabel(routerId: string): string {
      const node = nodes.find(function (n) { return n.id === routerId; });
      if (node && node.data && node.data.label) {
        return String(node.data.label).replace('Router ', '');
      }
      return routerId;
    }

    // pro kazdou vrstvu BFS spustime pills se zpozdenimfor
    for (let layer = 1; layer <= maxDist; layer++) {
      const layerDelay = (layer - 1) * 700;
      const capturedLayer = layer;

      setTimeout(function () {
        particleCounterRef.current = particleCounterRef.current + 1;
        const layerKey = particleCounterRef.current;

        const layerPills: Record<string, { label: string; outgoing: boolean }[]> = {};
        const layerDirections: Record<string, string> = {};

        edges.forEach(function (edgeItem) {
          const sourceDist = distances[edgeItem.source] !== undefined ? distances[edgeItem.source] : 999;
          const targetDist = distances[edgeItem.target] !== undefined ? distances[edgeItem.target] : 999;

          const isFrontier =
            (sourceDist === capturedLayer - 1 && targetDist === capturedLayer) ||
            (targetDist === capturedLayer - 1 && sourceDist === capturedLayer);

          if (isFrontier) {
            const edgeId = edgeItem.id;
            if (!layerPills[edgeId]) { layerPills[edgeId] = []; }
            const fartherNode = sourceDist <= targetDist ? edgeItem.target : edgeItem.source;
            layerPills[edgeId].push({ label: getRouterLabel(centerId!), outgoing: false });
            layerDirections[edgeId] = fartherNode;
          }
        });

        setEdges(function (currentEdges) {
          return currentEdges.map(function (edge) {
            if (layerPills[edge.id] && layerPills[edge.id].length > 0) {
              return {
                ...edge,
                data: {
                  ...edge.data,
                  particleKey: layerKey,
                  particlePills: layerPills[edge.id],
                  particleTarget: layerDirections[edge.id],
                },
              };
            }
            return edge;
          });
        });

        // zvyraznit routery ktere prave prijimaji LSA (BFS dist == capturedLayer)
        if (selectedRouterId !== null) {
          var receivingNodes = new Set<string>();
          for (var nodeId of Object.keys(distances)) {
            if (distances[nodeId] === capturedLayer) {
              receivingNodes.add(nodeId);
            }
          }
          setNodes(function (currentNodes) {
            return currentNodes.map(function (node) {
              if (receivingNodes.has(node.id)) {
                return { ...node, data: { ...node.data, isDiscovered: true } };
              }
              return node;
            });
          });
        }

        // vymazat po animaci
        setTimeout(function () {
          setEdges(function (currentEdges) {
            return currentEdges.map(function (edge) {
              if (edge.data && (edge.data as any).particleKey === layerKey) {
                return {
                  ...edge,
                  data: { ...edge.data, particleKey: 0, particlePills: undefined },
                };
              }
              return edge;
            });
          });
        }, 1100 / animationSpeedRef.current);
      }, layerDelay / animationSpeedRef.current);
    }
  }

  // OSPF — pills na VSECH hranach, oba smery zaroven
  function triggerAllEdgesPills() {
    particleCounterRef.current = particleCounterRef.current + 1;
    const currentKey = particleCounterRef.current;

    function getLabel(nodeId: string): string {
      const node = nodes.find(function (n) { return n.id === nodeId; });
      if (node && node.data && node.data.label) {
        return String(node.data.label).replace('Router ', '');
      }
      return nodeId;
    }

    setEdges(function (currentEdges) {
      return currentEdges.map(function (edge) {
        return {
          ...edge,
          data: {
            ...edge.data,
            particleKey: currentKey,
            particlePills: [
              { label: getLabel(edge.source), outgoing: false, reverse: false },
              { label: getLabel(edge.target), outgoing: false, reverse: true },
            ],
            particleTarget: edge.target,
          },
        };
      });
    });

    // vymazat po animaci
    setTimeout(function () {
      setEdges(function (currentEdges) {
        return currentEdges.map(function (edge) {
          if (edge.data && (edge.data as any).particleKey === currentKey) {
            return { ...edge, data: { ...edge.data, particleKey: 0, particlePills: undefined } };
          }
          return edge;
        });
      });
    }, 1100 / animationSpeedRef.current);
  }

  // OSPF faze 3 — Dijkstra: computing animace
  function triggerDijkstraAnimation() {
    // s vybranym routerem — jen ten, bez vyberu — vsechny
    setNodes(function (currentNodes) {
      return currentNodes.map(function (node) {
        var shouldCompute = selectedRouterId === null || node.id === selectedRouterId;
        if (shouldCompute) {
          return { ...node, data: { ...node.data, isComputing: true } };
        }
        return node;
      });
    });

    // po 1.5s odebrat animaci
    setTimeout(function () {
      setNodes(function (currentNodes) {
        return currentNodes.map(function (node) {
          return { ...node, data: { ...node.data, isComputing: false } };
        });
      });
    }, 1500 / animationSpeedRef.current);
  }

  function updateNodeHighlights(pathNodeIds: string[]) {
    const pathSet = new Set(pathNodeIds);
    setNodes(function (currentNodes) {
      return currentNodes.map(function (node) {
        return {
          ...node,
          data: { ...node.data, isPathHighlighted: pathSet.has(node.id) },
        };
      });
    });
  }

  function updateEdgeHighlights(pathNodeIds: string[]) {
    setEdges(function (currentEdges) {
      return currentEdges.map(function (edge) {
        let isOnPath = false;
        for (let i = 0; i < pathNodeIds.length - 1; i++) {
          const from = pathNodeIds[i];
          const to = pathNodeIds[i + 1];
          if (
            (edge.source === from && edge.target === to) ||
            (edge.source === to && edge.target === from)
          ) {
            isOnPath = true;
            break;
          }
        }
        return {
          ...edge,
          data: { ...edge.data, isPathHighlighted: isOnPath },
        };
      });
    });
  }

  function findAndHighlightPath(sourceId: string, targetId: string) {
    let engine = simulationRef.current;

    if (engine === null || !simulationState) {
      engine = initializeEngine();
      simulationRef.current = engine;

      let lastResult: SimulationStep | null = null;
      while (!simIsConverged(engine)) {
        lastResult = simStep(engine);
        if (lastResult === null) {
          break;
        }
      }
      if (lastResult) {
        setIteration(lastResult.iteration);
        setRoutingTables({ ...lastResult.state.routingTables });
        setSimulationState(lastResult.state);
        setIsConverged(true);
      }
    }

    const path = simFindPath(engine, sourceId, targetId);
    setHighlightedPath(path);
    updateNodeHighlights(path);
    updateEdgeHighlights(path);
  }

  function handleSelectRouter(routerId: string) {
    setSelectedRouterId(routerId);
    setNodes(function (currentNodes) {
      return currentNodes.map(function (node) {
        return { ...node, selected: node.id === routerId };
      });
    });
  }

  // data pro sidebar
  const routers = getRouters();
  const selectedRouter = getSelectedRouter();
  const selectedEntries = selectedRouterId && routingTables[selectedRouterId]
    ? routingTables[selectedRouterId]
    : [];

  // css trida pro connecting mode
  const canvasClass = connectingFrom !== null ? 'canvas-wrapper connecting-mode' : 'canvas-wrapper';

  // ==================================
  // EXPORT / IMPORT TOPOLOGIE
  // ==================================

  function handleExport() {
    // sestavit čistý JSON z nodes a edges
    var exportData = {
      version: 1,
      routers: nodes.map(function (node) {
        return {
          id: node.id,
          label: (node.data as any).label || 'Router',
          position: {
            x: Math.round(node.position.x),
            y: Math.round(node.position.y),
          },
        };
      }),
      links: edges.map(function (edge) {
        return {
          source: edge.source,
          target: edge.target,
          metric: (edge.data as any)?.metric || 1,
        };
      }),
    };

    var json = JSON.stringify(exportData, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);

    var a = document.createElement('a');
    a.href = url;
    a.download = 'topologie.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(json: string) {
    try {
      var data = JSON.parse(json);

      if (!data.routers || !data.links) {
        alert('Neplatný formát souboru — chybí "routers" nebo "links".');
        return;
      }

      // převést na React Flow nodes
      var newNodes: Node[] = data.routers.map(function (r: any) {
        return {
          id: r.id,
          type: 'router',
          position: { x: r.position.x, y: r.position.y },
          data: { label: r.label },
        };
      });

      // převést na React Flow edges
      var linkCounter = 0;
      var newEdges: Edge[] = data.links.map(function (l: any) {
        linkCounter++;
        return {
          id: 'e-import-' + linkCounter,
          source: l.source,
          target: l.target,
          type: 'network',
          data: { metric: l.metric || 1 },
        };
      });

      // aktualizovat counter pro nové routery
      var maxNum = 0;
      newNodes.forEach(function (n) {
        var match = n.id.match(/^r(\d+)$/);
        if (match) {
          var num = parseInt(match[1], 10);
          if (num > maxNum) { maxNum = num; }
        }
      });
      routerCounter = maxNum + 1;

      // nastavit nový stav
      setNodes(newNodes);
      setEdges(newEdges);

      // resetovat simulaci
      setIteration(0);
      setIsConverged(false);
      setIsSimulationRunning(false);
      setRoutingTables({});
      setCurrentChanges([]);
      setSimulationState(null);
      simulationRef.current = null;
      setSelectedRouterId(null);
      setIsPathMode(false);
      setPathSource(null);
      setPathTarget(null);
      setHighlightedPath([]);
    } catch (e) {
      alert('Chyba při čtení souboru: ' + (e as Error).message);
    }
  }

  // načtení předdefinované topologie
  function handleLoadPreset(preset: { routers: { id: string; label: string; position: { x: number; y: number } }[]; links: { source: string; target: string; metric: number }[] }) {
    var newNodes: Node[] = preset.routers.map(function (r) {
      return {
        id: r.id,
        type: 'router' as const,
        position: { x: r.position.x, y: r.position.y },
        data: { label: r.label },
      };
    });

    var counter = 0;
    var newEdges: Edge[] = preset.links.map(function (l) {
      counter++;
      return {
        id: 'e-preset-' + counter,
        source: l.source,
        target: l.target,
        type: 'network' as const,
        data: { metric: l.metric || 1 },
      };
    });

    var maxNum = 0;
    newNodes.forEach(function (n) {
      var match = n.id.match(/^r(\d+)$/);
      if (match) {
        var num = parseInt(match[1], 10);
        if (num > maxNum) { maxNum = num; }
      }
    });
    routerCounter = maxNum + 1;

    setNodes(newNodes);
    setEdges(newEdges);
    setIteration(0);
    setIsConverged(false);
    setIsSimulationRunning(false);
    setRoutingTables({});
    setCurrentChanges([]);
    setSimulationState(null);
    simulationRef.current = null;
    setSelectedRouterId(null);
    setIsPathMode(false);
    setPathSource(null);
    setPathTarget(null);
    setHighlightedPath([]);
  }

  return (
    <div className="app-layout" style={{ '--pill-speed': (1.05 / animationSpeed) + 's' } as React.CSSProperties}>
      {/* mobilni varovani — zobrazi se jen na mensich displejich pres CSS */}
      <div className="mobile-warning-overlay">
        <div className="mobile-warning-content">
          <div className="mobile-warning-icon">
            <NetworkIcon size={48} className="text-primary" />
          </div>
          <h2>Mobilní verze není k dispozici</h2>
          <p>Tento simulátor směrovacích protokolů a grafický editor síťových topologií vyžaduje velkou obrazovku a přesné ovládání myší.</p>
          <p>Otevřete prosím aplikaci na <strong>počítači (PC) nebo notebooku</strong>.</p>
        </div>
      </div>

      <Toolbar
        onToggleSettings={handleToggleSettings}
        isSettingsOpen={isSettingsOpen}
        onOpenTopology={function () { setIsTopologyOpen(true); }}
      />

      {/* nastaveni panel — dropdown pod toolbar */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={handleCloseSettings}
        background={backgroundType}
        onBackgroundChange={setBackgroundType}
        animationSpeed={animationSpeed}
        onAnimationSpeedChange={setAnimationSpeed}
        snapToGrid={snapToGrid}
        onSnapToGridChange={setSnapToGrid}
        showMetrics={showMetrics}
        onShowMetricsChange={setShowMetrics}
      />

      <div className="app-body">
        <Sidebar
          selectedRouter={selectedRouter}
          routingEntries={selectedEntries}
          changes={currentChanges}
          routers={routers}
          protocolName={selectedProtocol}
          iteration={iteration}
          onSelectRouter={handleSelectRouter}
          onTogglePath={handleTogglePath}
          pathSource={pathSource}
          pathTarget={pathTarget}
          isPathMode={isPathMode}
          allRoutingTables={routingTables}
          allChanges={currentChanges}
        />

        <div
          className={canvasClass}
          onMouseMove={function handleMouseMove(e) {
            if (connectingFrom === null) {
              return;
            }
            setMousePosition({ x: e.clientX, y: e.clientY });

            // zjistit jestli mys je nad nejakym routerem (snap detekce)
            const target = e.target as HTMLElement;
            const nodeEl = target.closest('.react-flow__node');
            if (nodeEl) {
              const nodeId = nodeEl.getAttribute('data-id');
              if (nodeId && nodeId !== connectingFrom) {
                // nesnap na uz propojeny router
                const isAlready = edges.some(function (e) {
                  return (e.source === connectingFrom && e.target === nodeId) ||
                         (e.source === nodeId && e.target === connectingFrom);
                });
                if (!isAlready) {
                  setSnapTarget(nodeId);
                  return;
                }
              }
            }
            setSnapTarget(null);
          }}
        >
          <Canvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            onNodeDragStop={handleNodeDragStop}
            onDropRouter={handleAddRouter}
            onNodeContextMenu={handleNodeContextMenu}
            onEdgeContextMenu={handleEdgeContextMenu}
            backgroundType={backgroundType}
            snapToGrid={snapToGrid}
            showMetrics={showMetrics}
          />

          {/* vizualni propojovaci cara za kurzorem */}
          {connectingFrom !== null && mousePosition !== null && (
            <svg
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 10,
              }}
            >
              {(function renderConnectionLine() {
                // najit zdrojovy node
                const sourceEl = document.querySelector('[data-id="' + connectingFrom + '"]');
                if (!sourceEl) {
                  return null;
                }
                const sourceRect = sourceEl.getBoundingClientRect();
                const wrapperEl = sourceEl.closest('.canvas-wrapper');
                if (!wrapperEl) {
                  return null;
                }
                const wrapperRect = wrapperEl.getBoundingClientRect();

                // stred zdrojoveho nodu
                const sx = sourceRect.left + sourceRect.width / 2 - wrapperRect.left;
                const sy = sourceRect.top + sourceRect.height / 2 - wrapperRect.top;

                // cilovy bod — snap na router nebo mys
                let tx = mousePosition.x - wrapperRect.left;
                let ty = mousePosition.y - wrapperRect.top;
                let snapped = false;

                if (snapTarget !== null) {
                  const targetEl = document.querySelector('[data-id="' + snapTarget + '"]');
                  if (targetEl) {
                    const targetRect = targetEl.getBoundingClientRect();
                    tx = targetRect.left + targetRect.width / 2 - wrapperRect.left;
                    ty = targetRect.top + targetRect.height / 2 - wrapperRect.top;
                    snapped = true;
                  }
                }

                return (
                  <React.Fragment>
                    {/* propojovaci cara */}
                    <line
                      x1={sx}
                      y1={sy}
                      x2={tx}
                      y2={ty}
                      stroke="var(--primary)"
                      strokeWidth={2}
                      strokeDasharray={snapped ? 'none' : '6 4'}
                      opacity={snapped ? 1 : 0.7}
                    />

                    {/* snap tecka na cilovem routeru */}
                    {snapped && (
                      <React.Fragment>
                        <circle
                          cx={tx}
                          cy={ty}
                          r={8}
                          fill="var(--primary)"
                          opacity={0.2}
                        />
                        <circle
                          cx={tx}
                          cy={ty}
                          r={4}
                          fill="var(--primary)"
                        />
                      </React.Fragment>
                    )}
                  </React.Fragment>
                );
              })()}
            </svg>
          )}

          <FloatingBar
            selectedProtocol={selectedProtocol}
            onStep={handleStep}
            onRunAll={handleRunAll}
            onReset={handleReset}
            iteration={iteration}
            isConverged={isConverged}
            isSimulationRunning={isSimulationRunning}
            ospfPhase={ospfPhase}
            protocolSelectComponent={
              <ProtocolSelect
                value={selectedProtocol}
                onChange={handleProtocolChange}
              />
            }
          />
        </div>
      </div>

      {/* context menu — pravy klik na router */}
      <ContextMenu
        isOpen={contextMenu.isOpen}
        x={contextMenu.x}
        y={contextMenu.y}
        routerId={contextMenu.routerId}
        routerLabel={contextMenu.routerLabel}
        onConnect={handleStartConnect}
        onRename={handleRenameRouter}
        onDelete={handleDeleteRouter}
        onClose={handleContextMenuClose}
      />

      {/* context menu — pravy klik na hranu */}
      {edgeContextMenu.isOpen && (
        <>
          <div
            className="context-menu-overlay"
            onMouseDown={function () { setEdgeContextMenu(function (prev) { return { ...prev, isOpen: false }; }); }}
          />
          <div className="context-menu" style={{ left: edgeContextMenu.x, top: edgeContextMenu.y }}>
            <div className="dropdown-menu">
              <div className="context-menu-header">{edgeContextMenu.edgeLabel}</div>
              <div className="dropdown-item" onClick={handleEdgeEditMetric}>
                Změnit metriku
              </div>
              <div className="context-menu-separator" />
              <div className="dropdown-item danger" onClick={handleEdgeDelete}>
                Smazat propoj
              </div>
            </div>
          </div>
        </>
      )}

      <MetricDialog
        isOpen={metricDialog.isOpen}
        sourceName={metricDialog.sourceName}
        targetName={metricDialog.targetName}
        defaultValue={metricDialog.defaultValue}
        onConfirm={handleMetricConfirm}
        onCancel={handleMetricCancel}
      />

      <RenameDialog
        isOpen={renameDialog.isOpen}
        currentName={renameDialog.currentName}
        onConfirm={handleRenameConfirm}
        onCancel={handleRenameCancel}
      />

      <TopologyDialog
        isOpen={isTopologyOpen}
        onClose={function () { setIsTopologyOpen(false); }}
        onExport={handleExport}
        onImport={handleImport}
        onLoadPreset={handleLoadPreset}
      />
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <AppContent />
    </ReactFlowProvider>
  );
}
