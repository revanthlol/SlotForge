import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTeachers, useRooms, useSubjects, useSections, useTimetableVersions, useTimetable } from '../hooks/useApi';
import PageHeader from '../components/ui/PageHeader';

export default function CanvasViewPage() {
  const { organizationId } = useAuth();
  const { data: teachersData } = useTeachers(organizationId);
  const { data: roomsData } = useRooms(organizationId);
  const { data: subjectsData } = useSubjects(organizationId);
  const { data: sectionsData } = useSections(organizationId);
  const { data: versions } = useTimetableVersions(organizationId);

  const teachers = teachersData || [];
  const rooms = roomsData || [];
  const subjects = subjectsData || [];
  const sections = sectionsData || [];

  const activeVersion = versions?.[0] || versions?.find((v) => v.status === 'published');
  const { data: timetable } = useTimetable(activeVersion?.id || null);

  const [selectedNode, setSelectedNode] = useState<{ type: 'section' | 'subject' | 'teacher' | 'room'; id: string } | null>(null);

  // Get active relationships based on selected node and timetable assignments
  const getRelatedNodeIds = () => {
    if (!selectedNode || !timetable?.assignments) return new Set<string>();

    const related = new Set<string>();
    related.add(`${selectedNode.type}-${selectedNode.id}`);

    timetable.assignments.forEach((slot) => {
      const match =
        (selectedNode.type === 'section' && slot.section_id === selectedNode.id) ||
        (selectedNode.type === 'subject' && slot.subject_id === selectedNode.id) ||
        (selectedNode.type === 'teacher' && slot.teacher_id === selectedNode.id) ||
        (selectedNode.type === 'room' && slot.room_id === selectedNode.id);

      if (match) {
        related.add(`section-${slot.section_id}`);
        related.add(`subject-${slot.subject_id}`);
        related.add(`teacher-${slot.teacher_id}`);
        related.add(`room-${slot.room_id}`);
      }
    });

    return related;
  };

  const relatedNodes = getRelatedNodeIds();
  const hasAssignments = Boolean(timetable?.assignments?.length);

  const subjectHue = (id: string) => {
    let hash = 0;
    for (let index = 0; index < id.length; index += 1) {
      hash = id.charCodeAt(index) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % 360;
  };

  const nodePosition = (type: 'section' | 'subject' | 'teacher' | 'room', id: string) => {
    const collections = { section: sections, subject: subjects, teacher: teachers, room: rooms };
    const xMap = { section: 8, subject: 36, teacher: 64, room: 92 };
    const list = collections[type];
    const index = list.findIndex((item) => item.id === id);
    const safeIndex = index >= 0 ? index : 0;
    return {
      x: xMap[type],
      y: 58 + safeIndex * 64,
    };
  };

  const parseNodeId = (nodeId: string): { type: 'section' | 'subject' | 'teacher' | 'room'; id: string } => {
    for (const type of ['section', 'subject', 'teacher', 'room'] as const) {
      const prefix = `${type}-`;
      if (nodeId.startsWith(prefix)) return { type, id: nodeId.slice(prefix.length) };
    }
    return { type: 'section', id: nodeId };
  };

  // Draw linking lines between related columns
  // We can compute lines based on assignments
  const lines: { fromId: string; toId: string; type: string }[] = [];
  if (timetable?.assignments) {
    const addedLines = new Set<string>();
    timetable.assignments.forEach((slot) => {
      // Connections: section -> subject -> teacher -> room
      const pairs = [
        { from: `section-${slot.section_id}`, to: `subject-${slot.subject_id}`, type: 'sec-sub' },
        { from: `subject-${slot.subject_id}`, to: `teacher-${slot.teacher_id}`, type: 'sub-teach' },
        { from: `teacher-${slot.teacher_id}`, to: `room-${slot.room_id}`, type: 'teach-room' },
      ];

      pairs.forEach((p) => {
        const key = `${p.from}->${p.to}`;
        if (!addedLines.has(key)) {
          addedLines.add(key);
          lines.push({ fromId: p.from, toId: p.to, type: p.type });
        }
      });
    });
  }



  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="SOLVER / CANVAS GRAPH"
        title="Canvas View"
        subtitle="Interactive relationship graph mapping connections between Sections, Subjects, Teachers, and Rooms"
      />

      <div className="bg-paper-raised border-2 border-rule rounded-xl p-inset-standard space-y-6 relative overflow-hidden">
        {/* Info panel */}
        <div className="flex items-center justify-between gap-4 border-b border-rule pb-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            <span className="text-mono-grey text-label-caps" style={{ fontSize: 10 }}>Interactive Mode</span>
            {activeVersion && (
              <span className="rounded-full border border-primary/20 bg-accent-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                Version {activeVersion.version_number} · {activeVersion.status}
              </span>
            )}
          </div>
          <p className="text-[11px] text-mono-grey italic">
            Click any resource node below to isolate and trace its scheduling connections.
          </p>
        </div>

        {!hasAssignments && (
          <div className="rounded-xl border border-secondary/20 bg-signal-soft px-4 py-3 text-sm text-on-surface">
            <div className="flex items-center gap-2 font-semibold">
              <span className="material-symbols-outlined text-secondary" style={{ fontSize: 18 }}>hub</span>
              No timetable relationships found for the selected latest version.
            </div>
            <p className="mt-1 text-xs text-on-surface-variant">
              Resource nodes remain visible. Generate a feasible timetable or publish the latest draft to populate relationship traces.
            </p>
          </div>
        )}

        {/* Graph Columns Layout */}
        <div className="grid grid-cols-4 gap-8 md:gap-12 relative min-h-[500px]">
          {hasAssignments && (
            <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible">
              {lines.map((line) => {
                const fromNode = parseNodeId(line.fromId);
                const toNode = parseNodeId(line.toId);
                const from = nodePosition(fromNode.type, fromNode.id);
                const to = nodePosition(toNode.type, toNode.id);
                const selected = !selectedNode || (relatedNodes.has(line.fromId) && relatedNodes.has(line.toId));
                const stroke = line.type === 'sec-sub' ? 'var(--color-primary)' : line.type === 'sub-teach' ? '#2fb4df' : 'var(--color-secondary)';

                return (
                  <path
                    key={`${line.fromId}-${line.toId}`}
                    d={`M ${from.x}% ${from.y} C ${(from.x + to.x) / 2}% ${from.y}, ${(from.x + to.x) / 2}% ${to.y}, ${to.x}% ${to.y}`}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={selected ? 2.4 : 1.2}
                    strokeOpacity={selected ? 0.62 : 0.12}
                  />
                );
              })}
            </svg>
          )}
          {/* Column 1: Sections */}
          <div className="space-y-3 z-10">
            <h4 className="text-label-caps text-center text-mono-grey mb-4" style={{ fontSize: 10 }}>Sections</h4>
            {sections.map((s) => {
              const nodeId = `section-${s.id}`;
              const isSelected = selectedNode?.type === 'section' && selectedNode.id === s.id;
              const isRelated = selectedNode === null || relatedNodes.has(nodeId);

              return (
                <div
                  key={s.id}
                  id={nodeId}
                  onClick={() => setSelectedNode(isSelected ? null : { type: 'section', id: s.id })}
                  className={`p-3 rounded-lg border-2 text-center cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-primary text-on-primary border-primary font-bold shadow-md'
                      : isRelated
                      ? 'bg-accent-soft border-primary/30 hover:border-primary/70 text-primary'
                      : 'bg-surface-container-low border-rule/50 opacity-30 hover:opacity-50'
                  }`}
                >
                  <p className="text-xs font-semibold">{s.name}</p>
                  <p className={`text-[9px] mt-0.5 ${isSelected ? 'text-on-primary/70' : 'text-mono-grey'}`}>
                    Size: {s.size}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Column 2: Subjects */}
          <div className="space-y-3 z-10">
            <h4 className="text-label-caps text-center text-mono-grey mb-4" style={{ fontSize: 10 }}>Subjects</h4>
            {subjects.map((s) => {
              const nodeId = `subject-${s.id}`;
              const isSelected = selectedNode?.type === 'subject' && selectedNode.id === s.id;
              const isRelated = selectedNode === null || relatedNodes.has(nodeId);
              const subCode = (s as any).short_code || s.name.slice(0, 7).toUpperCase();
              const hue = subjectHue(s.id);

              return (
                <div
                  key={s.id}
                  id={nodeId}
                  onClick={() => setSelectedNode(isSelected ? null : { type: 'subject', id: s.id })}
                  className={`p-3 rounded-xl border-2 text-center cursor-pointer transition-all ${
                    isSelected ? 'font-bold shadow-md' : isRelated ? 'hover:-translate-y-0.5' : 'opacity-30 hover:opacity-50'
                  }`}
                  style={{
                    background: isSelected
                      ? `hsl(${hue} 70% 42%)`
                      : isRelated
                      ? `color-mix(in srgb, hsl(${hue} 80% 58%) 24%, var(--color-paper-raised))`
                      : 'var(--color-surface-container-low)',
                    borderColor: isSelected ? `hsl(${hue} 76% 52%)` : `hsl(${hue} 68% 48% / 0.45)`,
                    color: isSelected ? 'white' : `color-mix(in srgb, hsl(${hue} 78% 36%) 70%, var(--color-on-surface))`,
                  }}
                >
                  <p className="text-xs font-semibold">{subCode}</p>
                  <p className={`text-[9px] mt-0.5 ${isSelected ? 'text-white/75' : 'text-mono-grey'} truncate`}>
                    {s.name}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Column 3: Teachers */}
          <div className="space-y-3 z-10">
            <h4 className="text-label-caps text-center text-mono-grey mb-4" style={{ fontSize: 10 }}>Teachers</h4>
            {teachers.map((t) => {
              const nodeId = `teacher-${t.id}`;
              const isSelected = selectedNode?.type === 'teacher' && selectedNode.id === t.id;
              const isRelated = selectedNode === null || relatedNodes.has(nodeId);

              return (
                <div
                  key={t.id}
                  id={nodeId}
                  onClick={() => setSelectedNode(isSelected ? null : { type: 'teacher', id: t.id })}
                  className={`p-3 rounded-lg border-2 text-center cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#196f8f] text-white border-[#2fb4df] font-bold shadow-md'
                      : isRelated
                      ? 'bg-[#2fb4df]/15 border-[#2fb4df]/30 hover:border-[#2fb4df]/70 text-on-surface'
                      : 'bg-surface-container-low border-rule/50 opacity-30 hover:opacity-50'
                  }`}
                >
                  <p className="text-xs font-semibold">{t.name}</p>
                </div>
              );
            })}
          </div>

          {/* Column 4: Rooms */}
          <div className="space-y-3 z-10">
            <h4 className="text-label-caps text-center text-mono-grey mb-4" style={{ fontSize: 10 }}>Rooms</h4>
            {rooms.map((r) => {
              const nodeId = `room-${r.id}`;
              const isSelected = selectedNode?.type === 'room' && selectedNode.id === r.id;
              const isRelated = selectedNode === null || relatedNodes.has(nodeId);

              return (
                <div
                  key={r.id}
                  id={nodeId}
                  onClick={() => setSelectedNode(isSelected ? null : { type: 'room', id: r.id })}
                  className={`p-3 rounded-lg border-2 text-center cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-secondary text-on-secondary border-secondary font-bold shadow-md'
                      : isRelated
                      ? 'bg-signal-soft border-secondary/30 hover:border-secondary/70 text-secondary'
                      : 'bg-surface-container-low border-rule/50 opacity-30 hover:opacity-50'
                  }`}
                >
                  <p className="text-xs font-semibold">{r.name}</p>
                  <p className={`text-[9px] mt-0.5 ${isSelected ? 'text-on-secondary/70' : 'text-mono-grey'}`}>
                    Cap: {r.capacity}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
