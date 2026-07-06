import type { ExportTimetableData } from './types';
import { buildGridRows, cleanFilename, escapeHTML, normalizeExportData } from './utils';

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value, true);
}

function writeUint32(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value, true);
}

function dosDateTime(date = new Date()) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

function createZip(files: Array<{ name: string; content: string }>) {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const { time, day } = dosDateTime();

  for (const file of files) {
    const name = encoder.encode(file.name);
    const content = encoder.encode(file.content);
    const crc = crc32(content);
    const local = new Uint8Array(30 + name.length + content.length);
    const localView = new DataView(local.buffer);
    writeUint32(localView, 0, 0x04034b50);
    writeUint16(localView, 4, 20);
    writeUint16(localView, 6, 0);
    writeUint16(localView, 8, 0);
    writeUint16(localView, 10, time);
    writeUint16(localView, 12, day);
    writeUint32(localView, 14, crc);
    writeUint32(localView, 18, content.length);
    writeUint32(localView, 22, content.length);
    writeUint16(localView, 26, name.length);
    writeUint16(localView, 28, 0);
    local.set(name, 30);
    local.set(content, 30 + name.length);
    chunks.push(local);

    const center = new Uint8Array(46 + name.length);
    const centerView = new DataView(center.buffer);
    writeUint32(centerView, 0, 0x02014b50);
    writeUint16(centerView, 4, 20);
    writeUint16(centerView, 6, 20);
    writeUint16(centerView, 8, 0);
    writeUint16(centerView, 10, 0);
    writeUint16(centerView, 12, time);
    writeUint16(centerView, 14, day);
    writeUint32(centerView, 16, crc);
    writeUint32(centerView, 20, content.length);
    writeUint32(centerView, 24, content.length);
    writeUint16(centerView, 28, name.length);
    writeUint16(centerView, 30, 0);
    writeUint16(centerView, 32, 0);
    writeUint16(centerView, 34, 0);
    writeUint16(centerView, 36, 0);
    writeUint32(centerView, 38, 0);
    writeUint32(centerView, 42, offset);
    center.set(name, 46);
    central.push(center);
    offset += local.length;
  }

  const centralOffset = offset;
  const centralSize = central.reduce((sum, item) => sum + item.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  writeUint32(endView, 0, 0x06054b50);
  writeUint16(endView, 4, 0);
  writeUint16(endView, 6, 0);
  writeUint16(endView, 8, files.length);
  writeUint16(endView, 10, files.length);
  writeUint32(endView, 12, centralSize);
  writeUint32(endView, 16, centralOffset);
  writeUint16(endView, 20, 0);

  const blobParts = [...chunks, ...central, end].map((part) => {
    const copy = new Uint8Array(part.byteLength);
    copy.set(part);
    return copy.buffer;
  });
  return new Blob(blobParts, {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

function paragraph(text: string, style = '') {
  return `<w:p>${style}<w:r><w:t>${escapeHTML(text)}</w:t></w:r></w:p>`;
}

function cell(text: string, width: number, fill = 'FFFFFF') {
  return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/><w:shd w:fill="${fill}"/><w:tcMar><w:top w:w="90" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:bottom w:w="90" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>${paragraph(text)}</w:tc>`;
}

function documentXML(data: ExportTimetableData) {
  const normalized = normalizeExportData(data);
  const rows = buildGridRows(normalized);
  const widths = [1500, ...Array.from({ length: normalized.periods }).map(() => Math.floor(12000 / normalized.periods))];
  const tableRows = rows.map((row, rowIndex) => `<w:tr>${row.map((value, index) => cell(value, widths[index] || 2200, rowIndex === 0 ? '173F35' : index === 0 ? 'EEF2F6' : 'FFFFFF')).join('')}</w:tr>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraph(normalized.meta.title, '<w:pPr><w:pStyle w:val="Title"/></w:pPr>')}
    ${paragraph(`${normalized.meta.organizationName} | ${normalized.meta.scheduleLabel}`)}
    <w:tbl>
      <w:tblPr><w:tblW w:w="13500" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="D8DFDB"/><w:left w:val="single" w:sz="4" w:color="D8DFDB"/><w:bottom w:val="single" w:sz="4" w:color="D8DFDB"/><w:right w:val="single" w:sz="4" w:color="D8DFDB"/><w:insideH w:val="single" w:sz="4" w:color="D8DFDB"/><w:insideV w:val="single" w:sz="4" w:color="D8DFDB"/></w:tblBorders></w:tblPr>
      ${tableRows}
    </w:tbl>
    ${paragraph(`Generated by SlotForge on ${new Date(normalized.meta.generatedAt || Date.now()).toLocaleString()}`)}
    <w:sectPr><w:pgSz w:w="15840" w:h="12240" w:orient="landscape"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr>
  </w:body>
</w:document>`;
}

export async function exportAsDOCX(data: ExportTimetableData) {
  const blob = createZip([
    {
      name: '[Content_Types].xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`,
    },
    {
      name: '_rels/.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    },
    {
      name: 'word/_rels/document.xml.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    {
      name: 'word/styles.xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:sz w:val="40"/><w:color w:val="173F35"/></w:rPr></w:style></w:styles>`,
    },
    { name: 'word/document.xml', content: documentXML(data) },
  ]);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${cleanFilename(data.meta.filename)}.docx`;
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(link.href);
  link.remove();
}
