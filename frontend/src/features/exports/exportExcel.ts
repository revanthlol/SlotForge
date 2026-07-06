import * as XLSX from 'xlsx';
import type { ExportTimetableData } from './types';
import { buildGridRows, cleanFilename, normalizeExportData } from './utils';

export function exportAsExcel(data: ExportTimetableData) {
  const normalized = normalizeExportData(data);
  const rows = [
    [normalized.meta.title],
    [normalized.meta.organizationName, normalized.meta.scheduleLabel, `Generated ${new Date(normalized.meta.generatedAt || Date.now()).toLocaleString()}`],
    [],
    ...buildGridRows(normalized),
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet['!cols'] = rows[3].map((_, index) => ({ wch: index === 0 ? 18 : 34 }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Timetable');
  XLSX.writeFile(workbook, `${cleanFilename(data.meta.filename)}.xlsx`);
}

export function exportAsCSV(data: ExportTimetableData) {
  const worksheet = XLSX.utils.aoa_to_sheet(buildGridRows(normalizeExportData(data)));
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${cleanFilename(data.meta.filename)}.csv`;
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(link.href);
  link.remove();
}
