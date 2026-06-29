import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { ScheduledSlot, Teacher, Room, Subject, Section, Organization } from '../../hooks/useApi';
import api from '../../lib/api';
import ConfirmModal from './ConfirmModal';
import Modal from './Modal';
import { colorMix, getSubjectColor, readableTextColor } from '../../lib/subjectColors';

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

type ViewType = 'section' | 'teacher' | 'room';
type GridOrientation = 'hours-x' | 'days-x';
type DisplayMode = 'board' | 'list';

const roman = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

const weekdayLabels: Record<string, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
};

function subjectCode(name?: string) {
  if (!name) return 'SUB';
  const compact = name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('');
  return (compact || name).slice(0, 5).toUpperCase();
}

export default function TimetableGrid({
  timetableId,
  assignments,
  teachers,
  rooms,
  subjects,
  sections,
  organization,
  editable,
}: TimetableGridProps) {
  const [viewType, setViewType] = useState<ViewType>('section');
  const [orientation, setOrientation] = useState<GridOrientation>('hours-x');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('board');
  const [selectedId, setSelectedId] = useState<string>('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [pendingSlotId, setPendingSlotId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ScheduledSlot | null>(null);
  const [localAssignments, setLocalAssignments] = useState<ScheduledSlot[]>(assignments);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    section_id: '',
    subject_id: '',
    teacher_id: '',
    room_id: '',
    day: '',
    period: 1,
    duration_periods: 1,
  });

  useEffect(() => {
    setLocalAssignments(assignments);
  }, [assignments]);

  const cycleLength = organization?.cycle_length || 5;
  const periodsPerDay = organization?.periods_per_day || 5;
  const isDayOrder = organization?.scheduling_mode === 'day_order';

  const dayValues = Array.from({ length: cycleLength }).map((_, index) => {
    if (isDayOrder) return `Day Order ${roman[index + 1] || index + 1}`;
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index] || `Day ${index + 1}`;
  });

  const dayLabels = dayValues.map((day) => {
    if (day.startsWith('Day Order ')) return day.replace('Day Order ', 'Day ');
    return weekdayLabels[day] || day;
  });

  const list = useMemo(() => {
    if (viewType === 'teacher') return teachers.map((teacher) => ({ id: teacher.id, name: teacher.name }));
    if (viewType === 'room') return rooms.map((room) => ({ id: room.id, name: room.name }));
    return sections.map((section) => ({ id: section.id, name: section.name }));
  }, [rooms, sections, teachers, viewType]);

  const activeId = selectedId && list.some((item) => item.id === selectedId)
    ? selectedId
    : list[0]?.id || '';

  const filteredAssignments = useMemo(() => localAssignments.filter((slot) => {
    if (!activeId) return false;
    if (viewType === 'teacher') return slot.teacher_id === activeId;
    if (viewType === 'room') return slot.room_id === activeId;
    return slot.section_id === activeId;
  }), [activeId, localAssignments, viewType]);

  const teacherMap = useMemo(() => new Map(teachers.map((teacher) => [teacher.id, teacher.name])), [teachers]);
  const roomMap = useMemo(() => new Map(rooms.map((room) => [room.id, room.name])), [rooms]);
  const subjectMap = useMemo(() => new Map(subjects.map((subject) => [subject.id, subject])), [subjects]);
  const sectionMap = useMemo(() => new Map(sections.map((section) => [section.id, section.name])), [sections]);

  const sortedAssignments = useMemo(() => [...localAssignments].sort((a, b) => {
    const dayDiff = dayValues.indexOf(a.day) - dayValues.indexOf(b.day);
    if (dayDiff !== 0) return dayDiff;
    return a.period - b.period;
  }), [dayValues, localAssignments]);

  const slotByStart = useMemo(() => {
    const map = new Map<string, ScheduledSlot>();
    filteredAssignments.forEach((slot) => {
      map.set(`${slot.day}:${slot.period}`, slot);
    });
    return map;
  }, [filteredAssignments]);

  const coveredCells = useMemo(() => {
    const set = new Set<string>();
    filteredAssignments.forEach((slot) => {
      const duration = Math.min(slot.duration_periods || 1, periodsPerDay - slot.period + 1);
      for (let offset = 1; offset < duration; offset += 1) {
        set.add(`${slot.day}:${slot.period + offset}`);
      }
    });
    return set;
  }, [filteredAssignments, periodsPerDay]);

  const saveSlot = async (slotId: string, payload: Partial<ScheduledSlot>) => {
    if (pendingSlotId) return;
    const previousAssignments = localAssignments;
    setEditError(null);
    setPendingSlotId(slotId);
    setLocalAssignments((current) => current.map((slot) => (
      slot.id === slotId ? { ...slot, ...payload } : slot
    )));
    try {
      const response = await api.patch(`/timetables/${timetableId}/slots/${slotId}`, payload);
      setLocalAssignments((current) => current.map((slot) => (
        slot.id === slotId ? { ...slot, ...response.data } : slot
      )));
    } catch (err: any) {
      setLocalAssignments(previousAssignments);
      setEditError(err.response?.data?.detail || err.message || 'Could not update timetable slot');
    } finally {
      setPendingSlotId(null);
    }
  };

  const deleteSlot = async () => {
    if (!deleteTarget) return;
    const slotId = deleteTarget.id;
    const previousAssignments = localAssignments;
    setEditError(null);
    setPendingSlotId(slotId);
    setLocalAssignments((current) => current.filter((slot) => slot.id !== slotId));
    try {
      await api.delete(`/timetables/${timetableId}/slots/${slotId}`);
      setDeleteTarget(null);
    } catch (err: any) {
      setLocalAssignments(previousAssignments);
      setEditError(err.response?.data?.detail || err.message || 'Could not delete timetable slot');
    } finally {
      setPendingSlotId(null);
    }
  };

  const onDropCell = (day: string, period: number) => {
    if (!editable || !draggingId || pendingSlotId) return;
    const draggedSlot = localAssignments.find((slot) => slot.id === draggingId);
    if (draggedSlot?.day === day && draggedSlot.period === period) {
      setDraggingId(null);
      return;
    }
    saveSlot(draggingId, { day, period });
    setDraggingId(null);
  };

  const openAddSlot = () => {
    setEditError(null);
    setAddForm({
      section_id: viewType === 'section' && activeId ? activeId : sections[0]?.id || '',
      subject_id: subjects[0]?.id || '',
      teacher_id: teachers[0]?.id || '',
      room_id: rooms[0]?.id || '',
      day: dayValues[0] || '',
      period: 1,
      duration_periods: subjects[0]?.session_length || 1,
    });
    setAddOpen(true);
  };

  const createSlot = async () => {
    if (!addForm.section_id || !addForm.subject_id || !addForm.teacher_id || !addForm.room_id || !addForm.day) return;
    setPendingSlotId('new');
    setEditError(null);
    try {
      const response = await api.post(`/timetables/${timetableId}/slots`, addForm);
      setLocalAssignments((current) => [...current, response.data]);
      setAddOpen(false);
    } catch (err: any) {
      setEditError(err.response?.data?.detail || err.message || 'Could not add timetable slot');
    } finally {
      setPendingSlotId(null);
    }
  };

  const renderSlot = (slot: ScheduledSlot) => {
    const subject = subjectMap.get(slot.subject_id);
    const subjectColor = subject ? getSubjectColor(subject) : '#64748b';
    const textColor = readableTextColor(subjectColor);
    const duration = Math.min(slot.duration_periods || 1, periodsPerDay - slot.period + 1);
    const isPending = pendingSlotId === slot.id;

    return (
      <div
        key={slot.id}
        draggable={editable && !isPending}
        onDragStart={(event) => {
          if (!editable || isPending) return;
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', slot.id);
          setDraggingId(slot.id);
        }}
        onDragEnd={() => setDraggingId(null)}
        className={`group h-full rounded-lg border p-3.5 shadow-sm transition-all ${
          editable && !isPending ? 'cursor-grab active:cursor-grabbing hover:-translate-y-0.5 hover:shadow-md' : ''
        } ${draggingId === slot.id ? 'opacity-45 ring-2 ring-primary' : ''}`}
        style={{
          background: `linear-gradient(135deg, ${subjectColor}, ${colorMix(subjectColor, 0.74)})`,
          borderColor: subjectColor,
          color: textColor,
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-[13px] font-black" style={{ fontFamily: 'var(--font-mono)', letterSpacing: 0 }}>
              {subjectCode(subject?.name)}
            </div>
            <div className="mt-1 line-clamp-2 text-[13px] font-semibold leading-snug" style={{ color: textColor }}>
              {subject?.name || 'Unknown Subject'}
            </div>
          </div>
          <span
            className="shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-black"
            style={{ borderColor: 'rgba(255,255,255,0.38)', background: 'rgba(255,255,255,0.2)', color: textColor }}
          >
            {duration}h
          </span>
        </div>

        <div className="mt-2 grid gap-1 border-t pt-2 text-[11px]" style={{ borderColor: 'rgba(255,255,255,0.28)', color: textColor }}>
          <span className="truncate">{teacherMap.get(slot.teacher_id) || 'Unknown Teacher'}</span>
          <span className="truncate">{roomMap.get(slot.room_id) || 'Unknown Room'}</span>
          {viewType !== 'section' && <span className="truncate">{sectionMap.get(slot.section_id) || 'Unknown Section'}</span>}
        </div>

        {editable && (
          <div className="mt-3 flex flex-wrap items-center gap-1 opacity-90">
            <button
              type="button"
              disabled={isPending}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => saveSlot(slot.id, { duration_periods: duration === 2 ? 1 : 2 })}
              className="rounded border border-rule bg-paper-raised/80 px-2 py-1 text-[10px] font-semibold text-on-surface-variant hover:bg-surface-container disabled:opacity-50"
            >
              {duration === 2 ? 'Make 1h' : 'Make 2h'}
            </button>
            <button
              type="button"
              disabled={isPending}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => setDeleteTarget(slot)}
              className="rounded border border-error/20 bg-error-container px-2 py-1 text-[10px] font-semibold text-on-error-container hover:opacity-80 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderDropCell = (day: string, period: number, style: CSSProperties) => {
    const isActiveDrop = Boolean(editable && draggingId && !pendingSlotId);

    return (
      <div
        key={`empty-${day}-${period}`}
        onDragOver={(event) => {
          if (isActiveDrop) {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          onDropCell(day, period);
        }}
        className={`min-h-24 border-b border-r border-rule p-2 transition-colors ${
          isActiveDrop ? 'bg-accent-soft/35 hover:bg-accent-soft' : ''
        }`}
        style={style}
      >
        <div className="flex h-full min-h-16 items-center justify-center rounded border border-dashed border-transparent text-xs italic text-mono-grey/40">
          {isActiveDrop ? 'Drop here' : 'Empty'}
        </div>
      </div>
    );
  };

  const renderHoursOnXAxis = () => (
    <div
      className="grid min-w-[1040px]"
      style={{
        gridTemplateColumns: `150px repeat(${periodsPerDay}, minmax(164px, 1fr))`,
        gridTemplateRows: `48px repeat(${cycleLength}, minmax(124px, auto))`,
      }}
    >
      <div className="sticky left-0 z-20 bg-on-background text-paper-raised border-b border-r border-rule p-3 text-data-table font-semibold">
        Day Order
      </div>
      {Array.from({ length: periodsPerDay }).map((_, periodIndex) => (
        <div key={`hour-head-${periodIndex + 1}`} className="bg-on-background text-paper-raised border-b border-r border-rule p-3 text-center text-data-table font-semibold">
          Hour {periodIndex + 1}
        </div>
      ))}

      {dayValues.map((day, dayIndex) => (
        <div
          key={`day-head-${day}`}
          className="sticky left-0 z-10 bg-surface-container-low border-b border-r border-rule p-4 text-data-table text-on-surface-variant"
          style={{ gridColumn: 1, gridRow: dayIndex + 2 }}
        >
          <div className="text-xs font-semibold">{dayLabels[dayIndex]}</div>
          <div className="mt-0.5 text-[10px] font-normal text-mono-grey">Cycle {dayIndex + 1}</div>
        </div>
      ))}

      {dayValues.flatMap((day, dayIndex) => (
        Array.from({ length: periodsPerDay }).flatMap((_, periodIndex) => {
          const period = periodIndex + 1;
          const key = `${day}:${period}`;
          if (coveredCells.has(key)) return [];
          const slot = slotByStart.get(key);
          const span = slot ? Math.min(slot.duration_periods || 1, periodsPerDay - period + 1) : 1;
          const style = {
            gridColumn: `${period + 1} / span ${span}`,
            gridRow: dayIndex + 2,
          };
          if (slot) {
            return (
              <div key={slot.id} className="border-b border-r border-rule p-2 min-h-24" style={style}>
                {renderSlot(slot)}
              </div>
            );
          }
          return renderDropCell(day, period, style);
        })
      ))}
    </div>
  );

  const renderDaysOnXAxis = () => (
    <div
      className="grid min-w-[960px]"
      style={{
        gridTemplateColumns: `150px repeat(${cycleLength}, minmax(190px, 1fr))`,
        gridTemplateRows: `48px repeat(${periodsPerDay}, minmax(112px, auto))`,
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

      {Array.from({ length: periodsPerDay }).map((_, periodIndex) => (
        <div
          key={`period-${periodIndex + 1}`}
          className="sticky left-0 z-10 bg-surface-container-low border-b border-r border-rule p-4 text-data-table text-on-surface-variant"
          style={{ gridColumn: 1, gridRow: periodIndex + 2 }}
        >
          <div className="text-xs font-semibold">P{periodIndex + 1}</div>
          <div className="mt-0.5 text-[10px] font-normal text-mono-grey">Hour {periodIndex + 1}</div>
        </div>
      ))}

      {dayValues.flatMap((day, dayIndex) => (
        Array.from({ length: periodsPerDay }).flatMap((_, periodIndex) => {
          const period = periodIndex + 1;
          const key = `${day}:${period}`;
          if (coveredCells.has(key)) return [];
          const slot = slotByStart.get(key);
          const span = slot ? Math.min(slot.duration_periods || 1, periodsPerDay - period + 1) : 1;
          const style = {
            gridColumn: dayIndex + 2,
            gridRow: `${period + 1} / span ${span}`,
          };
          if (slot) {
            return (
              <div key={slot.id} className="border-b border-r border-rule p-2 min-h-24" style={style}>
                {renderSlot(slot)}
              </div>
            );
          }
          return renderDropCell(day, period, style);
        })
      ))}
    </div>
  );

  const renderAllClasses = () => (
    <div className="max-h-[70vh] overflow-auto rounded-xl border-2 border-rule bg-paper-raised shadow-sm">
      <table className="w-full min-w-[980px]">
        <thead className="sticky top-0 z-10 bg-on-background text-paper-raised">
          <tr>
            <th className="px-4 py-3 text-left text-data-table font-semibold">Day</th>
            <th className="px-4 py-3 text-left text-data-table font-semibold">Hour</th>
            <th className="px-4 py-3 text-left text-data-table font-semibold">Section</th>
            <th className="px-4 py-3 text-left text-data-table font-semibold">Subject</th>
            <th className="px-4 py-3 text-left text-data-table font-semibold">Teacher</th>
            <th className="px-4 py-3 text-left text-data-table font-semibold">Room</th>
            <th className="px-4 py-3 text-left text-data-table font-semibold">Duration</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rule">
          {sortedAssignments.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-12 text-center text-sm text-mono-grey">
                No classes scheduled in this version.
              </td>
            </tr>
          ) : sortedAssignments.map((slot) => {
            const subject = subjectMap.get(slot.subject_id);
            const subjectColor = subject ? getSubjectColor(subject) : '#64748b';
            return (
              <tr key={slot.id} className="hover:bg-surface-container-low">
                <td className="px-4 py-3 text-sm font-semibold text-on-surface">{dayLabels[dayValues.indexOf(slot.day)] || slot.day}</td>
                <td className="px-4 py-3 text-sm text-on-surface">Hour {slot.period}</td>
                <td className="px-4 py-3 text-sm text-on-surface">{sectionMap.get(slot.section_id) || 'Unknown Section'}</td>
                <td className="px-4 py-3 text-sm text-on-surface">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3 w-3 rounded-sm" style={{ background: subjectColor }} />
                    {subject?.name || 'Unknown Subject'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-on-surface">{teacherMap.get(slot.teacher_id) || 'Unknown Teacher'}</td>
                <td className="px-4 py-3 text-sm text-on-surface">{roomMap.get(slot.room_id) || 'Unknown Room'}</td>
                <td className="px-4 py-3 text-sm text-on-surface">{slot.duration_periods || 1}h</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 p-inset-compact bg-paper-raised border-2 border-rule rounded-xl">
        <div className="flex flex-wrap items-center gap-3">
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

          <span className="text-label-caps text-mono-grey" style={{ fontSize: 10 }}>Grid:</span>
          <div className="flex bg-surface-container p-0.5 rounded-lg border border-rule">
            <button
              type="button"
              onClick={() => setOrientation('hours-x')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                orientation === 'hours-x' ? 'bg-paper-raised text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Hours x Day Orders
            </button>
            <button
              type="button"
              onClick={() => setOrientation('days-x')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                orientation === 'days-x' ? 'bg-paper-raised text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Days x Hours
            </button>
          </div>

          <span className="text-label-caps text-mono-grey" style={{ fontSize: 10 }}>View:</span>
          <div className="flex bg-surface-container p-0.5 rounded-lg border border-rule">
            {(['board', 'list'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setDisplayMode(mode)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-all ${
                  displayMode === mode ? 'bg-paper-raised text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {mode === 'board' ? 'Board' : 'All Classes'}
              </button>
            ))}
          </div>

          {editable && (
            <span className="rounded-full border border-primary/20 bg-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              Editable Draft
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
        {list.length > 0 ? (
          <>
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
          </>
        ) : (
          <p className="text-sm text-mono-grey italic">No {viewType}s available</p>
        )}
          {editable && (
            <button
              type="button"
              onClick={openAddSlot}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-on-primary hover:bg-primary-container"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
              Add Class
            </button>
          )}
        </div>
      </div>

      {editError && (
        <div className="rounded-lg border border-error/20 bg-error-container px-4 py-3 text-sm text-on-error-container">
          {editError}
        </div>
      )}

      {displayMode === 'list' ? (
        renderAllClasses()
      ) : (
        <div className="bg-paper-raised border-2 border-rule rounded-xl overflow-x-auto shadow-sm">
          {orientation === 'hours-x' ? renderHoursOnXAxis() : renderDaysOnXAxis()}
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete timetable slot"
        message="Delete this assignment from the draft timetable?"
        confirmLabel="Delete Slot"
        loading={Boolean(deleteTarget && pendingSlotId === deleteTarget.id)}
        error={editError}
        onCancel={() => {
          setDeleteTarget(null);
          setEditError(null);
        }}
        onConfirm={deleteSlot}
      />

      <Modal
        open={addOpen}
        onClose={() => !pendingSlotId && setAddOpen(false)}
        title="Add class to timetable"
        maxWidth="max-w-2xl"
        actions={
          <>
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              disabled={Boolean(pendingSlotId)}
              className="px-4 py-2 text-sm text-on-surface-variant border border-rule rounded-lg hover:bg-surface-container transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={createSlot}
              disabled={Boolean(pendingSlotId)}
              data-modal-primary="true"
              className="px-4 py-2 bg-primary text-on-primary text-sm font-semibold rounded-lg hover:bg-primary-container transition-colors disabled:opacity-50"
            >
              {pendingSlotId === 'new' ? 'Adding...' : 'Add Class'}
            </button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-xs font-semibold text-on-surface-variant">
            Section
            <select value={addForm.section_id} onChange={(event) => setAddForm((form) => ({ ...form, section_id: event.target.value }))} className="academic-input py-2">
              {sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-xs font-semibold text-on-surface-variant">
            Subject
            <select value={addForm.subject_id} onChange={(event) => {
              const subject = subjectMap.get(event.target.value);
              setAddForm((form) => ({ ...form, subject_id: event.target.value, duration_periods: subject?.session_length || form.duration_periods }));
            }} className="academic-input py-2">
              {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-xs font-semibold text-on-surface-variant">
            Teacher
            <select value={addForm.teacher_id} onChange={(event) => setAddForm((form) => ({ ...form, teacher_id: event.target.value }))} className="academic-input py-2">
              {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-xs font-semibold text-on-surface-variant">
            Room
            <select value={addForm.room_id} onChange={(event) => setAddForm((form) => ({ ...form, room_id: event.target.value }))} className="academic-input py-2">
              {rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-xs font-semibold text-on-surface-variant">
            Day
            <select value={addForm.day} onChange={(event) => setAddForm((form) => ({ ...form, day: event.target.value }))} className="academic-input py-2">
              {dayValues.map((day, index) => <option key={day} value={day}>{dayLabels[index]}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-xs font-semibold text-on-surface-variant">
            Hour
            <select value={addForm.period} onChange={(event) => setAddForm((form) => ({ ...form, period: Number(event.target.value) }))} className="academic-input py-2">
              {Array.from({ length: periodsPerDay }).map((_, index) => <option key={index + 1} value={index + 1}>Hour {index + 1}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-xs font-semibold text-on-surface-variant md:col-span-2">
            Duration
            <div className="grid grid-cols-2 gap-2">
              {[1, 2].map((duration) => (
                <button
                  key={duration}
                  type="button"
                  onClick={() => setAddForm((form) => ({ ...form, duration_periods: duration }))}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${addForm.duration_periods === duration ? 'border-primary bg-accent-soft text-primary' : 'border-rule text-on-surface-variant hover:bg-surface-container'}`}
                >
                  {duration === 1 ? '1 Hour' : '2 Hour Lab'}
                </button>
              ))}
            </div>
          </label>
          {editError && (
            <div className="md:col-span-2 rounded-lg border border-error/20 bg-error-container px-3 py-2 text-sm text-on-error-container">
              {editError}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
