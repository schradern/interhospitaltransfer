import { FONT_FAMILY, toPdfText } from './pdffont.js';

const PAGE_MARGIN_MM = 12;
const FOOTER_SPACE_MM = 14;
const LINE_HEIGHT_MM = 4.2;
const LABEL_WIDTH_MM = 43;
const BODY_FONT_SIZE = 9;
const SECTION_FONT_SIZE = 11;
const FOOTER_FONT_SIZE = 7;
const COLUMN_GAP_MM = 6;
const TITLE_FONT_SIZE = 13;
const SECTION_RULE_OFFSET_MM = 1;
const SECTION_TITLE_OFFSET_MM = 4.5;
const SECTION_TITLE_GAP_MM = 0.5;
const BLOCK_GAP_MM = 0.5;
const TITLE_GAP_MM = 1;
const GRID_VALUE_PADDING_MM = 2;
const RULE_GRAY = 200;
const SUBTITLE_GRAY = 110;
const FOOTER_GRAY = 130;
// Überschrift bzw. Label nicht allein am Seitenende stehen lassen.
const LINES_KEPT_TOGETHER = 3;
const LABEL_GAP_MM = 2;

export function createLayout(doc) {
  return new PdfLayout(doc);
}

class PdfLayout {
  constructor(doc) {
    this.doc = doc;
    this.pageWidth = doc.internal.pageSize.getWidth();
    this.pageHeight = doc.internal.pageSize.getHeight();
    this.contentWidth = this.pageWidth - 2 * PAGE_MARGIN_MM;
    this.y = PAGE_MARGIN_MM;
  }

  setFont(style, size) {
    this.doc.setFont(FONT_FAMILY, style);
    this.doc.setFontSize(size);
  }

  ensureSpace(height) {
    if (this.y + height > this.pageHeight - FOOTER_SPACE_MM) {
      this.doc.addPage();
      this.y = PAGE_MARGIN_MM;
    }
  }

  // Umbruch hängt von der Schrift ab, daher wird sie vor dem Messen gesetzt.
  wrap(text, width, style = 'normal') {
    this.setFont(style, BODY_FONT_SIZE);
    return this.doc.splitTextToSize(toPdfText(text), width);
  }

  // Spalten zeilenweise schreiben; lange Labels und Werte laufen vollständig auf die nächste Seite weiter.
  writeColumns(columns) {
    const lineCount = Math.max(...columns.map(column => Math.max(column.lines.length, column.labelLines.length)));
    this.ensureSpace(Math.min(lineCount, LINES_KEPT_TOGETHER) * LINE_HEIGHT_MM);
    for (let line = 0; line < lineCount; line += 1) {
      if (line > 0) this.ensureSpace(LINE_HEIGHT_MM);
      columns.forEach(({ x, labelLines, valueOffset, lines }) => {
        if (labelLines[line]) {
          this.setFont('bold', BODY_FONT_SIZE);
          this.doc.text(labelLines[line], x, this.y);
        }
        if (lines[line]) {
          this.setFont('normal', BODY_FONT_SIZE);
          this.doc.text(lines[line], x + valueOffset, this.y);
        }
      });
      this.y += LINE_HEIGHT_MM;
    }
  }

  title(text, subtitle) {
    this.setFont('bold', TITLE_FONT_SIZE);
    this.doc.text(toPdfText(text), this.pageWidth / 2, this.y, { align: 'center' });
    this.y += LINE_HEIGHT_MM + TITLE_GAP_MM;
    this.setFont('normal', BODY_FONT_SIZE);
    this.doc.setTextColor(SUBTITLE_GRAY);
    this.doc.text(toPdfText(subtitle), this.pageWidth / 2, this.y, { align: 'center' });
    this.doc.setTextColor(0);
    this.y += LINE_HEIGHT_MM;
  }

  section(title) {
    this.ensureSpace(LINES_KEPT_TOGETHER * LINE_HEIGHT_MM);
    this.y += SECTION_RULE_OFFSET_MM;
    this.doc.setDrawColor(RULE_GRAY);
    this.doc.line(PAGE_MARGIN_MM, this.y, this.pageWidth - PAGE_MARGIN_MM, this.y);
    this.y += SECTION_TITLE_OFFSET_MM;
    this.setFont('bold', SECTION_FONT_SIZE);
    this.doc.text(toPdfText(title), PAGE_MARGIN_MM, this.y);
    this.y += LINE_HEIGHT_MM + SECTION_TITLE_GAP_MM;
  }

  // Bis zu zwei Label/Wert-Paare nebeneinander; Spalten bleiben fest, leere Werte als "-".
  row(pairs) {
    if (!pairs.some(([, value]) => value)) return;
    const columnWidth = pairs.length > 1 ? (this.contentWidth - COLUMN_GAP_MM) / 2 : this.contentWidth;
    this.writeColumns(pairs.map(([label, value], index) => ({
      x: PAGE_MARGIN_MM + index * (columnWidth + COLUMN_GAP_MM),
      labelLines: this.wrap(`${label}:`, LABEL_WIDTH_MM - LABEL_GAP_MM, 'bold'),
      valueOffset: LABEL_WIDTH_MM,
      lines: this.wrap(value || '-', columnWidth - LABEL_WIDTH_MM),
    })));
  }

  // Mehrere Zeilen unter einem Label; jede Zeile ist bereits fertiger Text. Liefert, ob etwas geschrieben wurde.
  block(label, lines) {
    const visibleLines = lines.filter(Boolean);
    if (visibleLines.length === 0) return false;
    this.writeColumns([{
      x: PAGE_MARGIN_MM,
      labelLines: this.wrap(`${label}:`, LABEL_WIDTH_MM - LABEL_GAP_MM, 'bold'),
      valueOffset: LABEL_WIDTH_MM,
      lines: visibleLines.flatMap(line => this.wrap(line, this.contentWidth - LABEL_WIDTH_MM)),
    }]);
    this.y += BLOCK_GAP_MM;
    return true;
  }

  // Kompakte Werte-Tabelle (z. B. Labor); Werte werden vollständig umbrochen.
  grid(pairs, columnCount = 4) {
    const visiblePairs = pairs.filter(([, value]) => value);
    const cellWidth = this.contentWidth / columnCount;
    for (let index = 0; index < visiblePairs.length; index += columnCount) {
      this.writeColumns(visiblePairs.slice(index, index + columnCount).map(([label, value], column) => {
        this.setFont('bold', BODY_FONT_SIZE);
        const labelWidth = this.doc.getTextWidth(toPdfText(`${label}: `));
        return {
          x: PAGE_MARGIN_MM + column * cellWidth,
          labelLines: [toPdfText(`${label}:`)],
          valueOffset: labelWidth,
          lines: this.wrap(value, cellWidth - labelWidth - GRID_VALUE_PADDING_MM),
        };
      }));
    }
  }

  footer(text) {
    const pageCount = this.doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      this.doc.setPage(page);
      this.setFont('normal', FOOTER_FONT_SIZE);
      this.doc.setTextColor(FOOTER_GRAY);
      this.doc.text(toPdfText(`${text} · Seite ${page} von ${pageCount}`), this.pageWidth / 2, this.pageHeight - PAGE_MARGIN_MM / 2, { align: 'center' });
    }
    this.doc.setTextColor(0);
  }
}
