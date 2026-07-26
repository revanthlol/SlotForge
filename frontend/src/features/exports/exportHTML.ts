import { renderFullHTMLDocument } from './TimetableHTMLTemplate';
import type { ExportTimetableData } from './types';
import { cleanFilename, downloadFile } from './utils';

export function exportAsHTML(data: ExportTimetableData) {
  downloadFile(
    renderFullHTMLDocument(data),
    `${cleanFilename(data.meta.filename)}.html`,
    'text/html;charset=utf-8',
  );
}
