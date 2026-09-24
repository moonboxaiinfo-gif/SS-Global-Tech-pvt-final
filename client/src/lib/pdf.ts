import { jsPDF } from "jspdf";
import { officialLogoData } from "@/lib/pdfLogo";

export type PdfColumn = { label: string; width?: number; align?: "left" | "center" | "right" };
export type PdfRow = Array<string | number>;
export type PdfSummary = { label: string; value: string; tone?: "blue" | "green" | "amber" | "rose" };
export type PdfRecipient = { name?: string; address?: string; phone?: string };
export type PdfDocument = {
 title: string;
 documentNo?: string;
 date?: string;
 dueDate?: string;
 termsLabel?: string;
 preparedBy?: string;
 subtitle?: string;
 recipient?: PdfRecipient;
 summaries?: PdfSummary[];
 columns?: PdfColumn[];
 rows?: PdfRow[];
 terms?: string[];
 notes?: string;
 footerNote?: string;
};

const ink = [52, 73, 104] as const;
const text = [58, 70, 92] as const;
const muted = [112, 122, 139] as const;
const rule = [67, 81, 108] as const;
const page = { width: 210, height: 297, margin: 16 };

function color(doc: jsPDF, rgb: readonly number[]) { doc.setTextColor(rgb[0], rgb[1], rgb[2]); }
function fill(doc: jsPDF, rgb: readonly number[]) { doc.setFillColor(rgb[0], rgb[1], rgb[2]); }
function safe(value: string | number | undefined) { return String(value ?? "").replace(/\r/g, ""); }
function split(doc: jsPDF, value: string, width: number) { return doc.splitTextToSize(value, width) as string[]; }
function line(doc: jsPDF, y: number) { doc.setDrawColor(rule[0], rule[1], rule[2]); doc.setLineWidth(0.25); doc.line(page.margin, y, page.width - page.margin, y); }

function logoMark(doc: jsPDF) {
 // The lockup is cropped directly from the supplied 0012.pdf reference.
 doc.addImage(officialLogoData, "PNG", page.margin, 8, 78, 15);
}

function header(doc: jsPDF, data: PdfDocument) {
 logoMark(doc);
 color(doc, ink);
 doc.setFont("helvetica", "normal");
 doc.setFontSize(7.2);
 doc.text("SS Global Tech Enterprises Pvt Ltd", page.margin, 34);
 doc.text("Opposite Economic Center", page.margin, 39);
 doc.text("Thambuttegama", page.margin, 44);
 doc.text("0770767578 0782508766", page.margin, 49);

 color(doc, ink);
 doc.setFont("helvetica", "bold");
 doc.setFontSize(19);
 doc.text(data.title || "Invoice", 194, 14, { align: "right" });
 doc.setFontSize(10);
 if (data.documentNo) doc.text(data.documentNo, 194, 21, { align: "right" });
 doc.setFont("helvetica", "normal");
 doc.setFontSize(8.3);
 const meta = [
 data.date ? `Invoice date : ${data.date}` : "",
 data.termsLabel ? `Terms : ${data.termsLabel}` : "",
 data.dueDate ? `Due Date : ${data.dueDate}` : "",
 `Sales person : ${data.preparedBy || "SS.Global Tech"}`,
 ].filter(Boolean);
 meta.forEach((value, index) => doc.text(value, 194, 58 + index * 6, { align: "right" }));
}

function billTo(doc: jsPDF, data: PdfDocument) {
 const recipient = data.recipient || { name: data.subtitle || "Customer / recipient" };
 color(doc, text);
 doc.setFont("helvetica", "normal");
 doc.setFontSize(8.5);
 doc.text("Bill to :", 23, 61);
 doc.setFont("helvetica", "normal");
 doc.setFontSize(8.5);
 const details = [recipient.name, recipient.address, recipient.phone].filter(Boolean) as string[];
 details.forEach((value, index) => doc.text(split(doc, safe(value), 70).slice(0, 2), 23, 73 + index * 6));
}

function drawTable(doc: jsPDF, columns: PdfColumn[], rows: PdfRow[], startY: number) {
 const usable = page.width - page.margin * 2;
 const widths = columns.map((column) => column.width || usable / columns.length);
 let y = startY;
 const drawRow = (row: PdfRow, isHeader = false) => {
 const heights = row.map((cell, index) => split(doc, safe(cell), widths[index] - 7).length * 5.2 + (isHeader ? 5 : 7));
 const height = isHeader ? 13 : Math.max(18, ...heights);
 let x = page.margin;
 row.forEach((cell, index) => {
 if (isHeader) { fill(doc, ink); doc.rect(x, y, widths[index], height, "F"); color(doc, [255, 255, 255]); }
 else { doc.setDrawColor(255, 255, 255); color(doc, text); }
 doc.setFont("helvetica", isHeader ? "bold" : "normal");
 doc.setFontSize(isHeader ? 7.8 : 8.4);
 const lines = split(doc, safe(cell), widths[index] - 7);
 const align = columns[index].align || "left";
 const textX = align === "right" ? x + widths[index] - 3.5 : align === "center" ? x + widths[index] / 2 : x + 4.5;
 lines.forEach((value, lineIndex) => doc.text(value, textX, y + (isHeader ? 8 : 8) + lineIndex * 5.2, { align }));
 x += widths[index];
 });
 y += height;
 };
 drawRow(columns.map((column) => column.label), true);
 rows.forEach((row) => {
 if (y > page.height - 75) {
 doc.addPage();
 header(doc, { title: "Continuation", preparedBy: "SS.Global Tech" });
 y = 82;
 drawRow(columns.map((column) => column.label), true);
 }
 drawRow(row);
 });
 return y;
}

function totals(doc: jsPDF, summaries: PdfSummary[], y: number) {
 const start = Math.max(y + 8, 194);
 line(doc, start);
 const right = 194;
 const items = summaries.slice(-3);
 items.forEach((summary, index) => {
 const rowY = start + 12 + index * 7;
 color(doc, ink);
 doc.setFont("helvetica", "bold");
 doc.setFontSize(8.2);
 doc.text(summary.label.toUpperCase(), right - 42, rowY, { align: "right" });
 doc.text(summary.value, right, rowY, { align: "right" });
 });
 return start + 39;
}

function notes(doc: jsPDF, data: PdfDocument, y: number) {
 const noteY = Math.min(Math.max(y, 238), 246);
 color(doc, text);
 doc.setFont("helvetica", "bold");
 doc.setFontSize(8);
 doc.text("Notes", 23, noteY);
 doc.setFont("helvetica", "normal");
 doc.setFontSize(8);
 const value = data.notes || data.terms?.join(" · ") || "Thanks for your business";
 split(doc, value, 70).slice(0, 2).forEach((item, index) => doc.text(item, 23, noteY + 8 + index * 5));
}

function footer(doc: jsPDF, note?: string) {
 line(doc, 260);
 color(doc, ink);
 doc.setFont("helvetica", "bold");
 doc.setFontSize(8.5);
 doc.text("SS GLOBAL TECH", 23, 274);
 doc.text("ENTERPRISES PVT LTD", 23, 280);
 color(doc, muted);
 doc.setFont("helvetica", "normal");
 doc.setFontSize(8);
 doc.text("0770767578", 194, 273, { align: "right" });
 doc.text("0782508766", 194, 279, { align: "right" });
 doc.text("ssglobaltech@gmail.com", 194, 285, { align: "right" });
 if (note) doc.text(note, page.margin, 290);
}

export function buildBrandedPdf(data: PdfDocument) {
 const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
 header(doc, data);
 billTo(doc, data);
 let y = 91;
 if (data.columns?.length && data.rows?.length) y = drawTable(doc, data.columns, data.rows, y);
 if (data.summaries?.length) y = totals(doc, data.summaries, y);
 notes(doc, data, y);
 footer(doc, data.footerNote);
 return doc;
}

export function downloadBrandedPdf(data: PdfDocument, fileName?: string) {
 buildBrandedPdf(data).save(fileName || `${data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function printBrandedDocument(data: PdfDocument) {
 const blob = buildBrandedPdf(data).output("blob");
 const url = URL.createObjectURL(blob);
 const printWindow = window.open(url, "_blank", "noopener,noreferrer");
 if (printWindow) printWindow.addEventListener("load", () => printWindow.print(), { once: true });
 window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
