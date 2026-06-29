import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  useRooms,
  useSections,
  useSubjects,
  useTeachers,
  useTimetable,
  useTimetableVersions,
  type Room,
  type Section,
  type Subject,
  type Teacher,
} from '../hooks/useApi';
import PageHeader from '../components/ui/PageHeader';
import { colorMix, getSubjectColor, readableTextColor } from '../lib/subjectColors';

type NodeType = 'section' | 'subject' | 'teacher' | 'room';
type SelectedNode = { type: NodeType; id: string };

type CanvasNode = {
  id: string;
  type: NodeType;
  title: string;
  meta: string;
  color: string;
  x: number;
  y: number;
};

const columnMeta: Record<NodeType, { label: string; icon: string; x: number; color: string }> = {
  section: { label: 'Sections', icon: 'groups', x: 7, color: '#0f5a46' },
  subject: { label: 'Subjects', icon: 'menu_book', x: 35, color: '#2563eb' },
  teacher: { label: 'Teachers', icon: 'school', x: 63, color: '#0284c7' },
  room: { label: 'Rooms', icon: 'meeting_room', x: 91, color: '#c45113' },
};

function nodeKey(type: NodeType, id: string) {
  return `${type}:${id}`;
}

function subjectCode(name: string) {
  const compact = name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('');
  return (compact || name).slice(0, 6).toUpperCase();
}

export default function CanvasViewPage() {
  const { organizationId } = useAuth();
  const { data: teachersData } = useTeachers(organizationId);
  const { data: roomsData } = useRooms(organizationId);
  const { data: subjectsData } = useSubjects(organizationId);
  const { data: sectionsData } = useSections(organizationId);
  const { data: versions } = useTimetableVersions(organizationId);

  const teachers = useMemo(() => teachersData || [], [teachersData]);
  const rooms = useMemo(() => roomsData || [], [roomsData]);
  const subjects = useMemo(() => subjectsData || [], [subjectsData]);
  const sections = useMemo(() => sectionsData || [], [sectionsData]);

  const defaultVersionId = versions?.[0]?.id || '';
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const activeVersionId = selectedVersionId || defaultVersionId;
  const activeVersion = versions?.find(version => version.id === activeVersionId);
  const { data: timetable } = useTimetable(activeVersionId || null);
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);

  const subjectMap = useMemo(() => new Map(subjects.map(subject => [subject.id, subject])), [subjects]);
  const sectionMap = useMemo(() => new Map(sections.map(section => [section.id, section])), [sections]);
  const teacherMap = useMemo(() => new Map(teachers.map(teacher => [teacher.id, teacher])), [teachers]);
  const roomMap = useMemo(() => new Map(rooms.map(room => [room.id, room])), [rooms]);

  const assignments = useMemo(() => timetable?.assignments || [], [timetable?.assignments]);
  const maxNodeCount = Math.max(sections.length, subjects.length, teachers.length, rooms.length, 1);
  const graphHeight = Math.max(620, 130 + maxNodeCount * 78);

  const nodes = useMemo(() => {
    const buildNodes = <T extends Section | Subject | Teacher | Room>(
      items: T[],
      toNode: (item: T, y: number) => CanvasNode,
    ) => items.map((item, index) => toNode(item, 108 + index * 78));

    return [
      ...buildNodes(sections, (section, y) => ({
        id: section.id,
        type: 'section',
        title: section.name,
        meta: `${section.size} students`,
        color: columnMeta.section.color,
        x: columnMeta.section.x,
        y,
      })),
      ...buildNodes(subjects, (subject, y) => ({
        id: subject.id,
        type: 'subject',
        title: subject.name,
        meta: `${subject.weekly_hours} periods · ${subject.session_length === 2 ? 'lab block' : 'single'}`,
        color: getSubjectColor(subject),
        x: columnMeta.subject.x,
        y,
      })),
      ...buildNodes(teachers, (teacher, y) => ({
        id: teacher.id,
        type: 'teacher',
        title: teacher.name,
        meta: 'Faculty',
        color: columnMeta.teacher.color,
        x: columnMeta.teacher.x,
        y,
      })),
      ...buildNodes(rooms, (room, y) => ({
        id: room.id,
        type: 'room',
        title: room.name,
        meta: `${room.type} · cap ${room.capacity}`,
        color: columnMeta.room.color,
        x: columnMeta.room.x,
        y,
      })),
    ];
  }, [rooms, sections, subjects, teachers]);

  const nodeByKey = useMemo(() => new Map(nodes.map(node => [nodeKey(node.type, node.id), node])), [nodes]);

  const edges = useMemo(() => {
    const seen = new Set<string>();
    const next: { from: string; to: string; subjectId: string; label: string }[] = [];

    assignments.forEach(slot => {
      const pairs = [
        { from: nodeKey('section', slot.section_id), to: nodeKey('subject', slot.subject_id), label: 'studies' },
        { from: nodeKey('subject', slot.subject_id), to: nodeKey('teacher', slot.teacher_id), label: 'taught by' },
        { from: nodeKey('teacher', slot.teacher_id), to: nodeKey('room', slot.room_id), label: 'uses' },
      ];

      pairs.forEach(pair => {
        const key = `${pair.from}->${pair.to}`;
        if (!seen.has(key)) {
          seen.add(key);
          next.push({ ...pair, subjectId: slot.subject_id });
        }
      });
    });

    return next;
  }, [assignments]);

  const relatedKeys = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    const selectedKey = nodeKey(selectedNode.type, selectedNode.id);
    const keys = new Set<string>([selectedKey]);

    assignments.forEach(slot => {
      const matches =
        (selectedNode.type === 'section' && slot.section_id === selectedNode.id) ||
        (selectedNode.type === 'subject' && slot.subject_id === selectedNode.id) ||
        (selectedNode.type === 'teacher' && slot.teacher_id === selectedNode.id) ||
        (selectedNode.type === 'room' && slot.room_id === selectedNode.id);

      if (matches) {
        keys.add(nodeKey('section', slot.section_id));
        keys.add(nodeKey('subject', slot.subject_id));
        keys.add(nodeKey('teacher', slot.teacher_id));
        keys.add(nodeKey('room', slot.room_id));
      }
    });

    return keys;
  }, [assignments, selectedNode]);

  const selectedNodeDetails = selectedNode ? nodeByKey.get(nodeKey(selectedNode.type, selectedNode.id)) : null;
  const selectedAssignments = selectedNode ? assignments.filter(slot => (
    (selectedNode.type === 'section' && slot.section_id === selectedNode.id) ||
    (selectedNode.type === 'subject' && slot.subject_id === selectedNode.id) ||
    (selectedNode.type === 'teacher' && slot.teacher_id === selectedNode.id) ||
    (selectedNode.type === 'room' && slot.room_id === selectedNode.id)
  )) : [];

  const hasAssignments = assignments.length > 0;
  const totalConnections = edges.length;

  const toggleNode = (type: NodeType, id: string) => {
    setSelectedNode(current => current?.type === type && current.id === id ? null : { type, id });
  };

  const renderNode = (node: CanvasNode) => {
    const key = nodeKey(node.type, node.id);
    const selected = selectedNode?.type === node.type && selectedNode.id === node.id;
    const related = !selectedNode || relatedKeys.has(key);
    const textColor = selected ? readableTextColor(node.color) : 'var(--color-on-surface)';

    return (
      <button
        key={key}
        type="button"
        onClick={() => toggleNode(node.type, node.id)}
        className={`absolute z-20 w-[21%] min-w-[180px] rounded-xl border-2 p-3 text-left shadow-sm transition-all ${
          related ? 'opacity-100' : 'opacity-25'
        } ${selected ? 'scale-[1.02] shadow-lg' : 'hover:-translate-y-0.5 hover:shadow-md'}`}
        style={{
          left: `${node.x}%`,
          top: node.y,
          transform: 'translateX(-50%)',
          background: selected ? node.color : colorMix(node.color, node.type === 'subject' ? 0.18 : 0.11),
          borderColor: selected ? node.color : colorMix(node.color, 0.48),
          color: textColor,
        }}
      >
        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ background: selected ? 'rgba(255,255,255,0.18)' : colorMix(node.color, 0.2) }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              {columnMeta[node.type].icon}
            </span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-black">
              {node.type === 'subject' ? subjectCode(node.title) : node.title}
            </span>
            <span className="mt-0.5 block truncate text-xs" style={{ color: selected ? `${textColor}cc` : 'var(--color-on-surface-variant)' }}>
              {node.type === 'subject' ? node.title : node.meta}
            </span>
            {node.type === 'subject' && (
              <span className="mt-1 block truncate text-[11px]" style={{ color: selected ? `${textColor}cc` : 'var(--color-mono-grey)' }}>
                {node.meta}
              </span>
            )}
          </span>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="SOLVER / CANVAS GRAPH"
        title="Canvas View"
        subtitle="Trace how sections, subjects, teachers, and rooms connect in a generated timetable"
        actions={
          <Link
            to="/onboarding"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-rule bg-paper-raised px-4 py-2 text-sm font-semibold text-on-surface hover:bg-accent-soft"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>checklist</span>
            Setup Guide
          </Link>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <section className="overflow-hidden rounded-xl border-2 border-rule bg-paper-raised shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule bg-surface-container-low px-5 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-accent-soft px-3 py-1 text-[11px] font-bold uppercase text-primary">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Relationship Canvas
              </span>
              {versions && versions.length > 0 && (
                <select
                  value={activeVersionId}
                  onChange={(event) => {
                    setSelectedVersionId(event.target.value);
                    setSelectedNode(null);
                  }}
                  className="academic-input min-w-[210px] py-1.5 text-sm"
                >
                  {versions.map(version => (
                    <option key={version.id} value={version.id}>
                      Version {version.version_number} ({version.status})
                    </option>
                  ))}
                </select>
              )}
              {activeVersion && (
                <span className="text-data-table text-mono-grey">
                  {activeVersion.status.toUpperCase()} · {assignments.length} classes · {totalConnections} links
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {selectedNode && (
                <button
                  type="button"
                  onClick={() => setSelectedNode(null)}
                  className="inline-flex items-center gap-1 rounded-lg border border-rule px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>filter_alt_off</span>
                  Clear Focus
                </button>
              )}
            </div>
          </div>

          {!hasAssignments && (
            <div className="m-5 rounded-xl border border-secondary/20 bg-signal-soft px-4 py-3 text-sm text-on-surface">
              <div className="flex items-center gap-2 font-semibold">
                <span className="material-symbols-outlined text-secondary" style={{ fontSize: 18 }}>hub</span>
                No timetable relationships found for this version.
              </div>
              <p className="mt-1 text-xs text-on-surface-variant">
                Generate a feasible timetable to populate relationship traces. Resource nodes still show the setup model.
              </p>
            </div>
          )}

          <div className="relative overflow-auto bg-paper">
            <div className="relative min-w-[1180px]" style={{ height: graphHeight }}>
              <div className="absolute left-0 right-0 top-0 z-10 grid grid-cols-4 border-b border-rule bg-paper-raised/95 backdrop-blur">
                {(Object.keys(columnMeta) as NodeType[]).map(type => (
                  <div key={type} className="border-r border-rule px-5 py-3 text-center last:border-r-0">
                    <span className="inline-flex items-center gap-2 text-label-caps text-mono-grey" style={{ fontSize: 10 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 17 }}>{columnMeta[type].icon}</span>
                      {columnMeta[type].label}
                    </span>
                  </div>
                ))}
              </div>

              {hasAssignments && (
                <svg
                  className="pointer-events-none absolute inset-0 z-0 h-full w-full"
                  viewBox={`0 0 100 ${graphHeight}`}
                  preserveAspectRatio="none"
                >
                  {edges.map(edge => {
                    const from = nodeByKey.get(edge.from);
                    const to = nodeByKey.get(edge.to);
                    const subject = subjectMap.get(edge.subjectId);
                    if (!from || !to) return null;
                    const active = !selectedNode || (relatedKeys.has(edge.from) && relatedKeys.has(edge.to));
                    const color = subject ? getSubjectColor(subject) : columnMeta.subject.color;
                    const fromX = from.x + 9.5;
                    const toX = to.x - 9.5;

                    return (
                      <path
                        key={`${edge.from}-${edge.to}`}
                        d={`M ${fromX} ${from.y + 24} C ${(fromX + toX) / 2} ${from.y + 24}, ${(fromX + toX) / 2} ${to.y + 24}, ${toX} ${to.y + 24}`}
                        fill="none"
                        stroke={color}
                        strokeLinecap="round"
                        strokeWidth={active ? 0.72 : 0.34}
                        strokeOpacity={active ? 0.72 : 0.1}
                      />
                    );
                  })}
                </svg>
              )}

              {nodes.map(renderNode)}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border-2 border-rule bg-paper-raised p-4">
            <p className="text-label-caps text-mono-grey" style={{ fontSize: 10 }}>Graph Summary</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Metric label="Sections" value={sections.length} icon="groups" />
              <Metric label="Subjects" value={subjects.length} icon="menu_book" />
              <Metric label="Teachers" value={teachers.length} icon="school" />
              <Metric label="Rooms" value={rooms.length} icon="meeting_room" />
            </div>
          </div>

          <div className="rounded-xl border-2 border-rule bg-paper-raised p-4">
            <p className="text-label-caps text-mono-grey" style={{ fontSize: 10 }}>
              {selectedNodeDetails ? 'Focused Node' : 'Selection'}
            </p>
            {selectedNodeDetails ? (
              <div className="mt-3">
                <div className="flex items-center gap-3">
                  <span className="h-10 w-10 rounded-xl" style={{ background: selectedNodeDetails.color }} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-on-surface">{selectedNodeDetails.title}</p>
                    <p className="text-xs text-on-surface-variant">{columnMeta[selectedNodeDetails.type].label.slice(0, -1)} · {selectedNodeDetails.meta}</p>
                  </div>
                </div>
                <div className="mt-4 max-h-72 space-y-2 overflow-auto">
                  {selectedAssignments.length === 0 ? (
                    <p className="rounded-lg bg-surface-container-low px-3 py-2 text-sm text-on-surface-variant">
                      No generated assignments connected to this node.
                    </p>
                  ) : selectedAssignments.slice(0, 12).map(slot => {
                    const subject = subjectMap.get(slot.subject_id);
                    const subjectColor = subject ? getSubjectColor(subject) : columnMeta.subject.color;
                    return (
                      <div key={slot.id} className="rounded-lg border border-rule bg-surface-container-low px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-sm" style={{ background: subjectColor }} />
                          <p className="truncate text-sm font-semibold text-on-surface">{subject?.name || 'Unknown subject'}</p>
                        </div>
                        <p className="mt-1 text-xs text-mono-grey">
                          {sectionMap.get(slot.section_id)?.name || 'Section'} · {teacherMap.get(slot.teacher_id)?.name || 'Teacher'} · {roomMap.get(slot.room_id)?.name || 'Room'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-on-surface-variant">
                Select a node to isolate its relationships and inspect the generated assignments behind it.
              </p>
            )}
          </div>

          <div className="rounded-xl border-2 border-rule bg-paper-raised p-4">
            <p className="text-label-caps text-mono-grey" style={{ fontSize: 10 }}>Legend</p>
            <div className="mt-3 space-y-2 text-sm text-on-surface-variant">
              <Legend color={columnMeta.section.color} label="Sections connect into selected subjects" />
              <Legend color={columnMeta.subject.color} label="Subject colors drive all relationship traces" />
              <Legend color={columnMeta.teacher.color} label="Teachers connect through scheduled classes" />
              <Legend color={columnMeta.room.color} label="Rooms show final placement capacity" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-rule bg-surface-container-low p-3">
      <div className="flex items-center justify-between">
        <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>{icon}</span>
        <span className="text-lg font-black text-on-surface">{value}</span>
      </div>
      <p className="mt-2 text-label-caps text-mono-grey" style={{ fontSize: 9 }}>{label}</p>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-3 w-6 rounded-full" style={{ background: color }} />
      <span>{label}</span>
    </div>
  );
}
