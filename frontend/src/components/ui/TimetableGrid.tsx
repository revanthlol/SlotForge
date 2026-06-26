import { useState } from 'react';
import type { ScheduledSlot, Teacher, Room, Subject, Section, Organization } from '../../hooks/useApi';

interface TimetableGridProps {
  assignments: ScheduledSlot[];
  teachers: Teacher[];
  rooms: Room[];
  subjects: Subject[];
  sections: Section[];
  organization: Organization | null;
}

export default function TimetableGrid({
  assignments,
  teachers,
  rooms,
  subjects,
  sections,
  organization,
}: TimetableGridProps) {
  const [viewType, setViewType] = useState<'section' | 'teacher' | 'room'>('section');
  const [selectedId, setSelectedId] = useState<string>('');

  const cycleLength = organization?.cycle_length || 5;
  const periodsPerDay = organization?.periods_per_day || 6;
  const isDayOrder = organization?.scheduling_mode === 'day_order';

  // Helper to get day name
  const getDayName = (dayIndex: number) => {
    if (isDayOrder) {
      return `Day ${dayIndex}`;
    }
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days[dayIndex - 1] || `Day ${dayIndex}`;
  };

  // Get active list based on view type
  const getActiveList = () => {
    switch (viewType) {
      case 'teacher':
        return teachers.map((t) => ({ id: t.id, name: t.name }));
      case 'room':
        return rooms.map((r) => ({ id: r.id, name: r.name }));
      case 'section':
      default:
        return sections.map((s) => ({ id: s.id, name: s.name }));
    }
  };

  const list = getActiveList();

  // Auto-select first item if current selection is invalid
  const activeId = selectedId && list.some(item => item.id === selectedId)
    ? selectedId
    : list[0]?.id || '';

  // Filter assignments based on view type and active selection
  const filteredAssignments = assignments.filter((slot) => {
    if (!activeId) return false;
    switch (viewType) {
      case 'teacher':
        return slot.teacher_id === activeId;
      case 'room':
        return slot.room_id === activeId;
      case 'section':
      default:
        return slot.section_id === activeId;
    }
  });

  // Map IDs to Names/Codes
  const teacherMap = new Map(teachers.map((t) => [t.id, t.name]));
  const roomMap = new Map(rooms.map((r) => [r.id, r.name]));
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const sectionMap = new Map(sections.map((s) => [s.id, s.name]));

  // Build grid data structure
  const grid: Record<string, ScheduledSlot[]> = {};
  filteredAssignments.forEach((slot) => {
    const key = `${slot.day}-${slot.period}`;
    if (!grid[key]) {
      grid[key] = [];
    }
    grid[key].push(slot);
  });

  return (
    <div className="space-y-4">
      {/* Grid Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-inset-compact bg-paper-raised border-2 border-rule rounded-xl">
        <div className="flex items-center gap-3">
          <span className="text-label-caps text-mono-grey" style={{ fontSize: 10 }}>View Schedule By:</span>
          <div className="flex bg-surface-container p-0.5 rounded-lg border border-rule">
            {(['section', 'teacher', 'room'] as const).map((type) => (
              <button
                key={type}
                onClick={() => {
                  setViewType(type);
                  setSelectedId('');
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-all ${
                  viewType === type
                    ? 'bg-paper-raised text-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Dropdown Selector */}
        {list.length > 0 ? (
          <div className="flex items-center gap-2">
            <label htmlFor="schedule-selector" className="text-label-caps text-mono-grey" style={{ fontSize: 10 }}>
              Select {viewType}:
            </label>
            <select
              id="schedule-selector"
              value={activeId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="academic-input min-w-[200px] text-sm py-1"
            >
              {list.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="text-sm text-mono-grey italic">No {viewType}s available</p>
        )}
      </div>

      {/* The Timetable Grid */}
      <div className="bg-paper-raised border-2 border-rule rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            {/* Header Row (Days) */}
            <thead>
              <tr className="bg-on-background text-paper-raised border-b border-rule">
                <th className="p-3 text-left font-semibold text-data-table w-[100px] border-r border-rule">
                  Period
                </th>
                {Array.from({ length: cycleLength }).map((_, idx) => (
                  <th
                    key={idx}
                    className="p-3 text-center font-semibold text-data-table border-r border-rule last:border-r-0"
                  >
                    {getDayName(idx + 1)}
                  </th>
                ))}
              </tr>
            </thead>
            {/* Body Rows (Periods) */}
            <tbody className="divide-y divide-rule">
              {Array.from({ length: periodsPerDay }).map((_, periodIdx) => {
                const periodNum = periodIdx + 1;
                return (
                  <tr key={periodNum} className="hover:bg-surface-bright/20 transition-colors">
                    {/* Period label column */}
                    <td className="p-4 font-semibold text-data-table text-on-surface-variant bg-surface-container-low border-r border-rule align-middle">
                      <div className="text-xs">P{periodNum}</div>
                      <div className="text-[10px] text-mono-grey font-normal mt-0.5">
                        Slot {periodNum}
                      </div>
                    </td>

                    {/* Day columns */}
                    {Array.from({ length: cycleLength }).map((_, dayIdx) => {
                      const dayNum = dayIdx + 1;
                      const key = `${dayNum}-${periodNum}`;
                      const slots = grid[key] || [];

                      return (
                        <td
                          key={dayNum}
                          className="p-3 border-r border-rule last:border-r-0 align-top min-h-[100px] w-[200px]"
                        >
                          {slots.length === 0 ? (
                            <div className="flex items-center justify-center h-full min-h-[64px] text-xs text-mono-grey/40 italic">
                              Empty
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {slots.map((slot, sIdx) => {
                                const subjectObj = subjectMap.get(slot.subject_id);
                                // Fallback to short_code or custom field from backend if exists
                                const subCode = (subjectObj as any)?.short_code || subjectObj?.name || 'SUB';
                                const subName = subjectObj?.name || 'Unknown Subject';
                                const teacherName = teacherMap.get(slot.teacher_id) || 'Unknown Teacher';
                                const roomName = roomMap.get(slot.room_id) || 'Unknown Room';
                                const secName = sectionMap.get(slot.section_id) || 'Unknown Section';

                                // Check for conflict (multiple assignments in same slot)
                                const isConflict = slots.length > 1;

                                return (
                                  <div
                                    key={sIdx}
                                    className={`p-2.5 rounded-lg border text-left transition-all ${
                                      isConflict
                                        ? 'bg-signal-soft border-secondary/40 text-secondary shadow-sm border-l-4 border-l-secondary'
                                        : 'bg-accent-soft/30 border-primary/20 hover:border-primary/40 text-primary'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <span
                                        className="font-bold text-xs"
                                        style={{ fontFamily: 'var(--font-mono)' }}
                                        title={subName}
                                      >
                                        {subCode}
                                      </span>
                                      {isConflict && (
                                        <span className="inline-flex items-center text-[9px] font-bold px-1 py-0.2 bg-secondary text-on-secondary rounded">
                                          CONFLICT
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] font-medium text-on-surface mt-1 truncate">
                                      {subName}
                                    </div>
                                    <div className="mt-2 pt-1.5 border-t border-rule/50 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-mono-grey">
                                      <span className="flex items-center gap-0.5">
                                        <span className="material-symbols-outlined" style={{ fontSize: 11 }}>school</span>
                                        {teacherName}
                                      </span>
                                      <span className="flex items-center gap-0.5">
                                        <span className="material-symbols-outlined" style={{ fontSize: 11 }}>meeting_room</span>
                                        {roomName}
                                      </span>
                                      {viewType !== 'section' && (
                                        <span className="flex items-center gap-0.5">
                                          <span className="material-symbols-outlined" style={{ fontSize: 11 }}>groups</span>
                                          {secName}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
