import { useState } from 'react';
import { Select, Button, Tooltip, Badge } from 'antd';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { DownloadOutlined, EditOutlined } from '@ant-design/icons';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
const SLOTS = ['9:00–9:55', '10:00–10:55', '11:00–11:55', '12:00–12:55', '13:00–13:55', '14:00–14:55', '15:00–15:55', '16:00–16:55'];

interface SlotEntry {
  id: string;
  subject: string;
  teacher: string;
  room: string;
  type: 'theory' | 'lab';
  color: string;
}

type TimetableData = Record<string, Record<string, SlotEntry | null>>;

const SUBJECT_COLORS: Record<string, string> = {
  DBMS: '#6366f1', OS: '#06b6d4', Networks: '#10b981', Maths: '#f59e0b', Lab: '#ec4899',
};

const INITIAL_DATA: TimetableData = {
  MON: {
    '9:00–9:55': { id: 'mon-9', subject: 'DBMS', teacher: 'Dr. Rao', room: 'Room 101', type: 'theory', color: '#6366f1' },
    '10:00–10:55': { id: 'mon-10', subject: 'OS', teacher: 'Prof. Sharma', room: 'Room 204', type: 'theory', color: '#06b6d4' },
    '11:00–11:55': null,
    '12:00–12:55': { id: 'mon-12', subject: 'Maths', teacher: 'Prof. Sharma', room: 'Room 101', type: 'theory', color: '#f59e0b' },
    '13:00–13:55': null, '14:00–14:55': null,
    '15:00–15:55': { id: 'mon-15', subject: 'DBMS Lab', teacher: 'Dr. Rao', room: 'Lab 201', type: 'lab', color: '#ec4899' },
    '16:00–16:55': { id: 'mon-16', subject: 'DBMS Lab', teacher: 'Dr. Rao', room: 'Lab 201', type: 'lab', color: '#ec4899' },
  },
  TUE: {
    '9:00–9:55': { id: 'tue-9', subject: 'Networks', teacher: 'Dr. Priya', room: 'Room 204', type: 'theory', color: '#10b981' },
    '10:00–10:55': null,
    '11:00–11:55': { id: 'tue-11', subject: 'DBMS', teacher: 'Dr. Rao', room: 'Room 101', type: 'theory', color: '#6366f1' },
    '12:00–12:55': null, '13:00–13:55': null,
    '14:00–14:55': { id: 'tue-14', subject: 'OS', teacher: 'Prof. Sharma', room: 'Room 204', type: 'theory', color: '#06b6d4' },
    '15:00–15:55': null, '16:00–16:55': null,
  },
  WED: {
    '9:00–9:55': null,
    '10:00–10:55': { id: 'wed-10', subject: 'Maths', teacher: 'Prof. Sharma', room: 'Room 101', type: 'theory', color: '#f59e0b' },
    '11:00–11:55': { id: 'wed-11', subject: 'Networks', teacher: 'Dr. Priya', room: 'Room 204', type: 'theory', color: '#10b981' },
    '12:00–12:55': null, '13:00–13:55': null, '14:00–14:55': null, '15:00–15:55': null, '16:00–16:55': null,
  },
  THU: {
    '9:00–9:55': { id: 'thu-9', subject: 'OS', teacher: 'Prof. Sharma', room: 'Room 204', type: 'theory', color: '#06b6d4' },
    '10:00–10:55': { id: 'thu-10', subject: 'DBMS', teacher: 'Dr. Rao', room: 'Room 101', type: 'theory', color: '#6366f1' },
    '11:00–11:55': null, '12:00–12:55': null, '13:00–13:55': null, '14:00–14:55': null,
    '15:00–15:55': { id: 'thu-15', subject: 'Networks Lab', teacher: 'Dr. Priya', room: 'Lab 201', type: 'lab', color: '#ec4899' },
    '16:00–16:55': { id: 'thu-16', subject: 'Networks Lab', teacher: 'Dr. Priya', room: 'Lab 201', type: 'lab', color: '#ec4899' },
  },
  FRI: {
    '9:00–9:55': { id: 'fri-9', subject: 'Maths', teacher: 'Prof. Sharma', room: 'Room 101', type: 'theory', color: '#f59e0b' },
    '10:00–10:55': null,
    '11:00–11:55': { id: 'fri-11', subject: 'OS', teacher: 'Prof. Sharma', room: 'Room 204', type: 'theory', color: '#06b6d4' },
    '12:00–12:55': null, '13:00–13:55': null, '14:00–14:55': null, '15:00–15:55': null, '16:00–16:55': null,
  },
};

export default function TimetablePage() {
  const [data, setData] = useState<TimetableData>(INITIAL_DATA);
  const [section, setSection] = useState('CS-A');

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination || source.droppableId === destination.droppableId) return;

    const [srcDay, srcSlot] = source.droppableId.split('||');
    const [dstDay, dstSlot] = destination.droppableId.split('||');

    const srcEntry = data[srcDay][srcSlot];
    const dstEntry = data[dstDay][dstSlot];

    setData(prev => ({
      ...prev,
      [srcDay]: { ...prev[srcDay], [srcSlot]: dstEntry },
      [dstDay]: { ...prev[dstDay], [dstSlot]: srcEntry },
    }));
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
            Schedule
          </p>
          <h1 style={{ margin: '4px 0', fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
            Timetable
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Select
            value={section}
            onChange={setSection}
            options={['CS-A', 'CS-B', 'CS-C'].map(s => ({ value: s, label: s }))}
            style={{ width: 120, fontFamily: 'var(--font-mono)' }}
          />
          <Badge status="success" text={<span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>Published</span>} />
          <Button icon={<EditOutlined />} style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-strong)', color: 'var(--color-text-secondary)' }}>
            Edit mode
          </Button>
          <Button icon={<DownloadOutlined />} type="primary">Export</Button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {Object.entries(SUBJECT_COLORS).map(([subj, color]) => (
          <div key={subj} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{subj}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ overflowX: 'auto' }}>
        <DragDropContext onDragEnd={onDragEnd}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '80px repeat(5, 1fr)',
            gap: 1,
            background: 'var(--color-border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            minWidth: 700,
          }}>
            {/* Header row */}
            <div style={{ background: 'var(--color-bg-elevated)', padding: '10px 12px' }} />
            {DAYS.map(day => (
              <div key={day} style={{
                background: 'var(--color-bg-elevated)', padding: '10px 12px', textAlign: 'center',
                fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)',
                letterSpacing: '0.1em', fontFamily: 'var(--font-mono)',
              }}>
                {day}
              </div>
            ))}

            {/* Slot rows */}
            {SLOTS.map(slot => (
              <>
                {/* Time label */}
                <div key={`label-${slot}`} style={{
                  background: 'var(--color-bg-surface)', padding: '8px 12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                  fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)',
                  whiteSpace: 'nowrap',
                }}>
                  {slot.split('–')[0]}
                </div>

                {/* Day cells */}
                {DAYS.map(day => {
                  const entry = data[day]?.[slot];
                  const droppableId = `${day}||${slot}`;
                  return (
                    <Droppable droppableId={droppableId} key={droppableId}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          style={{
                            background: snapshot.isDraggingOver ? 'rgba(99,102,241,0.08)' : 'var(--color-bg-surface)',
                            minHeight: 64, padding: 4, position: 'relative',
                            transition: 'background 0.15s',
                          }}
                        >
                          {entry ? (
                            <Draggable draggableId={entry.id} index={0}>
                              {(drag, dragSnapshot) => (
                                <Tooltip title={`${entry.teacher} · ${entry.room}`} placement="top">
                                  <div
                                    ref={drag.innerRef}
                                    {...drag.draggableProps}
                                    {...drag.dragHandleProps}
                                    style={{
                                      ...drag.draggableProps.style,
                                      background: `${entry.color}18`,
                                      border: `1px solid ${entry.color}40`,
                                      borderLeft: `3px solid ${entry.color}`,
                                      borderRadius: 6,
                                      padding: '6px 8px',
                                      cursor: 'grab',
                                      opacity: dragSnapshot.isDragging ? 0.8 : 1,
                                      transform: dragSnapshot.isDragging ? `${drag.draggableProps.style?.transform} rotate(1deg)` : drag.draggableProps.style?.transform,
                                      height: '100%',
                                    }}
                                  >
                                    <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: entry.color, lineHeight: 1.2 }}>
                                      {entry.subject}
                                    </p>
                                    <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--color-text-muted)', lineHeight: 1.3 }}>
                                      {entry.teacher.split(' ').slice(-1)[0]}
                                    </p>
                                  </div>
                                </Tooltip>
                              )}
                            </Draggable>
                          ) : (
                            <div style={{ height: '100%', minHeight: 56 }} />
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  );
                })}
              </>
            ))}
          </div>
        </DragDropContext>
      </div>

      <p style={{ marginTop: 12, fontSize: 12, color: 'var(--color-text-muted)' }}>
        Drag and drop slots to reschedule. Changes are saved as a draft until you publish.
      </p>
    </div>
  );
}
