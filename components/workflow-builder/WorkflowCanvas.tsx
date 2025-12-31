'use client';

import React, { useCallback, useRef, useState, useMemo } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Connection,
  Edge,
  Node,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Panel,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { AINode, ActionNode, ConditionNode, DataNode, OutputNode } from './nodes';
import { WorkflowNodeData, ALL_NODE_TEMPLATES, NodeTemplate } from './nodes/types';
import NodePalette from './NodePalette';
import PropertiesPanel from './PropertiesPanel';

// Define custom node types
const nodeTypes = {
  ai: AINode,
  action: ActionNode,
  condition: ConditionNode,
  data: DataNode,
  output: OutputNode,
};

// Custom edge style
const edgeOptions = {
  type: 'smoothstep',
  animated: true,
  style: {
    stroke: '#64748b',
    strokeWidth: 2,
  },
};

interface WorkflowCanvasProps {
  onSave?: (nodes: Node[], edges: Edge[]) => void;
  initialNodes?: Node[];
  initialEdges?: Edge[];
}

function WorkflowCanvasInner({ onSave, initialNodes = [], initialEdges = [] }: WorkflowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node<WorkflowNodeData> | null>(null);
  const { project } = useReactFlow();

  // Handle edge connections
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            ...edgeOptions,
          },
          eds
        )
      );
    },
    [setEdges]
  );

  // Handle node selection
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node<WorkflowNodeData>) => {
    setSelectedNode(node);
  }, []);

  // Handle clicking on empty canvas
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Handle drag and drop from palette
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const templateData = event.dataTransfer.getData('application/reactflow');
      if (!templateData) return;

      const template: NodeTemplate = JSON.parse(templateData);

      // Get the position where the node was dropped
      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!reactFlowBounds) return;

      const position = project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      // Create new node
      const newNode: Node<WorkflowNodeData> = {
        id: `${template.type}-${Date.now()}`,
        type: template.category,
        position,
        data: {
          label: template.label,
          category: template.category,
          description: template.description,
          isConfigured: false,
          config: {},
          ...template.defaultData,
        } as WorkflowNodeData,
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [project, setNodes]
  );

  // Update node data
  const onNodeDataChange = useCallback(
    (nodeId: string, newData: Partial<WorkflowNodeData>) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                ...newData,
              },
            };
          }
          return node;
        })
      );

      // Update selected node if it's the one being changed
      if (selectedNode?.id === nodeId) {
        setSelectedNode((prev) =>
          prev ? { ...prev, data: { ...prev.data, ...newData } as WorkflowNodeData } : null
        );
      }
    },
    [setNodes, selectedNode]
  );

  // Delete selected node
  const onDeleteNode = useCallback(() => {
    if (!selectedNode) return;

    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) =>
      eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id)
    );
    setSelectedNode(null);
  }, [selectedNode, setNodes, setEdges]);

  // Save workflow
  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(nodes, edges);
    }
  }, [nodes, edges, onSave]);

  // MiniMap node color
  const nodeColor = (node: Node) => {
    switch (node.type) {
      case 'ai':
        return '#10a37f';
      case 'action':
        return '#f59e0b';
      case 'condition':
        return '#8b5cf6';
      case 'data':
        return '#06b6d4';
      case 'output':
        return '#5865f2';
      default:
        return '#64748b';
    }
  };

  return (
    <div className="flex h-full w-full bg-zinc-950">
      {/* Left Sidebar - Node Palette */}
      <NodePalette />

      {/* Main Canvas */}
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={edgeOptions}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          className="bg-zinc-950"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="#27272a"
          />
          <Controls className="!bg-zinc-800 !border-zinc-700 !rounded-lg" />
          <MiniMap
            nodeColor={nodeColor}
            className="!bg-zinc-900 !border-zinc-700 !rounded-lg"
            maskColor="rgba(0, 0, 0, 0.8)"
          />

          {/* Top Panel with Actions */}
          <Panel position="top-center" className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              💾 Save Workflow
            </button>
            <button
              onClick={() => {
                setNodes([]);
                setEdges([]);
                setSelectedNode(null);
              }}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              🗑️ Clear
            </button>
          </Panel>

          {/* Node count */}
          <Panel position="bottom-center" className="text-zinc-500 text-xs">
            {nodes.length} nodes • {edges.length} connections
          </Panel>
        </ReactFlow>
      </div>

      {/* Right Sidebar - Properties Panel */}
      <PropertiesPanel
        selectedNode={selectedNode}
        onNodeDataChange={onNodeDataChange}
        onDeleteNode={onDeleteNode}
      />
    </div>
  );
}

// Wrap with ReactFlowProvider
export default function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
