import type { ExportCell, ExportTimetableData } from './types';

export const weekdayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const weekdayLabels: Record<string, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
};

export function cleanFilename(value: string) {
  return value
    .trim()
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'timetable';
}

export function escapeHTML(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function dayLabel(day: string) {
  if (day.startsWith('Day Order ')) return day.replace('Day Order ', 'Day ');
  return weekdayLabels[day] || day;
}

export function daySortValue(day: string) {
  const fixed = weekdayOrder.indexOf(day);
  if (fixed >= 0) return fixed;
  const match = day.match(/Day Order\s+([IVX]+|\d+)/i);
  if (!match) return 99;
  const roman = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
  const romanIndex = roman.findIndex((value) => value.toLowerCase() === match[1].toLowerCase());
  return romanIndex > 0 ? romanIndex - 1 : Number(match[1]) - 1;
}

export function inferDays(cells: ExportCell[], fallbackLength = 5) {
  const found = Array.from(new Set(cells.map((cell) => cell.day))).sort((a, b) => daySortValue(a) - daySortValue(b));
  return found.length ? found : weekdayOrder.slice(0, fallbackLength);
}

export function buildGridRows(data: ExportTimetableData) {
  const slotByStart = new Map(data.cells.map((cell) => [`${cell.day}:${cell.period}`, cell]));
  const rows: string[][] = [
    ['Day', ...Array.from({ length: data.periods }).map((_, index) => `Period ${index + 1}`)],
  ];

  for (const day of data.days) {
    const row = [dayLabel(day)];
    for (let period = 1; period <= data.periods; period += 1) {
      const cell = slotByStart.get(`${day}:${period}`);
      if (!cell) {
        row.push('');
        continue;
      }
      const details = [
        cell.subject,
        cell.section || '',
        cell.teacher || '',
        cell.room || '',
        cell.duration > 1 ? `${cell.duration} periods` : '',
      ].filter(Boolean);
      row.push(details.join('\n'));
    }
    rows.push(row);
  }
  return rows;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadFile(content: string | Uint8Array, filename: string, mimeType: string) {
  const blobPart = typeof content === 'string'
    ? content
    : (() => {
      const copy = new Uint8Array(content.byteLength);
      copy.set(content);
      return copy.buffer;
    })();
  const blob = new Blob([blobPart], { type: mimeType });
  downloadBlob(blob, filename);
}

export function normalizeExportData(data: ExportTimetableData): ExportTimetableData {
  const cells = [...data.cells].sort((a, b) => {
    const dayDiff = daySortValue(a.day) - daySortValue(b.day);
    if (dayDiff !== 0) return dayDiff;
    return a.period - b.period;
  });
  return {
    ...data,
    days: data.days.length ? data.days : inferDays(cells),
    periods: Math.max(data.periods, ...cells.map((cell) => cell.period + cell.duration - 1), 1),
    cells,
  };
}
