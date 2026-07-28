import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Incident, TimelineEntry } from '../types';

function formatTime(ms: number): string {
  return new Date(ms).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function formatDuration(ms: number): string {
  if (ms < 0) return '—';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

const ACTION_LABELS: Record<TimelineEntry['action'], string> = {
  created: 'Incident Created',
  acknowledged: 'Acknowledged',
  escalated: 'Escalated to Admin',
  resource_assigned: 'Resource Assigned',
  resolved: 'Resolved',
  merged: 'Merged',
  updated: 'Updated',
};

export function generateIncidentPDF(incident: Incident, timeline: TimelineEntry[]) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;

  // ── Header banner ────────────────────────────────────────
  doc.setFillColor(15, 23, 42); // dark navy
  doc.rect(0, 0, pageW, 70, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(248, 250, 252);
  doc.text('🏫 Campus Command Center', margin, 32);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('VIT Chennai — Incident Audit Report', margin, 50);

  doc.setFontSize(9);
  doc.text(`Generated: ${formatTime(Date.now())}`, pageW - margin, 50, { align: 'right' });

  // ── Incident title ────────────────────────────────────────
  let y = 95;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(30, 41, 59);
  const typeLabel = incident.type.toUpperCase();
  doc.text(`${typeLabel} Incident — ${incident.zone?.toUpperCase() ?? 'UNKNOWN'} Zone`, margin, y);

  y += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Incident ID: ${incident.id}`, margin, y);

  // ── Summary Metrics ───────────────────────────────────────
  y += 24;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('Summary Metrics', margin, y);

  y += 8;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageW - margin, y);
  y += 14;

  const createdEntry = timeline.find(t => t.action === 'created');
  const ackEntry = timeline.find(t => t.action === 'acknowledged');
  const resolvedEntry = timeline.find(t => t.action === 'resolved');

  const timeToAck = ackEntry && createdEntry
    ? ackEntry.timestamp - createdEntry.timestamp
    : -1;
  const timeToResolve = resolvedEntry && createdEntry
    ? resolvedEntry.timestamp - createdEntry.timestamp
    : -1;
  const slaBreach = timeToAck > 5 * 60 * 1000; // > 5 minutes

  const metrics = [
    ['Severity', incident.severity.toUpperCase()],
    ['Status', incident.status.toUpperCase()],
    ['Reported At', formatTime(incident.reportedAt)],
    ['Reported By', incident.reportedBy],
    ['Time to Acknowledge', formatDuration(timeToAck)],
    ['Time to Resolve', formatDuration(timeToResolve)],
    ['SLA Breach (>5 min)', slaBreach ? '⚠ YES' : 'No'],
    ['Escalated', incident.isEscalated ? 'Yes' : 'No'],
  ];

  autoTable(doc, {
    startY: y,
    head: [],
    body: metrics,
    theme: 'plain',
    margin: { left: margin, right: margin },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 180, textColor: [51, 65, 85] },
      1: { textColor: [15, 23, 42] },
    },
    styles: { fontSize: 9, cellPadding: 4 },
    didParseCell: (data) => {
      if (data.column.index === 1 && data.row.index === 6 && slaBreach) {
        data.cell.styles.textColor = [220, 38, 38]; // red for SLA breach
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  // ── Description ───────────────────────────────────────────
  y = (doc as any).lastAutoTable.finalY + 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('Incident Description', margin, y);

  y += 8;
  doc.line(margin, y, pageW - margin, y);
  y += 12;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const descLines = doc.splitTextToSize(incident.description || 'No description provided.', pageW - margin * 2);
  doc.text(descLines, margin, y);
  y += descLines.length * 12 + 16;

  // ── Media URLs ────────────────────────────────────────────
  if (incident.mediaUrl || incident.audioUrl) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text('Attached Media (URLs)', margin, y);
    y += 8;
    doc.line(margin, y, pageW - margin, y);
    y += 12;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(79, 70, 229);
    if (incident.mediaUrl) { doc.text(`📷 ${incident.mediaUrl}`, margin, y); y += 12; }
    if (incident.audioUrl) { doc.text(`🎙 ${incident.audioUrl}`, margin, y); y += 12; }
    y += 8;
  }

  // ── Full Audit Timeline ───────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('Full Audit Timeline', margin, y);

  y += 8;
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  const timelineRows = [...timeline]
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((entry, idx) => [
      String(idx + 1),
      formatTime(entry.timestamp),
      ACTION_LABELS[entry.action] || entry.action,
      entry.actorName,
      entry.previousStatus ? `${entry.previousStatus} → ${entry.newStatus}` : entry.newStatus || '—',
      entry.notes || '—',
    ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Timestamp', 'Action', 'Actor', 'Status Change', 'Notes']],
    body: timelineRows,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [248, 250, 252],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margin, right: margin },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 110 },
      2: { cellWidth: 90 },
      3: { cellWidth: 80 },
      4: { cellWidth: 90 },
    },
  });

  // ── Footer ────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Page ${i} of ${pageCount} — VIT Chennai Campus Command Center — CONFIDENTIAL`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: 'center' }
    );
  }

  // ── Save ──────────────────────────────────────────────────
  const filename = `incident-${incident.id}-audit-${Date.now()}.pdf`;
  doc.save(filename);
}
