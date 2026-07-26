import type { ExportCell, ExportTimetableData } from './types';
import { cleanFilename, daySortValue, normalizeExportData } from './utils';

const dayCodes = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function escapeICal(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function eventDate(cell: ExportCell, durationOffset = 0) {
  const base = new Date(Date.UTC(2026, 0, 5, 8, 30, 0));
  const dayOffset = Math.max(daySortValue(cell.day), 0);
  const periodOffsetMinutes = (cell.period - 1 + durationOffset) * 55;
  base.setUTCDate(base.getUTCDate() + dayOffset);
  base.setUTCMinutes(base.getUTCMinutes() + periodOffsetMinutes);
  return `${base.getUTCFullYear()}${pad(base.getUTCMonth() + 1)}${pad(base.getUTCDate())}T${pad(base.getUTCHours())}${pad(base.getUTCMinutes())}00Z`;
}

export function exportAsICal(data: ExportTimetableData) {
  const normalized = normalizeExportData(data);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const events = normalized.cells.map((cell) => {
    const byDay = dayCodes[Math.max(daySortValue(cell.day), 0)] || 'MO';
    const description = [
      cell.section ? `Section: ${cell.section}` : '',
      cell.teacher ? `Teacher: ${cell.teacher}` : '',
      cell.room ? `Room: ${cell.room}` : '',
      normalized.meta.scheduleLabel,
    ].filter(Boolean).join('\\n');

    return [
      'BEGIN:VEVENT',
      `UID:${cell.id}@slotforge`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${eventDate(cell)}`,
      `DTEND:${eventDate(cell, cell.duration || 1)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${byDay}`,
      `SUMMARY:${escapeICal(`${cell.subject}${cell.section ? ` - ${cell.section}` : ''}`)}`,
      cell.room ? `LOCATION:${escapeICal(cell.room)}` : '',
      `DESCRIPTION:${escapeICal(description)}`,
      'END:VEVENT',
    ].filter(Boolean).join('\r\n');
  });

  const content = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SlotForge//Timetable Export//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICal(normalized.meta.title)}`,
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${cleanFilename(data.meta.filename)}.ics`;
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(link.href);
  link.remove();
}
