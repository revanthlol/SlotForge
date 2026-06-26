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

  const activeVersion = versions?.find((v) => v.status === 'published') || versions?.[0];
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
          </div>
          <p className="text-[11px] text-mono-grey italic">
            Click any resource node below to isolate and trace its scheduling connections.
          </p>
        </div>

        {/* Graph Columns Layout */}
        <div className="grid grid-cols-4 gap-8 md:gap-12 relative min-h-[500px]">
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
                      ? 'bg-accent-soft/20 border-primary/20 hover:border-primary/50 text-primary'
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

              return (
                <div
                  key={s.id}
                  id={nodeId}
                  onClick={() => setSelectedNode(isSelected ? null : { type: 'subject', id: s.id })}
                  className={`p-3 rounded-lg border-2 text-center cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-secondary text-on-secondary border-secondary font-bold shadow-md'
                      : isRelated
                      ? 'bg-signal-soft border-secondary/20 hover:border-secondary/50 text-secondary'
                      : 'bg-surface-container-low border-rule/50 opacity-30 hover:opacity-50'
                  }`}
                >
                  <p className="text-xs font-semibold">{subCode}</p>
                  <p className={`text-[9px] mt-0.5 ${isSelected ? 'text-on-secondary/70' : 'text-mono-grey'} truncate`}>
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
                      ? 'bg-primary/80 text-on-primary border-primary/95 font-bold shadow-md'
                      : isRelated
                      ? 'bg-accent-soft/30 border-primary/10 hover:border-primary/40 text-primary'
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
                      ? 'bg-secondary/90 text-on-secondary border-secondary/95 font-bold shadow-md'
                      : isRelated
                      ? 'bg-signal-soft/35 border-secondary/15 hover:border-secondary/40 text-secondary'
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

        {/* Empty state overlay if no schedule matches */}
        {timetable?.assignments?.length === 0 && (
          <div className="absolute inset-0 bg-paper-raised/85 flex flex-col items-center justify-center z-20">
            <span className="material-symbols-outlined text-outline-variant mb-2" style={{ fontSize: 40 }}>
              hub
            </span>
            <p className="text-sm font-semibold text-on-surface">No timetable assignments active</p>
            <p className="text-xs text-mono-grey">Relations will map once a timetable is generated and published.</p>
          </div>
        )}
      </div>
    </div>
  );
}
