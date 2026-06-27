import { useMemo, useState } from 'react';
import type { ScheduledSlot, Teacher, Room, Subject, Section, Organization } from '../../hooks/useApi';
import api from '../../lib/api';

interface TimetableGridProps {
  timetableId: string;
  assignments: ScheduledSlot[];
  teachers: Teacher[];
  rooms: Room[];
  subjects: Subject[];
  sections: Section[];
  organization: Organization | null;
  editable: boolean;
  onChanged: () => void;
}

const roman = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

export default function TimetableGrid({
  timetableId,
  assignments,
  teachers,
  rooms,
  subjects,
  sections,
  organization,
  editable,
  onChanged,
}: TimetableGridProps) {
  const [viewType, setViewType] = useState<'section' | 'teacher' | 'room'>('section');
  const [selectedId, setSelectedId] = useState<string>('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const cycleLength = organization?.cycle_length || 5;
  const periodsPerDay = organization?.periods_per_day || 6;
  const isDayOrder = organization?.scheduling_mode === 'day_order';

  const dayValues = Array.from({ length: cycleLength }).map((_, index) => {
    if (isDayOrder) return `Day Order ${roman[index + 1] || index + 1}`;
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index] || `Day ${index + 1}`;
  });
  const dayLabels = dayValues.map((day) => {
    if (day.startsWith('Day Order ')) return day.replace('Day Order ', 'Day ');
    return ({ Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' } as Record<string, string>)[day] || day;
  });

  const list = useMemo(() => {
    if (viewType === 'teacher') return teachers.map((teacher) => ({ id: teacher.id, name: teacher.name }));
    if (viewType === 'room') return rooms.map((room) => ({ id: room.id, name: room.name }));
    return sections.map((section) => ({ id: section.id, name: section.name }));
  }, [rooms, sections, teachers, viewType]);

  const activeId = selectedId && list.some((item) => item.id === selectedId)
    ? selectedId
    : list[0]?.id || '';

  const filteredAssignments = assignments.filter((slot) => {
    if (!activeId) return false;
    if (viewType === 'teacher') return slot.teacher_id === activeId;
    if (viewType === 'room') return slot.room_id === activeId;
    return slot.section_id === activeId;
  });

  const teacherMap = new Map(teachers.map((teacher) => [teacher.id, teacher.name]));
  const roomMap = new Map(rooms.map((room) => [room.id, room.name]));
  const subjectMap = new Map(subjects.map((subject) => [subject.id, subject]));
  const sectionMap = new Map(sections.map((section) => [section.id, section.name]));

  const saveSlot = async (slotId: string, payload: Partial<ScheduledSlot>) => {
    setEditError(null);
    try {
      await api.patch(`/timetables/${timetableId}/slots/${slotId}`, payload);
      onChanged();
    } catch (err: any) {
      setEditError(err.response?.data?.detail || err.message || 'Could not update timetable slot');
    }
  };

  const deleteSlot = async (slotId: string) => {
    if (!confirm('Delete this assignment from the draft timetable?')) return;
    setEditError(null);
    try {
      await api.delete(`/timetables/${timetableId}/slots/${slotId}`);
      onChanged();
    } catch (err: any) {
      setEditError(err.response?.data?.detail || err.message || 'Could not delete timetable slot');
    }
  };

  const onDropCell = (day: string, period: number) => {
    if (!editable || !draggingId) return;
    saveSlot(draggingId, { day, period });
    setDraggingId(null);
  };

  return (
    <div className="space-y-4">
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
                  viewType === type ? 'bg-paper-raised text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
          {editable && (
            <span className="rounded-full border border-primary/20 bg-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              Editable Draft
            </span>
          )}
        </div>

        {list.length > 0 ? (
          <div className="flex items-center gap-2">
            <label htmlFor="schedule-selector" className="text-label-caps text-mono-grey" style={{ fontSize: 10 }}>
              Select {viewType}:
            </label>
            <select
              id="schedule-selector"
              value={activeId}
              onChange={(event) => setSelectedId(event.target.value)}
              className="academic-input min-w-[200px] text-sm py-1"
            >
              {list.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <p className="text-sm text-mono-grey italic">No {viewType}s available</p>
        )}
      </div>

      {editError && (
        <div className="rounded-lg border border-error/20 bg-error-container px-4 py-3 text-sm text-on-error-container">
          {editError}
        </div>
      )}

      <div className="bg-paper-raised border-2 border-rule rounded-xl overflow-x-auto shadow-sm">
        <div
          className="grid min-w-[960px]"
          style={{
            gridTemplateColumns: `142px repeat(${cycleLength}, minmax(180px, 1fr))`,
            gridTemplateRows: `44px repeat(${periodsPerDay}, minmax(96px, auto))`,
          }}
        >
          <div className="sticky left-0 z-20 bg-on-background text-paper-raised border-b border-r border-rule p-3 text-data-table font-semibold">
            Period
          </div>
          {dayLabels.map((label) => (
            <div key={label} className="bg-on-background text-paper-raised border-b border-r border-rule p-3 text-center text-data-table font-semibold">
              {label}
            </div>
          ))}

          {Array.from({ length: periodsPerDay }).map((_, periodIndex) => {
            const period = periodIndex + 1;
            return (
              <div
                key={`period-${period}`}
                className="sticky left-0 z-10 bg-surface-container-low border-b border-r border-rule p-4 text-data-table text-on-surface-variant"
                style={{ gridColumn: 1, gridRow: period + 1 }}
              >
                <div className="text-xs font-semibold">P{period}</div>
                <div className="mt-0.5 text-[10px] font-normal text-mono-grey">Hour {period}</div>
              </div>
            );
          })}

          {dayValues.flatMap((day, dayIndex) => (
            Array.from({ length: periodsPerDay }).map((_, periodIndex) => {
              const period = periodIndex + 1;
              return (
                <div
                  key={`${day}-${period}`}
                  onDragOver={(event) => {
                    if (editable) event.preventDefault();
                  }}
                  onDrop={() => onDropCell(day, period)}
                  className="border-b border-r border-rule p-2 min-h-24"
                  style={{ gridColumn: dayIndex + 2, gridRow: period + 1 }}
                >
                  <div className="flex h-full min-h-16 items-center justify-center text-xs italic text-mono-grey/40">
                    Empty
                  </div>
                </div>
              );
            })
          ))}

          {filteredAssignments.map((slot) => {
            const dayIndex = dayValues.indexOf(slot.day);
            if (dayIndex < 0) return null;
            const duration = slot.duration_periods || 1;
            const subject = subjectMap.get(slot.subject_id);
            const subjectCode = subject?.name.split(' ').map((word) => word[0]).join('').slice(0, 4).toUpperCase() || 'SUB';

            return (
              <div
                key={slot.id}
                draggable={editable}
                onDragStart={() => setDraggingId(slot.id)}
                onDragEnd={() => setDraggingId(null)}
                className={`z-30 m-2 rounded-lg border border-primary/25 bg-accent-soft p-3 text-primary shadow-sm ${editable ? 'cursor-grab active:cursor-grabbing' : ''}`}
                style={{
                  gridColumn: dayIndex + 2,
                  gridRow: `${slot.period + 1} / span ${Math.min(duration, periodsPerDay - slot.period + 1)}`,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold" style={{ fontFamily: 'var(--font-mono)' }}>
                      {subjectCode}
                    </div>
                    <div className="mt-1 text-[11px] font-semibold text-on-surface">{subject?.name || 'Unknown Subject'}</div>
                  </div>
                  <span className="rounded-full border border-primary/20 px-1.5 py-0.5 text-[9px] font-bold">
                    {duration}h
                  </span>
                </div>
                <div className="mt-2 grid gap-1 border-t border-rule/50 pt-2 text-[10px] text-mono-grey">
                  <span>{teacherMap.get(slot.teacher_id) || 'Unknown Teacher'}</span>
                  <span>{roomMap.get(slot.room_id) || 'Unknown Room'}</span>
                  {viewType !== 'section' && <span>{sectionMap.get(slot.section_id) || 'Unknown Section'}</span>}
                </div>
                {editable && (
                  <div className="mt-3 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => saveSlot(slot.id, { duration_periods: duration === 2 ? 1 : 2 })}
                      className="rounded border border-rule bg-paper-raised px-2 py-1 text-[10px] font-semibold text-on-surface-variant hover:bg-surface-container"
                    >
                      {duration === 2 ? 'Make 1h' : 'Make 2h'}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSlot(slot.id)}
                      className="rounded border border-error/20 bg-error-container px-2 py-1 text-[10px] font-semibold text-on-error-container hover:opacity-80"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
