import { useCallback } from 'react';
import ReactFlow, {
  Background, Controls, MiniMap,
  BackgroundVariant, useNodesState, useEdgesState, addEdge,
} from 'reactflow';
import type { Node, Edge, Connection } from 'reactflow';
import 'reactflow/dist/style.css';
import { Tag } from 'antd';

const NODE_STYLES = {
  section: { background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 10 },
  teacher: { background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.4)', borderRadius: 10 },
  subject: { background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: 10 },
  room: { background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 10 },
};

const makeLabel = (title: string, sub: string, color: string) => (
  <div style={{ padding: '8px 12px', minWidth: 140 }}>
    <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)' }}>{title}</p>
    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--color-text-muted)' }}>{sub}</p>
    <Tag color={color} style={{ marginTop: 4, fontSize: 10 }}>{color}</Tag>
  </div>
);

const INITIAL_NODES: Node[] = [
  // Sections
  { id: 'sec-a', type: 'default', position: { x: 400, y: 50 }, data: { label: makeLabel('CS-A', 'Section · 60 students', 'purple') }, style: NODE_STYLES.section },
  { id: 'sec-b', type: 'default', position: { x: 600, y: 50 }, data: { label: makeLabel('CS-B', 'Section · 58 students', 'purple') }, style: NODE_STYLES.section },

  // Teachers
  { id: 'tea-rao', type: 'default', position: { x: 100, y: 220 }, data: { label: makeLabel('Dr. Rao', 'DBMS, OS', 'cyan') }, style: NODE_STYLES.teacher },
  { id: 'tea-sharma', type: 'default', position: { x: 350, y: 220 }, data: { label: makeLabel('Prof. Sharma', 'Maths, Stats', 'cyan') }, style: NODE_STYLES.teacher },
  { id: 'tea-priya', type: 'default', position: { x: 600, y: 220 }, data: { label: makeLabel('Dr. Priya', 'Networks', 'cyan') }, style: NODE_STYLES.teacher },

  // Subjects
  { id: 'sub-dbms', type: 'default', position: { x: 50, y: 400 }, data: { label: makeLabel('DBMS', 'CS301 · 4h/wk', 'green') }, style: NODE_STYLES.subject },
  { id: 'sub-os', type: 'default', position: { x: 220, y: 400 }, data: { label: makeLabel('OS', 'CS302 · 3h/wk', 'green') }, style: NODE_STYLES.subject },
  { id: 'sub-net', type: 'default', position: { x: 390, y: 400 }, data: { label: makeLabel('Networks', 'CS303 · 3h/wk', 'green') }, style: NODE_STYLES.subject },
  { id: 'sub-math', type: 'default', position: { x: 560, y: 400 }, data: { label: makeLabel('Maths', 'MA301 · 4h/wk', 'green') }, style: NODE_STYLES.subject },

  // Rooms
  { id: 'room-101', type: 'default', position: { x: 150, y: 580 }, data: { label: makeLabel('Room 101', 'Lecture · 60 seats', 'gold') }, style: NODE_STYLES.room },
  { id: 'room-204', type: 'default', position: { x: 340, y: 580 }, data: { label: makeLabel('Room 204', 'Lecture · 60 seats', 'gold') }, style: NODE_STYLES.room },
  { id: 'room-lab', type: 'default', position: { x: 530, y: 580 }, data: { label: makeLabel('Lab 201', 'Lab · 30 seats', 'gold') }, style: NODE_STYLES.room },
];

const INITIAL_EDGES: Edge[] = [
  // Section → Teacher assignments
  { id: 'e1', source: 'sec-a', target: 'tea-rao', animated: true, style: { stroke: '#6366f1', strokeWidth: 1.5 } },
  { id: 'e2', source: 'sec-a', target: 'tea-sharma', animated: true, style: { stroke: '#6366f1', strokeWidth: 1.5 } },
  { id: 'e3', source: 'sec-b', target: 'tea-priya', animated: true, style: { stroke: '#818cf8', strokeWidth: 1.5 } },
  { id: 'e4', source: 'sec-b', target: 'tea-rao', animated: true, style: { stroke: '#818cf8', strokeWidth: 1.5 } },
  // Teacher → Subject
  { id: 'e5', source: 'tea-rao', target: 'sub-dbms', style: { stroke: '#06b6d4', strokeWidth: 1.5 } },
  { id: 'e6', source: 'tea-rao', target: 'sub-os', style: { stroke: '#06b6d4', strokeWidth: 1.5 } },
  { id: 'e7', source: 'tea-sharma', target: 'sub-math', style: { stroke: '#06b6d4', strokeWidth: 1.5 } },
  { id: 'e8', source: 'tea-priya', target: 'sub-net', style: { stroke: '#06b6d4', strokeWidth: 1.5 } },
  // Subject → Room
  { id: 'e9', source: 'sub-dbms', target: 'room-101', style: { stroke: '#10b981', strokeWidth: 1.5 } },
  { id: 'e10', source: 'sub-os', target: 'room-204', style: { stroke: '#10b981', strokeWidth: 1.5 } },
  { id: 'e11', source: 'sub-net', target: 'room-204', style: { stroke: '#10b981', strokeWidth: 1.5 } },
  { id: 'e12', source: 'sub-math', target: 'room-101', style: { stroke: '#10b981', strokeWidth: 1.5 } },
  { id: 'e13', source: 'sub-dbms', target: 'room-lab', style: { stroke: '#10b981', strokeWidth: 1.5, strokeDasharray: '4 4' } },
  { id: 'e14', source: 'sub-net', target: 'room-lab', style: { stroke: '#10b981', strokeWidth: 1.5, strokeDasharray: '4 4' } },
];

export default function CanvasPage() {
  const [nodes, , onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);

  const onConnect = useCallback(
    (params: Connection) => setEdges(eds => addEdge(params, eds)),
    [setEdges],
  );

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <p style={{ margin: 0, fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
          Visual Overview
        </p>
        <h1 style={{ margin: '4px 0 4px', fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
          Canvas View
        </h1>
        <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 13 }}>
          Interactive graph of sections → teachers → subjects → rooms. Drag nodes to rearrange.
        </p>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Section', color: '#6366f1' },
          { label: 'Teacher', color: '#06b6d4' },
          { label: 'Subject', color: '#10b981' },
          { label: 'Room', color: '#f59e0b' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: item.color }} />
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{item.label}</span>
          </div>
        ))}
      </div>

      <div style={{
        height: 'calc(100vh - 260px)', minHeight: 500,
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
      }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          style={{ background: 'var(--color-bg-surface)' }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1}
            color="rgba(99,102,241,0.12)"
          />
          <Controls style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }} />
          <MiniMap
            style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
            nodeColor={() => '#6366f1'}
            maskColor="rgba(10,15,30,0.7)"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
