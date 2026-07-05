# Phase 6 — Full Export System

**Agent:** Codex  
**Depends on:** Phase 2 (frontend structure), Phase 1 (timetable data working)  
**Blocks:** Nothing (Phase 5 share page uses PDF export from here)  
**Estimated effort:** Medium (2–3 days)

---

## Goal

Implement a complete, working export system for all timetable formats.
Currently **all exports are broken or missing**. This phase fixes all of them.

---

## Supported Export Formats

| Format | Library / Method | Output |
|---|---|---|
| **HTML** | Browser `innerHTML` to file | Styled printable HTML page |
| **PDF** | jsPDF + html2canvas | PDF from the HTML timetable view |
| **Excel / CSV** | xlsx (SheetJS) | Spreadsheet with timetable grid |
| **Google Docs** | Google Drive API | Pushes timetable as a Google Doc |
| **Word / DOCX** | docx.js | Downloadable .docx file |
| **iCal** | ical.js / custom | .ics file for calendar import |

---

## Export Trigger UI

The export button is available in:
1. **Timetable Page** — export the full timetable
2. **Faculty Timetable View** — export a single faculty's timetable
3. **Public Share Page** — export (PDF only) from the share page

UI: A dropdown button "Export ▼" with all format options listed.

```
[ Export ▼ ]
  ├─ Download as HTML
  ├─ Download as PDF
  ├─ Download as Excel
  ├─ Download as CSV
  ├─ Export to Google Docs
  ├─ Export to Word (.docx)
  └─ Export as iCal (.ics)
```

---

## Format 1: HTML Export

Generate a clean, self-contained HTML file with embedded CSS:

```typescript
// features/exports/exportHTML.ts
export const exportAsHTML = (timetableData: TimetableGrid, metadata: ExportMeta) => {
  const html = renderToStaticMarkup(<TimetableHTMLTemplate data={timetableData} />);
  const fullDoc = `<!DOCTYPE html><html>...<style>${embeddedCSS}</style>..${html}..</html>`;
  downloadFile(fullDoc, `${metadata.name}-timetable.html`, 'text/html');
};
```

The HTML output should be:
- Fully styled (no external CSS dependencies)
- Printable (includes `@media print` CSS)
- Shows org name, schedule version, generated date in header/footer

---

## Format 2: PDF Export

Use `html2canvas` to capture the timetable DOM node, then `jsPDF` to create the PDF:

```typescript
// features/exports/exportPDF.ts
export const exportAsPDF = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  const canvas = await html2canvas(element!, {
    scale: 2,           // high resolution
    backgroundColor: '#fff',
    useCORS: true,
  });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  pdf.addImage(imgData, 'PNG', 0, 0, 297, 210);
  pdf.save(filename);
};
```

---

## Format 3: Excel / CSV Export

Use SheetJS (xlsx) to generate a spreadsheet:

```typescript
// features/exports/exportExcel.ts
export const exportAsExcel = (timetableData: TimetableGrid, filename: string) => {
  const ws = XLSX.utils.aoa_to_sheet(buildGridArray(timetableData));
  // buildGridArray: converts TimetableGrid → 2D array of strings
  // Row 0: ["", "Mon", "Tue", "Wed", "Thu", "Fri"]
  // Row 1: ["Period 1", "Maths/BSc CS-A/Rm101", ...], etc.
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Timetable');
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

// For CSV: same logic but XLSX.writeFile with .csv extension
```

---

## Format 4: Google Docs Export

This requires a Google OAuth flow. The user must grant "Google Drive" permission.

```typescript
// features/exports/exportGoogleDocs.ts
export const exportToGoogleDocs = async (timetableData: TimetableGrid, filename: string) => {
  // 1. Trigger Google OAuth (use Google Identity Services)
  const token = await getGoogleAccessToken(['https://www.googleapis.com/auth/drive.file']);
  
  // 2. Create a Google Doc via Drive API
  const docContent = buildGoogleDocContent(timetableData); // plain text table format
  
  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: buildMultipartBody(filename, docContent),
  });
  
  const { id } = await response.json();
  window.open(`https://docs.google.com/document/d/${id}/edit`, '_blank');
};
```

**Note:** Google OAuth client ID must be added to env vars. Add to `.env.example`.

---

## Format 5: Word / DOCX Export

Use the `docx` npm package to create a proper .docx file with a table:

```typescript
// features/exports/exportDOCX.ts
import { Document, Table, TableRow, TableCell, Paragraph, Packer } from 'docx';

export const exportAsDOCX = async (timetableData: TimetableGrid, filename: string) => {
  const table = new Table({
    rows: buildDocxRows(timetableData),
  });
  const doc = new Document({
    sections: [{ children: [new Paragraph(filename), table] }],
  });
  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${filename}.docx`);
};
```

---

## Format 6: iCal Export

Export the timetable as an `.ics` file so faculty can import into Google Calendar,
Apple Calendar, Outlook, etc.

Each assignment becomes a **recurring weekly event** (RRULE):

```typescript
// features/exports/exportICal.ts
export const exportAsICal = (assignments: Assignment[], facultyName: string) => {
  const events = assignments.map(a => ({
    title: `${a.task.name} — ${a.group.name}`,
    location: a.locations.map(l => l.name).join(', '),
    startTime: parseTimeslotToDate(a.timeslot),
    endTime: parseTimeslotToDate(a.timeslot, +1),
    rrule: 'FREQ=WEEKLY',  // repeats every week
    description: `Room: ${a.locations[0].name} | Group: ${a.group.name}`,
  }));
  
  const icalContent = buildICal(events);
  downloadFile(icalContent, `${facultyName}-timetable.ics`, 'text/calendar');
};
```

---

## Backend Support (tell Antigravity)

Most exports are pure frontend (no backend needed). But for Google Docs,
store the OAuth token securely. No backend changes required in this phase —
everything is client-side.

Optional: Add a backend endpoint for server-side PDF generation (puppeteer/playwright)
if client-side PDF quality is insufficient:
```
POST /api/v1/workspaces/{id}/schedule-runs/{run_id}/export/pdf
     → server generates PDF, returns file download
```

---

## Files to Create

```
features/exports/
├── ExportButton.tsx         # dropdown button with all formats
├── exportHTML.ts
├── exportPDF.ts
├── exportExcel.ts
├── exportGoogleDocs.ts
├── exportDOCX.ts
├── exportICal.ts
├── TimetableHTMLTemplate.tsx  # static HTML template for HTML/PDF
└── utils.ts                # downloadFile, downloadBlob helpers
```

---

## Done Criteria

- [ ] HTML export generates a self-contained, styled, printable HTML file
- [ ] PDF export captures the timetable and downloads as A4 landscape PDF
- [ ] Excel export produces a correctly formatted .xlsx spreadsheet
- [ ] CSV export produces a valid .csv file
- [ ] Google Docs export opens OAuth prompt, creates Doc, opens in new tab
- [ ] DOCX export downloads a valid Word document with a formatted table
- [ ] iCal export generates a valid .ics with weekly recurring events
- [ ] Export button is available on: Timetable page, Faculty view, Share page
- [ ] Google OAuth client ID is documented in `.env.example`
