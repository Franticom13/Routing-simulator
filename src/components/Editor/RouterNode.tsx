// RouterNode — custom React Flow node pro router
// zobrazuje ikonu routeru, nazev, a IP adresu
// zvyrazni se pri vyberu (zelene) a pri zmene (zlute)

import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { AnimatedRouterIcon } from '../Icons';

// data ktera router node drzi
interface RouterNodeData {
  label: string;
  isSelected?: boolean;
  isChanged?: boolean;
  isPathHighlighted?: boolean;
  isDiscovered?: boolean;
  [key: string]: unknown;
}

function RouterNodeComponent({ data, selected }: NodeProps) {
  var [isHovered, setIsHovered] = useState(false);

  // urceni css tridy podle stavu
  const nodeData = data as RouterNodeData;
  let nodeClass = 'router-node';

  if (nodeData.isChanged) {
    nodeClass = nodeClass + ' changed';
  }
  if (selected || nodeData.isSelected) {
    nodeClass = nodeClass + ' selected';
  }

  if (nodeData.isPathHighlighted) {
    nodeClass = nodeClass + ' path-node-highlight';
  }

  if (nodeData.isDiscovered) {
    nodeClass = nodeClass + ' discovered';
  }

  if ((data as any).isAlreadyConnected) {
    nodeClass = nodeClass + ' already-connected';
  }

  if ((data as any).isComputing) {
    nodeClass = nodeClass + ' computing';
  }

  return (
    <div
      className={nodeClass}
      onMouseEnter={function () { setIsHovered(true); }}
      onMouseLeave={function () { setIsHovered(false); }}
    >
      {/* neviditelne handles ve stredu — skutecny bod pripojeni se pocita v NetworkEdge */}
      <Handle
        type="source"
        position={Position.Top}
        id="source"
        isConnectable={false}
        style={{ opacity: 0, top: '50%', left: '50%', pointerEvents: 'none' }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="target"
        isConnectable={false}
        style={{ opacity: 0, top: '50%', left: '50%', pointerEvents: 'none' }}
      />

      {/* animovana ikona routeru */}
      <div className="router-icon">
        <AnimatedRouterIcon size={18} hovered={isHovered} />
      </div>

      {/* info o routeru */}
      <div>
        <div className="router-name">{nodeData.label || 'Router'}</div>
      </div>
    </div>
  );
}

// memo pro optimalizaci — rerenderuje se jen kdyz se zmeni props
export const RouterNodeMemo = memo(RouterNodeComponent);

