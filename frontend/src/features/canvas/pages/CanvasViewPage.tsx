import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ReactFlow, {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  type Edge,
  type Node,
  type NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import PageHeader from '../../../components/ui/PageHeader';
import { useApiGet } from '../../../hooks/useApi';
import { useWorkspaces } from '../../../lib/api/hooks/useWorkspaces';

type CanvasView = 'resource' | 'constraint' | 'conflict' | 'version';
type CanvasNode = { id: string; type: string; label: string; metadata: Record<string, unknown>; pressure_level?: string | null };
type CanvasEdge = { id: string; source: string; target: string; label?: string | null; edge_type: string };
type CanvasResponse = { workspace_id: string; view: CanvasView; nodes: CanvasNode[]; edges: CanvasEdge[] };
type CanvasNodeData = CanvasNode & { dimmed?: boolean; focused?: boolean; onSelect: (id: string) => void };

const viewMeta: Record<CanvasView, { label: string; icon: string; eyebrow: string; description: string; accent: string }> = {
  resource: { label: 'Resource graph', icon: 'hub', eyebrow: 'LIVE RELATIONSHIPS', description: 'How sections, subjects, faculty, and spaces meet inside the timetable.', accent: '#0f766e' },
  constraint: { label: 'Constraint graph', icon: 'rule', eyebrow: 'SOLVER PRESSURE', description: 'Which rules shape which parts of the workspace, and where they apply.', accent: '#b45309' },
  conflict: { label: 'Conflict graph', icon: 'warning', eyebrow: 'SCHEDULING FRICTION', description: 'Pressure hotspots and the resources connected to them.', accent: '#be3b3b' },
  version: { label: 'Version graph', icon: 'account_tree', eyebrow: 'HISTORY TREE', description: 'The draft lineage behind every published timetable.', accent: '#4f46a5' },
};

const typeMeta: Record<string, { label: string; icon: string; color: string }> = {
  teacher: { label: 'Teacher', icon: 'school', color: '#0f766e' },
  resource: { label: 'Resource', icon: 'person', color: '#475569' },
  subject: { label: 'Subject', icon: 'menu_book', color: '#4f46a5' },
  section: { label: 'Section', icon: 'groups', color: '#166534' },
  room: { label: 'Room', icon: 'meeting_room', color: '#b45309' },
  lab: { label: 'Lab', icon: 'science', color: '#a16207' },
  constraint: { label: 'Constraint', icon: 'rule', color: '#be3b3b' },
  version: { label: 'Version', icon: 'account_tree', color: '#4f46a5' },
};

const pressureColor: Record<string, string> = { critical: '#be3b3b', high: '#c2410c', medium: '#a16207', low: '#15803d', none: '#94a3b8' };

function layoutNodes(items: CanvasNode[], view: CanvasView, query: string, selectedId: string | null, onSelect: (id: string) => void): Node<CanvasNodeData>[] {
  const columns: Record<string, number> = view === 'resource'
    ? { section: 0, subject: 1, teacher: 2, resource: 2, room: 3, lab: 3 }
    : view === 'constraint'
      ? { constraint: 0, teacher: 1, resource: 1, subject: 2, section: 2, room: 3, lab: 3 }
      : { version: 1, teacher: 0, resource: 0, subject: 2, section: 2, room: 3, lab: 3, constraint: 0 };
  const rows = new Map<number, number>();
  const normalized = query.trim().toLowerCase();
  return items.map((item) => {
    const column = columns[item.type] ?? 1;
    const row = rows.get(column) || 0;
    rows.set(column, row + 1);
    const matches = !normalized || `${item.label} ${item.type} ${Object.values(item.metadata).join(' ')}`.toLowerCase().includes(normalized);
    return {
      id: item.id,
      type: 'canvasNode',
      position: { x: 60 + column * 270, y: 48 + row * 112 },
      data: { ...item, dimmed: !matches || Boolean(normalized && selectedId && item.id !== selectedId), focused: item.id === selectedId, onSelect },
      draggable: true,
    };
  });
}

function CanvasNodeCard({ data }: NodeProps<CanvasNodeData>) {
  const meta = typeMeta[data.type] || typeMeta.resource;
  const pressure = data.pressure_level ? pressureColor[data.pressure_level] || pressureColor.none : meta.color;
  return (
    <div
      className={`group relative w-[220px] rounded-[18px] border bg-paper-raised px-4 py-3 shadow-[0_10px_30px_rgba(19,35,42,0.08)] transition-all ${data.dimmed ? 'opacity-25' : 'opacity-100'} ${data.focused ? 'ring-2 ring-primary ring-offset-2' : ''}`}
      style={{ borderColor: data.focused ? meta.color : `${pressure}55` }}
      onClick={() => data.onSelect(data.id)}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-2 !border-paper-raised" style={{ background: pressure }} />
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-2 !border-paper-raised" style={{ background: pressure }} />
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-paper-raised" style={{ background: pressure }}>
          <span className="material-symbols-outlined" style={{ fontSize: 19 }}>{meta.icon}</span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-black text-on-surface">{data.label}</p>
            {data.pressure_level && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: pressure }} title={`${data.pressure_level} pressure`} />}
          </div>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-mono-grey">{meta.label}</p>
        </div>
      </div>
      {data.type === 'version' && <p className="mt-3 text-xs text-on-surface-variant">{String(data.metadata.status || 'draft')} · {data.metadata.branch_name ? String(data.metadata.branch_name) : 'generated'}</p>}
      {data.type === 'constraint' && <p className="mt-3 truncate text-xs text-on-surface-variant">{String(data.metadata.template_key || 'custom rule')} · {data.metadata.enabled ? 'enabled' : 'disabled'}</p>}
      {data.pressure_level && <p className="mt-3 text-xs font-semibold capitalize" style={{ color: pressure }}>{data.pressure_level} pressure</p>}
    </div>
  );
}

const nodeTypes = { canvasNode: CanvasNodeCard };

export default function CanvasViewPage() {
  const { data: workspaces, isLoading: workspacesLoading } = useWorkspaces();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const activeWorkspaceId = workspaceId || workspaces?.[0]?.id || null;
  const [view, setView] = useState<CanvasView>('resource');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const { data, loading, error } = useApiGet<CanvasResponse>(activeWorkspaceId ? `/api/v1/workspaces/${activeWorkspaceId}/canvas?view=${view}` : null);
  const selected = data?.nodes.find((node) => node.id === selectedId) || null;

  const onSelect = (id: string) => {
    setSelectedId((current) => current === id ? null : id);
    setShowDetails(true);
  };
  const graphNodes = useMemo(() => layoutNodes(data?.nodes || [], view, query, focusMode ? selectedId : null, onSelect), [data?.nodes, view, query, focusMode, selectedId]);
  const graphEdges = useMemo<Edge[]>(() => (data?.edges || []).map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label || undefined,
    type: 'smoothstep',
    animated: view === 'conflict' && edge.edge_type === 'pressure',
    style: { stroke: viewMeta[view].accent, strokeWidth: 1.5, opacity: 0.72 },
    labelStyle: { fill: '#475569', fontSize: 10, fontWeight: 700 },
    labelBgStyle: { fill: '#f8faf8', fillOpacity: 0.92 },
    labelBgPadding: [5, 3],
  })), [data?.edges, view]);

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb="SOLVER / CANVAS MAP"
        title="Canvas Map"
        subtitle="Read the timetable as a living system: resources, rules, pressure, and version lineage in one navigable map."
        actions={<Link to="/onboarding" className="inline-flex items-center gap-2 rounded-lg border-2 border-rule bg-paper-raised px-4 py-2 text-sm font-semibold text-on-surface hover:bg-accent-soft"><span className="material-symbols-outlined" style={{ fontSize: 18 }}>checklist</span>Setup Guide</Link>}
      />

      <section className="overflow-hidden rounded-[22px] border-2 border-[#cbd8d2] bg-[#eef3ef] shadow-[0_20px_60px_rgba(19,35,42,0.08)]">
        <div className="border-b border-[#cbd8d2] bg-[#f8faf8] px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#163b3b] text-[#d4f27c]"><span className="material-symbols-outlined">hub</span></div>
              <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#54716a]">Workspace signal map</p><p className="truncate text-sm font-black text-[#163b3b]">{workspaces?.find((workspace) => workspace.id === activeWorkspaceId)?.name || (workspacesLoading ? 'Loading workspace…' : 'No workspace')}</p></div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {workspaces && workspaces.length > 1 && <select value={activeWorkspaceId || ''} onChange={(event) => { setWorkspaceId(event.target.value); setSelectedId(null); }} className="rounded-lg border border-rule bg-paper-raised px-3 py-2 text-xs font-semibold text-on-surface"><option value="">Select workspace</option>{workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</select>}
              <button type="button" onClick={() => setFocusMode((current) => !current)} className={`rounded-lg border px-3 py-2 text-xs font-bold ${focusMode ? 'border-[#163b3b] bg-[#163b3b] text-[#d4f27c]' : 'border-rule bg-paper-raised text-on-surface-variant'}`}><span className="material-symbols-outlined mr-1 align-middle" style={{ fontSize: 15 }}>center_focus_strong</span>Focus mode</button>
              <button type="button" onClick={() => setShowDetails((current) => !current)} className="rounded-lg border border-rule bg-paper-raised px-3 py-2 text-xs font-bold text-on-surface-variant"><span className="material-symbols-outlined mr-1 align-middle" style={{ fontSize: 15 }}>{showDetails ? 'right_panel_close' : 'right_panel_open'}</span>Details</button>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-1 overflow-x-auto rounded-xl border border-[#d8e2dc] bg-[#edf2ee] p-1">
              {(Object.keys(viewMeta) as CanvasView[]).map((key) => <button key={key} type="button" onClick={() => { setView(key); setSelectedId(null); setQuery(''); }} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-black transition-colors ${view === key ? 'bg-[#163b3b] text-[#d4f27c] shadow-sm' : 'text-[#54716a] hover:bg-[#f8faf8]'}`}><span className="material-symbols-outlined" style={{ fontSize: 17 }}>{viewMeta[key].icon}</span>{viewMeta[key].label}</button>)}
            </div>
            <label className="flex min-w-0 items-center gap-2 rounded-xl border border-[#d8e2dc] bg-[#f8faf8] px-3 py-2 lg:w-[300px]"><span className="material-symbols-outlined text-[#54716a]" style={{ fontSize: 18 }}>search</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the map…" className="min-w-0 flex-1 bg-transparent text-sm text-[#163b3b] outline-none placeholder:text-[#8ba29a]" /><kbd className="hidden rounded bg-[#edf2ee] px-1.5 py-0.5 text-[10px] text-[#54716a] sm:block">⌘K</kbd></label>
          </div>
        </div>

        <div className={`grid ${showDetails ? 'lg:grid-cols-[minmax(0,1fr)_320px]' : 'grid-cols-1'}`}>
          <div className="relative min-h-[680px] bg-[#e8efea]">
            <div className="pointer-events-none absolute left-5 top-5 z-10 max-w-[360px]"><p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: viewMeta[view].accent }}>{viewMeta[view].eyebrow}</p><p className="mt-1 text-xs font-medium text-[#54716a]">{viewMeta[view].description}</p></div>
            <div className="absolute bottom-5 left-5 z-10 rounded-lg border border-[#cbd8d2] bg-[#f8faf8]/90 px-3 py-2 text-[11px] font-semibold text-[#54716a] shadow-sm">{loading ? 'Synchronizing graph…' : error ? 'Could not load graph data' : `${data?.nodes.length || 0} nodes · ${data?.edges.length || 0} relationships`}</div>
            {error ? <div className="absolute inset-0 flex items-center justify-center p-8"><div className="max-w-sm rounded-2xl border border-[#e5bcbc] bg-[#fff8f8] p-6 text-center"><span className="material-symbols-outlined text-[#be3b3b]" style={{ fontSize: 30 }}>error</span><h2 className="mt-3 text-lg font-black text-[#4b2020]">Map unavailable</h2><p className="mt-2 text-sm text-[#7f4a4a]">The workspace graph could not be loaded. Try again after checking the API connection.</p></div></div> : <ReactFlow nodes={graphNodes} edges={graphEdges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.22 }} minZoom={0.18} maxZoom={1.5} nodesConnectable={false} proOptions={{ hideAttribution: true }} onPaneClick={() => setSelectedId(null)}><Background color="#c9d8cf" gap={24} size={1} /><Controls position="bottom-right" showInteractive={false} /><MiniMap position="bottom-left" pannable zoomable nodeColor={(node) => pressureColor[node.data?.pressure_level] || typeMeta[node.data?.type]?.color || '#94a3b8'} /></ReactFlow>}
          </div>
          {showDetails && <aside className="border-l border-[#cbd8d2] bg-[#f8faf8] p-5">
            {selected ? <DetailPanel node={selected} onClose={() => setSelectedId(null)} /> : <EmptyDetail view={view} />}
          </aside>}
        </div>
      </section>
    </div>
  );
}

function EmptyDetail({ view }: { view: CanvasView }) {
  return <div className="flex h-full min-h-[280px] flex-col justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#54716a]">Inspector</p><h2 className="mt-3 text-2xl font-black text-[#163b3b]">Choose a signal</h2><p className="mt-3 text-sm leading-6 text-[#668078]">Select any node to inspect its role in the {viewMeta[view].label.toLowerCase()}. Focus mode will mute everything else so the relationship stays readable.</p></div><div className="rounded-2xl bg-[#edf2ee] p-4"><p className="text-xs font-black uppercase tracking-[0.16em] text-[#54716a]">Navigation</p><div className="mt-3 space-y-2 text-sm text-[#54716a]"><p><span className="mr-2 text-[#163b3b]">1</span>Pan the map to scan the workspace.</p><p><span className="mr-2 text-[#163b3b]">2</span>Zoom into a cluster.</p><p><span className="mr-2 text-[#163b3b]">3</span>Click a node for its evidence.</p></div></div></div>;
}

function DetailPanel({ node, onClose }: { node: CanvasNode; onClose: () => void }) {
  const meta = typeMeta[node.type] || typeMeta.resource;
  const entries = Object.entries(node.metadata).filter(([, value]) => value !== null && value !== undefined && typeof value !== 'object');
  return <div><div className="flex items-start justify-between gap-3"><div><span className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-paper-raised" style={{ background: meta.color }}><span className="material-symbols-outlined" style={{ fontSize: 13 }}>{meta.icon}</span>{meta.label}</span><h2 className="mt-4 break-words text-2xl font-black leading-tight text-[#163b3b]">{node.label}</h2></div><button type="button" onClick={onClose} className="rounded-lg p-1 text-[#54716a] hover:bg-[#edf2ee]"><span className="material-symbols-outlined">close</span></button></div>{node.pressure_level && <div className="mt-5 rounded-xl border p-3" style={{ borderColor: `${pressureColor[node.pressure_level] || '#94a3b8'}55`, background: `${pressureColor[node.pressure_level] || '#94a3b8'}10` }}><p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: pressureColor[node.pressure_level] || '#64748b' }}>Scheduling pressure</p><p className="mt-1 text-lg font-black capitalize" style={{ color: pressureColor[node.pressure_level] || '#64748b' }}>{node.pressure_level}</p>{node.metadata.message != null && <p className="mt-1 text-xs text-[#668078]">{String(node.metadata.message)}</p>}</div>}<div className="mt-6 space-y-3"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#54716a]">Evidence</p>{entries.length ? entries.map(([key, value]) => <div key={key} className="flex items-start justify-between gap-4 border-b border-[#e1e9e3] pb-2 text-sm"><span className="capitalize text-[#668078]">{key.replaceAll('_', ' ')}</span><span className="max-w-[160px] break-words text-right font-bold text-[#163b3b]">{String(value)}</span></div>) : <p className="rounded-xl bg-[#edf2ee] p-3 text-sm text-[#668078]">No additional metadata is available for this node.</p>}</div></div>;
}
