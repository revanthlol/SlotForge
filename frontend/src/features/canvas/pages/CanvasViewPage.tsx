import { useMemo, useState } from 'react';
import ReactFlow, { Background, Controls, Handle, MiniMap, Position, type Edge, type Node, type NodeProps } from 'reactflow';
import 'reactflow/dist/style.css';
import { useApiGet } from '../../../hooks/useApi';
import { useWorkspaces } from '../../../lib/api/hooks/useWorkspaces';

type CanvasView = 'resource' | 'constraint' | 'conflict' | 'version';
type CanvasNode = { id: string; type: string; label: string; metadata: Record<string, unknown>; pressure_level?: string | null };
type CanvasEdge = { id: string; source: string; target: string; label?: string | null; edge_type: string };
type CanvasResponse = { workspace_id: string; view: CanvasView; nodes: CanvasNode[]; edges: CanvasEdge[] };
type GraphNodeData = CanvasNode & { degree: number; selected: boolean; related: boolean; faded: boolean; showLabel: boolean; onSelect: (id: string) => void };

const viewMeta: Record<CanvasView, { label: string; icon: string; eyebrow: string; description: string; color: string }> = {
  resource: { label: 'Resources', icon: 'hub', eyebrow: 'LIVE WORKSPACE', description: 'Who teaches what, where each section meets, and how often.', color: '#148064' },
  constraint: { label: 'Rules', icon: 'rule', eyebrow: 'RULE INFLUENCE', description: 'Select a rule to see exactly which resources it governs.', color: '#a45f17' },
  conflict: { label: 'Pressure', icon: 'warning', eyebrow: 'PRESSURE SIGNALS', description: 'Follow overloaded resources and the timetable links around them.', color: '#b84a43' },
  version: { label: 'Versions', icon: 'account_tree', eyebrow: 'VERSION LINEAGE', description: 'Trace how schedule drafts branch from one another over time.', color: '#6657b2' },
};

const typeMeta: Record<string, { label: string; color: string }> = {
  teacher: { label: 'Teacher', color: '#148064' }, resource: { label: 'Resource', color: '#2879a8' }, subject: { label: 'Subject', color: '#6657b2' }, section: { label: 'Section', color: '#5d8e31' }, room: { label: 'Room', color: '#a45f17' }, lab: { label: 'Lab', color: '#c06c24' }, constraint: { label: 'Rule', color: '#b84a43' }, version: { label: 'Version', color: '#6657b2' },
};

const pressureColor: Record<string, string> = { critical: '#c43f3a', high: '#cf6d2e', medium: '#a97719', low: '#148064', none: '#71807b' };

function graphLayout(items: CanvasNode[], edges: CanvasEdge[]): Map<string, { x: number; y: number }> {
  const degrees = new Map(items.map((item) => [item.id, 0]));
  edges.forEach((edge) => { degrees.set(edge.source, (degrees.get(edge.source) || 0) + 1); degrees.set(edge.target, (degrees.get(edge.target) || 0) + 1); });
  const ordered = [...items].sort((a, b) => (degrees.get(b.id) || 0) - (degrees.get(a.id) || 0) || a.label.localeCompare(b.label));
  const result = new Map<string, { x: number; y: number }>();
  if (ordered.every((node) => node.type === 'version')) {
    ordered.forEach((node, index) => result.set(node.id, { x: 120 + index * 210, y: 330 + ((index % 3) - 1) * 120 }));
    return result;
  }
  ordered.forEach((node, index) => {
    if (index === 0) return void result.set(node.id, { x: 620, y: 390 });
    const angle = index * 2.399963229728653;
    const radius = 92 + Math.sqrt(index) * 84;
    result.set(node.id, { x: 620 + Math.cos(angle) * radius, y: 390 + Math.sin(angle) * radius });
  });
  return result;
}

function GraphNode({ data }: NodeProps<GraphNodeData>) {
  const meta = typeMeta[data.type] || typeMeta.resource;
  const color = data.pressure_level ? pressureColor[data.pressure_level] || meta.color : meta.color;
  const size = data.selected ? 25 : 12 + Math.min(data.degree, 5) * 2;
  return <button type="button" onClick={(event) => { if (event.detail === 0) { event.stopPropagation(); data.onSelect(data.id); } }} className={`group relative flex w-[144px] -translate-x-1/2 flex-col items-center bg-transparent text-center outline-none transition-all ${data.faded ? 'opacity-15' : 'opacity-100'}`} aria-label={`${data.label}, ${meta.label}, ${data.degree} relationships`}>
    <Handle type="target" position={Position.Left} className="!left-1/2 !top-3 !h-px !w-px !border-0 !bg-transparent" />
    <Handle type="source" position={Position.Right} className="!right-1/2 !top-3 !h-px !w-px !border-0 !bg-transparent" />
    <span className={`block rounded-full border-2 shadow-[0_0_16px_currentColor] transition-all group-hover:scale-125 ${data.selected ? 'ring-2 ring-primary ring-offset-4 ring-offset-paper' : data.related ? 'ring-1 ring-primary/50 ring-offset-2 ring-offset-paper' : ''}`} style={{ width: size, height: size, borderColor: 'var(--color-paper-raised)', background: color, color }} />
    {(data.showLabel || data.selected || data.related) && <span className="mt-2 max-w-[144px] truncate rounded border border-rule bg-paper-raised/90 px-1.5 py-0.5 text-[11px] font-semibold text-on-surface shadow-sm backdrop-blur-sm">{data.label}</span>}
  </button>;
}

const nodeTypes = { graphNode: GraphNode };

export default function CanvasViewPage() {
  const { data: workspaces, isLoading: workspacesLoading } = useWorkspaces();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const activeWorkspaceId = workspaceId || workspaces?.[0]?.id || null;
  const [view, setView] = useState<CanvasView>('resource');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [showInspector, setShowInspector] = useState(true);
  const { data, loading, error } = useApiGet<CanvasResponse>(activeWorkspaceId ? `/api/v1/workspaces/${activeWorkspaceId}/canvas?view=${view}` : null);
  const nodesById = useMemo(() => new Map((data?.nodes || []).map((node) => [node.id, node])), [data?.nodes]);
  const selected = selectedId ? nodesById.get(selectedId) || null : null;
  const relationships = useMemo(() => selectedId ? (data?.edges || []).filter((edge) => edge.source === selectedId || edge.target === selectedId) : [], [data?.edges, selectedId]);
  const relatedIds = useMemo(() => new Set(relationships.flatMap((edge) => [edge.source, edge.target])), [relationships]);
  const normalizedQuery = query.trim().toLowerCase();
  const degreeMap = useMemo(() => { const map = new Map<string, number>(); (data?.edges || []).forEach((edge) => { map.set(edge.source, (map.get(edge.source) || 0) + 1); map.set(edge.target, (map.get(edge.target) || 0) + 1); }); return map; }, [data?.edges]);
  const positions = useMemo(() => graphLayout(data?.nodes || [], data?.edges || []), [data?.nodes, data?.edges]);
  const onSelect = (id: string) => { setSelectedId((current) => current === id ? null : id); setShowInspector(true); };
  const graphNodes = useMemo<Node<GraphNodeData>[]>(() => (data?.nodes || []).map((node) => {
    const matches = !normalizedQuery || `${node.label} ${node.type} ${Object.values(node.metadata).join(' ')}`.toLowerCase().includes(normalizedQuery);
    const selectedState = node.id === selectedId;
    const related = Boolean(selectedId && relatedIds.has(node.id) && !selectedState);
    return { id: node.id, type: 'graphNode', position: positions.get(node.id) || { x: 0, y: 0 }, draggable: true, data: { ...node, degree: degreeMap.get(node.id) || 0, selected: selectedState, related, faded: !matches || Boolean(selectedId && !selectedState && !related), showLabel: showLabels, onSelect } };
  }), [data?.nodes, normalizedQuery, selectedId, relatedIds, positions, degreeMap, showLabels]);
  const graphEdges = useMemo<Edge[]>(() => (data?.edges || []).map((edge) => {
    const active = !selectedId || edge.source === selectedId || edge.target === selectedId;
    return { id: edge.id, source: edge.source, target: edge.target, label: selectedId && active ? (edge.label || edge.edge_type.replaceAll('_', ' ')) : undefined, type: 'straight', animated: view === 'conflict' && active, style: { stroke: active ? viewMeta[view].color : 'var(--color-outline)', strokeWidth: selectedId && active ? 2.4 : 1, opacity: selectedId ? (active ? .95 : .06) : .4 }, labelStyle: { fill: 'var(--color-on-surface)', fontSize: 10, fontWeight: 700 }, labelBgStyle: { fill: 'var(--color-paper-raised)', fillOpacity: .94 }, labelBgPadding: [5, 3] };
  }), [data?.edges, selectedId, view]);
  const resetView = (nextView: CanvasView) => { setView(nextView); setSelectedId(null); setQuery(''); };

  return <div className="flex h-full min-h-0 flex-col bg-paper">
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-rule bg-paper-raised">
      <div className="border-b border-rule bg-paper-raised px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-on-primary"><span className="material-symbols-outlined" style={{ fontSize: 20 }}>grain</span></span><div><div className="flex items-center gap-2"><p className="text-[9px] font-bold uppercase tracking-[.2em] text-mono-grey">Canvas / {viewMeta[view].eyebrow}</p><span className="hidden text-[9px] text-outline-variant sm:inline">·</span><span className="hidden text-[10px] text-on-surface-variant sm:inline">Select a point to isolate its links</span></div><p className="text-sm font-semibold text-on-surface">{workspaces?.find((item) => item.id === activeWorkspaceId)?.name || (workspacesLoading ? 'Loading workspace…' : 'Workspace graph')}</p></div></div>
          <div className="flex flex-wrap items-center gap-2">
            {workspaces && workspaces.length > 1 && <select value={activeWorkspaceId || ''} onChange={(event) => { setWorkspaceId(event.target.value); setSelectedId(null); }} className="rounded-lg border border-rule bg-paper px-3 py-2 text-xs font-semibold text-on-surface">{workspaces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}
            <button type="button" onClick={() => setShowLabels((current) => !current)} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${showLabels ? 'border-primary/40 bg-accent-soft text-primary' : 'border-rule text-on-surface-variant'}`}><span className="material-symbols-outlined mr-1 align-middle" style={{ fontSize: 15 }}>label</span>Labels</button>
            <button type="button" onClick={() => setShowInspector((current) => !current)} className="rounded-lg border border-rule px-3 py-2 text-xs font-semibold text-on-surface-variant hover:bg-accent-soft hover:text-on-surface"><span className="material-symbols-outlined mr-1 align-middle" style={{ fontSize: 15 }}>{showInspector ? 'right_panel_close' : 'right_panel_open'}</span>Inspector</button>
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-1 overflow-x-auto rounded-xl bg-surface-container-low p-1">{(Object.keys(viewMeta) as CanvasView[]).map((key) => <button key={key} type="button" onClick={() => resetView(key)} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${view === key ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-paper-raised hover:text-on-surface'}`}><span className="material-symbols-outlined" style={{ fontSize: 16 }}>{viewMeta[key].icon}</span>{viewMeta[key].label}</button>)}</div>
          <label className="flex min-w-0 items-center gap-2 rounded-xl border border-rule bg-paper px-3 py-2 lg:w-[300px]"><span className="material-symbols-outlined text-mono-grey" style={{ fontSize: 18 }}>search</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a node…" className="min-w-0 flex-1 bg-transparent text-sm text-on-surface outline-none placeholder:text-mono-grey" />{query && <button type="button" onClick={() => setQuery('')} className="text-mono-grey"><span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span></button>}</label>
        </div>
      </div>
      <div className={`grid min-h-0 flex-1 ${showInspector ? 'xl:grid-cols-[minmax(0,1fr)_340px]' : 'grid-cols-1'}`}>
        <div className="canvas-flow relative min-h-0 bg-paper">
          <div className="pointer-events-none absolute left-5 top-5 z-10 max-w-xs"><p className="text-sm font-medium leading-6 text-on-surface-variant">{selected ? `${relationships.length} direct relationship${relationships.length === 1 ? '' : 's'} selected` : viewMeta[view].description}</p></div>
          <div className="absolute bottom-5 left-5 z-10 rounded-lg border border-rule bg-paper-raised/90 px-3 py-2 text-[11px] font-semibold text-on-surface-variant shadow-sm backdrop-blur">{loading ? 'Mapping relationships…' : error ? 'Graph data unavailable' : `${data?.nodes.length || 0} nodes · ${data?.edges.length || 0} relationships`}</div>
          {error ? <div className="absolute inset-0 grid place-items-center p-8"><div className="max-w-sm text-center"><span className="material-symbols-outlined text-error" style={{ fontSize: 34 }}>cloud_off</span><h2 className="mt-3 text-xl font-semibold text-on-surface">Could not load this map</h2><p className="mt-2 text-sm text-on-surface-variant">Check the workspace connection and try again.</p></div></div> : <ReactFlow nodes={graphNodes} edges={graphEdges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: .18 }} minZoom={.18} maxZoom={2.2} nodesConnectable={false} proOptions={{ hideAttribution: true }} onNodeClick={(_, node) => onSelect(node.id)} onPaneClick={() => setSelectedId(null)}><Background color="var(--color-outline-variant)" gap={28} size={1} /><Controls position="bottom-right" showInteractive={false} /><MiniMap position="top-right" pannable zoomable maskColor="color-mix(in srgb, var(--color-paper) 72%, transparent)" style={{ background: 'var(--color-paper-raised)', border: '1px solid var(--color-rule)' }} nodeColor={(node) => pressureColor[node.data?.pressure_level] || typeMeta[node.data?.type]?.color || '#71807b'} /></ReactFlow>}
        </div>
        {showInspector && <aside className="min-h-0 overflow-y-auto border-t border-rule bg-surface-container-low p-5 xl:border-l xl:border-t-0">{selected ? <Inspector node={selected} relationships={relationships} nodesById={nodesById} onSelect={onSelect} onClose={() => setSelectedId(null)} /> : <EmptyInspector view={view} />}</aside>}
      </div>
    </section>
  </div>;
}

function EmptyInspector({ view }: { view: CanvasView }) {
  return <div className="flex h-full min-h-[300px] flex-col justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[.2em] text-mono-grey">Relationship inspector</p><h2 className="mt-3 text-2xl font-semibold text-on-surface">Select a point</h2><p className="mt-3 text-sm leading-6 text-on-surface-variant">Every unrelated point will fade so you can read one {viewMeta[view].label.toLowerCase()} relationship at a time.</p></div><div className="rounded-xl border border-rule bg-paper-raised p-4 text-xs leading-5 text-on-surface-variant"><p className="font-semibold text-on-surface">Map controls</p><p className="mt-2">Drag to pan · scroll to zoom · move points to untangle dense clusters.</p></div></div>;
}

function Inspector({ node, relationships, nodesById, onSelect, onClose }: { node: CanvasNode; relationships: CanvasEdge[]; nodesById: Map<string, CanvasNode>; onSelect: (id: string) => void; onClose: () => void }) {
  const meta = typeMeta[node.type] || typeMeta.resource;
  const entries = Object.entries(node.metadata).filter(([, value]) => value !== null && value !== undefined && typeof value !== 'object');
  return <div><div className="flex items-start justify-between gap-3"><div><span className="inline-flex rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.16em]" style={{ color: meta.color, borderColor: `${meta.color}66`, background: `${meta.color}14` }}>{meta.label}</span><h2 className="mt-4 break-words text-2xl font-semibold leading-tight text-on-surface">{node.label}</h2><p className="mt-2 text-sm text-on-surface-variant">{relationships.length} direct relationship{relationships.length === 1 ? '' : 's'}</p></div><button type="button" onClick={onClose} className="rounded-lg p-1 text-mono-grey hover:bg-accent-soft hover:text-on-surface"><span className="material-symbols-outlined">close</span></button></div>
    <div className="mt-6"><p className="text-[9px] font-bold uppercase tracking-[.18em] text-mono-grey">Connected to</p><div className="mt-3 space-y-2">{relationships.length ? relationships.map((edge) => { const neighborId = edge.source === node.id ? edge.target : edge.source; const neighbor = nodesById.get(neighborId); if (!neighbor) return null; const neighborMeta = typeMeta[neighbor.type] || typeMeta.resource; return <button key={edge.id} type="button" onClick={() => onSelect(neighborId)} className="flex w-full items-center gap-3 rounded-xl border border-rule bg-paper-raised p-3 text-left transition-colors hover:border-primary/35 hover:bg-accent-soft"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: neighborMeta.color }} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-on-surface">{neighbor.label}</span><span className="mt-0.5 block text-[10px] text-mono-grey">{edge.label || edge.edge_type.replaceAll('_', ' ')} · {neighborMeta.label}</span></span><span className="material-symbols-outlined text-mono-grey" style={{ fontSize: 16 }}>arrow_forward</span></button>; }) : <p className="rounded-xl border border-dashed border-rule p-4 text-sm text-on-surface-variant">This node has no recorded relationships in the current view.</p>}</div></div>
    {entries.length > 0 && <div className="mt-7"><p className="text-[9px] font-bold uppercase tracking-[.18em] text-mono-grey">Details</p><div className="mt-3 space-y-2">{entries.slice(0, 8).map(([key, value]) => <div key={key} className="flex items-start justify-between gap-4 border-b border-rule pb-2 text-xs"><span className="capitalize text-mono-grey">{key.replaceAll('_', ' ')}</span><span className="max-w-[170px] break-words text-right font-semibold text-on-surface">{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}</span></div>)}</div></div>}
  </div>;
}
