import type { ExportTimetableData } from './types';
import { colorMix } from '../../lib/subjectColors';
import { safeSubjectColor } from '../../lib/timetableVisuals';
import { dayLabel, escapeHTML, normalizeExportData } from './utils';

export const exportCSS = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: #f7f5f0;
    color: #171b1f;
    font-family: Inter, Roboto, Arial, sans-serif;
  }
  .export-page {
    width: 1120px;
    background: #fffdf8;
    padding: 34px;
  }
  .export-header {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    border-bottom: 2px solid #16211e;
    padding-bottom: 18px;
    margin-bottom: 22px;
  }
  .export-kicker {
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #69736f;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    margin-bottom: 8px;
  }
  .export-title {
    margin: 0;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 34px;
    line-height: 1.05;
    color: #18201d;
  }
  .export-subtitle {
    margin: 8px 0 0;
    color: #414944;
    font-size: 13px;
  }
  .export-meta {
    text-align: right;
    font-size: 11px;
    color: #55605b;
    line-height: 1.7;
    min-width: 220px;
  }
  .export-grid {
    border: 1px solid #cbd5d0;
    border-collapse: collapse;
    width: 100%;
    table-layout: fixed;
    background: white;
  }
  .export-grid th {
    background: #173f35;
    color: #ffffff;
    border: 1px solid #173f35;
    padding: 11px 9px;
    font-size: 11px;
    letter-spacing: 0.06em;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    text-align: left;
  }
  .export-grid td {
    border: 1px solid #d8dfdb;
    min-height: 88px;
    vertical-align: top;
    padding: 9px;
    font-size: 12px;
    line-height: 1.35;
  }
  .day-cell {
    width: 112px;
    background: #eef2f6;
    font-weight: 700;
    color: #303936;
  }
  .slot-card {
    min-height: 76px;
    border: 1px solid #a6c1b8;
    background: #d8e9e4;
    border-radius: 6px;
    padding: 10px;
    color: #14221e;
  }
  .slot-subject {
    font-weight: 800;
    margin-bottom: 8px;
  }
  .slot-line {
    border-top: 1px solid rgba(13, 93, 74, 0.22);
    padding-top: 7px;
    color: #3e4a45;
    font-size: 11px;
  }
  .empty-slot {
    color: #9aa39f;
    text-align: center;
    padding-top: 24px;
    border: 1px dashed #d8dfdb;
    min-height: 76px;
  }
  .export-footer {
    border-top: 1px solid #cbd5d0;
    margin-top: 20px;
    padding-top: 12px;
    color: #69736f;
    font-size: 11px;
    display: flex;
    justify-content: space-between;
  }
  @media print {
    body { background: #fff; }
    .export-page { width: auto; padding: 18mm; }
    .export-grid th, .export-grid td { break-inside: avoid; }
  }
`;

function renderSlot(cell?: ExportTimetableData['cells'][number]) {
  if (!cell) return '<div class="empty-slot">-</div>';
  const color = safeSubjectColor(cell.color, cell.subject || cell.id);
  const duration = cell.duration > 1 ? `${cell.duration} periods` : '';
  return `
    <div class="slot-card" style="background:${colorMix(color, 0.15)}; border-color:${colorMix(color, 0.38)}; box-shadow:inset 4px 0 0 ${color};">
      <div class="slot-subject" style="color:${color};">${escapeHTML(cell.subject)}</div>
      <div class="slot-line" style="border-top-color:${colorMix(color, 0.24)};">
        ${cell.section ? `<div>${escapeHTML(cell.section)}</div>` : ''}
        ${cell.teacher ? `<div>${escapeHTML(cell.teacher)}</div>` : ''}
        ${cell.room ? `<div>${escapeHTML(cell.room)}</div>` : ''}
        ${duration ? `<div>${escapeHTML(duration)}</div>` : ''}
      </div>
    </div>
  `;
}

export function renderTimetableBody(data: ExportTimetableData) {
  const normalized = normalizeExportData(data);
  const header = ['Day', ...Array.from({ length: normalized.periods }).map((_, index) => `Period ${index + 1}`)];
  const slotByStart = new Map(normalized.cells.map((cell) => [`${cell.day}:${cell.period}`, cell]));
  return `
    <section class="export-page" id="slotforge-export-page">
      <header class="export-header">
        <div>
          <div class="export-kicker">${escapeHTML(normalized.meta.organizationName)}</div>
          <h1 class="export-title">${escapeHTML(normalized.meta.title)}</h1>
          ${normalized.meta.subtitle ? `<p class="export-subtitle">${escapeHTML(normalized.meta.subtitle)}</p>` : ''}
        </div>
        <div class="export-meta">
          <div>${escapeHTML(normalized.meta.scheduleLabel)}</div>
          <div>Generated ${escapeHTML(new Date(normalized.meta.generatedAt || Date.now()).toLocaleString())}</div>
          <div>${normalized.cells.length} scheduled classes</div>
        </div>
      </header>

      <table class="export-grid">
        <thead>
          <tr>${header.map((cell) => `<th>${escapeHTML(cell)}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${normalized.days.map((day) => {
            const covered = new Set<number>();
            const periodCells: string[] = [];
            for (let period = 1; period <= normalized.periods; period += 1) {
              if (covered.has(period)) continue;
              const cell = slotByStart.get(`${day}:${period}`);
              if (!cell) {
                periodCells.push(`<td>${renderSlot()}</td>`);
                continue;
              }
              const span = Math.min(cell.duration || 1, normalized.periods - period + 1);
              for (let offset = 1; offset < span; offset += 1) covered.add(period + offset);
              periodCells.push(`<td${span > 1 ? ` colspan="${span}"` : ''}>${renderSlot(cell)}</td>`);
            }
            return `
            <tr>
              <td class="day-cell">${escapeHTML(dayLabel(day))}</td>
              ${periodCells.join('')}
            </tr>
          `;
          }).join('')}
        </tbody>
      </table>

      <footer class="export-footer">
        <span>Generated by SlotForge</span>
        <span>${escapeHTML(normalized.meta.scheduleLabel)}</span>
      </footer>
    </section>
  `;
}

export function renderFullHTMLDocument(data: ExportTimetableData) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHTML(data.meta.title)}</title>
    <style>${exportCSS}</style>
  </head>
  <body>${renderTimetableBody(data)}</body>
</html>`;
}
