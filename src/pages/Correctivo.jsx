import React, { useState, useEffect } from 'react';
import { proveedoresAPI, equiposAPI, inventarioAPI } from '../services/api';

const API_URL = import.meta.env.VITE_API_URL;

// ── PDF generation ─────────────────────────────────────────────────────────────
// Dynamically imported at call time — no build config needed.
async function generarReportePDF(clave, tickets, equipoInfo, laboratorioInfo) {
  // Dynamic import — works with Vite out of the box
  const jsPDFModule = await import('jspdf');
  const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF;
  await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PW = doc.internal.pageSize.getWidth();   // 210
  const PH = doc.internal.pageSize.getHeight();  // 297

  // ── Palette ────────────────────────────────────────────────────────────────
  const DARK   = [26,  37,  47];   // #1a252f sidebar dark
  const BLUE   = [52, 152, 219];   // #3498db accent
  const TEAL   = [39, 174, 128];   // softer teal for section accents
  const LIGHT  = [244, 247, 246];  // #f4f7f6 bg
  const MUTED  = [127, 140, 141];  // #7f8c8d
  const TEXT   = [44,  62,  80];   // #2c3e50
  const WHITE  = [255, 255, 255];
  const BORDER = [236, 240, 241];  // #ecf0f1

  const colorOk      = [39, 174, 96];
  const colorWarn    = [243, 156, 18];
  const colorDanger  = [231, 76, 60];
  const colorInfo    = [52, 152, 219];

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const fmtDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const fmtDateTime = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
  };
  const fmtMXN = (val) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val || 0);
  const prioLabel = ['Sin definir', 'Muy baja', 'Baja', 'Media', 'Alta', 'Crítica'];
  const prioColor = (v) => {
    if (v === 5) return colorDanger;
    if (v === 4) return [230, 126, 34];
    if (v === 3) return colorWarn;
    if (v >= 1)  return colorOk;
    return MUTED;
  };

  let curY = 0;

  // ── PAGE HEADER helper ────────────────────────────────────────────────────
  function drawPageHeader(pageNum, totalPages) {
    // Dark top bar
    doc.setFillColor(...DARK);
    doc.rect(0, 0, PW, 16, 'F');
    // Logo text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...BLUE);
    doc.text('tecdoit', 10, 10.5);
    // Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...WHITE);
    doc.text('Sistema Integral de Gestión de Laboratorios', 35, 10.5);
    // Page number right
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(`Página ${pageNum} de ${totalPages}`, PW - 10, 10.5, { align: 'right' });
    // Thin accent line under header
    doc.setDrawColor(...BLUE);
    doc.setLineWidth(0.4);
    doc.line(0, 16, PW, 16);
  }

  // ── PAGE FOOTER helper ────────────────────────────────────────────────────
  function drawPageFooter() {
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.line(10, PH - 12, PW - 10, PH - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    const genDate = new Date().toLocaleString('es-MX', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
    doc.text(`Generado el ${genDate}`, 10, PH - 7.5);
    doc.text('Documento confidencial — tecdoit', PW - 10, PH - 7.5, { align: 'right' });
  }

  // ── SECTION HEADING helper ────────────────────────────────────────────────
  function sectionHeading(label, y) {
    doc.setFillColor(...DARK);
    doc.roundedRect(10, y, PW - 20, 8, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...BLUE);
    doc.text('●', 15, y + 5.2);
    doc.setTextColor(...WHITE);
    doc.text(label.toUpperCase(), 21, y + 5.2);
    return y + 12;
  }

  // ── KEY-VALUE ROW helper ──────────────────────────────────────────────────
  function kvRow(label, value, x, y, colWidth) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), x, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...TEXT);
    doc.text(String(value || '—'), x, y + 4.5);
    return y + 10;
  }

  // ── Collect data ───────────────────────────────────────────────────────────
  const activos   = tickets.filter(t => t.estatus !== 'Completado');
  const cerrados  = tickets.filter(t => t.estatus === 'Completado');
  const totalCost = tickets.reduce((s, t) => s + (Number(t.costo) || 0), 0);
  const marca     = equipoInfo?.marca  || '—';
  const modelo    = equipoInfo?.modelo || '—';
  const labNombre = laboratorioInfo?.nombre || equipoInfo?.laboratorios?.nombre || '—';

  // ── We need to know total pages upfront — we'll do 2 passes ──────────────
  // Pass 1: count pages by simulating layout
  // Simpler: use jsPDF's addPage and then count doc.internal.pages
  // We'll do single-pass and patch afterwards using doc.internal trick:

  // ─────────────────────────────────────────────────────────────────────────
  // PAGE 1 — COVER + MACHINE INFO
  // ─────────────────────────────────────────────────────────────────────────

  // Hero banner
  doc.setFillColor(...DARK);
  doc.rect(0, 0, PW, 55, 'F');

  // Diagonal accent stripe
  doc.setFillColor(...BLUE);
  doc.triangle(0, 55, 60, 55, 0, 30, 'F');

  // Report label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...BLUE);
  doc.text('REPORTE TÉCNICO DE EQUIPO', 10, 22);

  // Machine name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...WHITE);
  doc.text(clave, 10, 34);

  // Sub info
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(180, 195, 199);
  doc.text(`${marca}  •  ${modelo}  •  ${labNombre}`, 10, 42);

  // Generation date on cover
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(
    `Emitido: ${new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}`,
    PW - 10, 48, { align: 'right' }
  );

  // ── KPI badges row ────────────────────────────────────────────────────────
  const kpiY = 62;
  const badges = [
    { label: 'Tickets Totales',  value: tickets.length,       color: BLUE },
    { label: 'Activos',          value: activos.length,       color: colorWarn },
    { label: 'Completados',      value: cerrados.length,      color: colorOk },
    { label: 'Costo Acumulado',  value: fmtMXN(totalCost),   color: TEAL },
  ];
  const badgeW = (PW - 20 - 9) / 4;
  badges.forEach((b, i) => {
    const bx = 10 + i * (badgeW + 3);
    doc.setFillColor(...WHITE);
    doc.roundedRect(bx, kpiY, badgeW, 18, 2, 2, 'F');
    doc.setDrawColor(...b.color);
    doc.setLineWidth(0.5);
    doc.roundedRect(bx, kpiY, badgeW, 18, 2, 2, 'S');
    // Top accent
    doc.setFillColor(...b.color);
    doc.roundedRect(bx, kpiY, badgeW, 2.5, 1, 1, 'F');
    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...b.color);
    doc.text(String(b.value), bx + badgeW / 2, kpiY + 10.5, { align: 'center' });
    // Label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...MUTED);
    doc.text(b.label.toUpperCase(), bx + badgeW / 2, kpiY + 15.5, { align: 'center' });
  });

  curY = kpiY + 26;

  // ── SECTION 1: Machine details ────────────────────────────────────────────
  curY = sectionHeading('Información del Equipo', curY);

  // 2-column card
  doc.setFillColor(...LIGHT);
  doc.roundedRect(10, curY, PW - 20, 38, 2, 2, 'F');

  const col1x = 16, col2x = PW / 2 + 5;
  let ry = curY + 6;
  kvRow('Clave de Activo',   clave,                      col1x,  ry, 80);
  kvRow('Laboratorio',       labNombre,                  col2x,  ry, 80);
  ry += 10;
  kvRow('Marca Fabricante',  marca,                      col1x,  ry, 80);
  kvRow('Modelo',            modelo,                     col2x,  ry, 80);
  ry += 10;
  kvRow('Estatus Operativo', equipoInfo?.estatus || '—', col1x,  ry, 80);
  kvRow('Valor de Reposición', fmtMXN(equipoInfo?.costo), col2x, ry, 80);

  curY += 44;

  // ── SECTION 2: Operational params ────────────────────────────────────────
  curY = sectionHeading('Parámetros Operativos', curY);
  doc.setFillColor(...LIGHT);
  doc.roundedRect(10, curY, PW - 20, 22, 2, 2, 'F');

  kvRow('Horas Acumuladas',   `${equipoInfo?.horas_acumuladas ?? '0'} hrs`, col1x, curY + 6, 80);
  kvRow('Umbral de Servicio', equipoInfo?.limite_horas ? `${equipoInfo.limite_horas} hrs` : 'No definido', col2x, curY + 6, 80);
  kvRow('Mantenimiento Urgente', equipoInfo?.mantenimiento_urgente ? 'Sí — requiere atención' : 'No', col1x, curY + 16, 80);

  curY += 28;

  // ── SECTION 3: Summary table of ALL tickets ───────────────────────────────
  curY = sectionHeading('Resumen de Tickets', curY);

  if (tickets.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text('No existen tickets registrados para este equipo.', PW / 2, curY + 6, { align: 'center' });
    curY += 14;
  } else {
    doc.autoTable({
      startY: curY,
      margin: { left: 10, right: 10 },
      tableWidth: PW - 20,
      head: [[
        { content: '#',            styles: { halign: 'center', cellWidth: 12 } },
        { content: 'Descripción',  styles: { cellWidth: 52 } },
        { content: 'Proveedor',    styles: { cellWidth: 32 } },
        { content: 'Programado',   styles: { halign: 'center', cellWidth: 25 } },
        { content: 'Costo',        styles: { halign: 'right',  cellWidth: 24 } },
        { content: 'Prioridad',    styles: { halign: 'center', cellWidth: 20 } },
        { content: 'Estatus',      styles: { halign: 'center', cellWidth: 20 } },
      ]],
      body: tickets.map(t => {
        const prioVal = t.prioridad || 0;
        const prioStr = `${prioVal} — ${prioLabel[prioVal] || '—'}`;
        return [
          { content: `#${t.id_mantenimiento}`, styles: { halign: 'center', fontSize: 7, textColor: MUTED } },
          { content: t.descripcion || '—',     styles: { fontSize: 7.5, cellWidth: 52 } },
          { content: t.proveedores?.nombre || 'Interna', styles: { fontSize: 7 } },
          { content: fmtDate(t.fecha_programada), styles: { halign: 'center', fontSize: 7 } },
          { content: fmtMXN(t.costo),  styles: { halign: 'right', fontSize: 7 } },
          { content: prioStr,          styles: { halign: 'center', fontSize: 6.5, textColor: prioColor(prioVal) } },
          { content: t.estatus,        styles: { halign: 'center', fontSize: 7,
            textColor: t.estatus === 'Completado' ? colorOk : t.estatus === 'En progreso' ? colorInfo : colorWarn } },
        ];
      }),
      headStyles: {
        fillColor: DARK,
        textColor: WHITE,
        fontSize: 7,
        fontStyle: 'bold',
        cellPadding: 3,
      },
      bodyStyles: {
        cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
        lineColor: BORDER,
        lineWidth: 0.2,
      },
      alternateRowStyles: { fillColor: LIGHT },
      didDrawPage: (data) => {
        drawPageFooter();
      },
    });
    curY = doc.lastAutoTable.finalY + 8;
  }

  drawPageFooter();

  // ─────────────────────────────────────────────────────────────────────────
  // PAGE 2+ — DETAILED TICKET RECORDS
  // ─────────────────────────────────────────────────────────────────────────
  if (tickets.length > 0) {
    doc.addPage();
    drawPageFooter();
    curY = 22;

    // Page section title
    doc.setFillColor(...DARK);
    doc.rect(0, 0, PW, 18, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...BLUE);
    doc.text('tecdoit', 10, 11);
    doc.setTextColor(...WHITE);
    doc.text(`Detalle de Tickets — ${clave}`, 35, 11);

    curY = sectionHeading('Registros Detallados por Ticket', curY);

    // Each ticket as its own card block
    const allSorted = [...activos, ...cerrados]; // active first, then history

    for (const t of allSorted) {
      const prioVal  = t.prioridad || 0;
      const isComplete = t.estatus === 'Completado';
      const cardH = isComplete && t.accion_correctiva ? 72 : 58;

      // Check if we need a new page (leave 15mm footer room)
      if (curY + cardH > PH - 18) {
        doc.addPage();
        drawPageFooter();
        doc.setFillColor(...DARK);
        doc.rect(0, 0, PW, 18, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...BLUE);
        doc.text('tecdoit', 10, 11);
        doc.setTextColor(...WHITE);
        doc.text(`Detalle de Tickets — ${clave} (cont.)`, 35, 11);
        curY = 24;
      }

      // Card background
      doc.setFillColor(...WHITE);
      doc.roundedRect(10, curY, PW - 20, cardH, 2, 2, 'F');

      // Left accent bar
      const accentCol = isComplete ? colorOk : t.estatus === 'En progreso' ? colorInfo : colorWarn;
      doc.setFillColor(...accentCol);
      doc.roundedRect(10, curY, 3, cardH, 1.5, 1.5, 'F');

      // Card border
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.25);
      doc.roundedRect(10, curY, PW - 20, cardH, 2, 2, 'S');

      // ── Ticket header row ────────────────────────────────────────────────
      const hdrY = curY + 6;
      // ID badge
      doc.setFillColor(...DARK);
      doc.roundedRect(16, hdrY - 4, 18, 6.5, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(...BLUE);
      doc.text(`#${t.id_mantenimiento}`, 25, hdrY, { align: 'center' });

      // Estatus pill
      const estW = 22;
      const estX = PW - 14 - estW;
      doc.setFillColor(...(isComplete ? [234, 250, 241] : t.estatus === 'En progreso' ? [232, 244, 253] : [254, 245, 231]));
      doc.roundedRect(estX, hdrY - 4, estW, 6.5, 3, 3, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(...accentCol);
      doc.text(t.estatus.toUpperCase(), estX + estW / 2, hdrY, { align: 'center' });

      // Descripcion as title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...TEXT);
      const descClipped = (t.descripcion || '').length > 72 ? t.descripcion.slice(0, 70) + '…' : (t.descripcion || '—');
      doc.text(descClipped, 38, hdrY);

      // ── Row 1: meta ──────────────────────────────────────────────────────
      const r1y = curY + 16;
      // Prioridad
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(...MUTED);
      doc.text('PRIORIDAD', 16, r1y);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...prioColor(prioVal));
      doc.text(`${prioVal} ${prioLabel[prioVal] || ''}`, 16, r1y + 4);

      // Proveedor
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(...MUTED);
      doc.text('PROVEEDOR', 55, r1y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...TEXT);
      doc.text(t.proveedores?.nombre || 'Resolución interna', 55, r1y + 4);

      // Fecha programada
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(...MUTED);
      doc.text('PROGRAMADO', 110, r1y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...TEXT);
      doc.text(fmtDate(t.fecha_programada), 110, r1y + 4);

      // Costo
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(...MUTED);
      doc.text('COSTO', 155, r1y);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...TEAL);
      doc.text(fmtMXN(t.costo), 155, r1y + 4);

      // ── Row 2: dates ─────────────────────────────────────────────────────
      const r2y = curY + 30;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(...MUTED);
      doc.text('FECHA REPORTE', 16, r2y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...TEXT);
      doc.text(fmtDateTime(t.fecha_reporte), 16, r2y + 4);

      if (isComplete && t.fecha_cierre) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(...MUTED);
        doc.text('FECHA CIERRE', 80, r2y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...TEXT);
        doc.text(fmtDateTime(t.fecha_cierre), 80, r2y + 4);
      }

      // ── Causa de falla ───────────────────────────────────────────────────
      let extraY = curY + 42;
      if (t.causa_falla) {
        doc.setFillColor(254, 245, 231);
        doc.roundedRect(16, extraY - 2, PW - 32, 8, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(...colorWarn);
        doc.text('⚠ CAUSA:', 19, extraY + 2.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...TEXT);
        const causaClipped = (t.causa_falla || '').length > 100 ? t.causa_falla.slice(0, 98) + '…' : t.causa_falla;
        doc.text(causaClipped, 38, extraY + 2.5);
        extraY += 11;
      }

      // ── Acción Correctiva ────────────────────────────────────────────────
      if (isComplete && t.accion_correctiva) {
        // If near bottom, card height already accounts for this block
        doc.setFillColor(234, 250, 241);
        doc.roundedRect(16, extraY - 2, PW - 32, 10, 1, 1, 'F');
        doc.setDrawColor(...colorOk);
        doc.setLineWidth(0.8);
        doc.line(16, extraY - 2, 16, extraY + 8);
        doc.setLineWidth(0.25);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(...colorOk);
        doc.text('✓ ACCIÓN CORRECTIVA:', 19, extraY + 2);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(30, 132, 73);
        // Wrap long text
        const accionText = t.accion_correctiva || '';
        const maxChars = 130;
        const displayText = accionText.length > maxChars ? accionText.slice(0, maxChars - 1) + '…' : accionText;
        doc.text(displayText, 19, extraY + 7.5, { maxWidth: PW - 42 });
      }

      curY += cardH + 5;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Patch headers on ALL pages now that we know total page count
  // ─────────────────────────────────────────────────────────────────────────
  const totalPages = doc.internal.pages.length - 1; // pages array is 1-indexed, slot 0 is empty
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    // Only patch pages 2+ — page 1 has the hero banner instead
    if (p >= 2) {
      // header already drawn per-page above; just update page number
    }
    // Stamp page number on every page footer
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    // Overwrite the page count placeholder
    // (already drawn in drawPageFooter so we just patch the "de X" text)
    doc.setFillColor(255, 255, 255);
    doc.rect(PW / 2 - 15, PH - 10, 30, 5, 'F');
    doc.text(`Página ${p} de ${totalPages}`, PW / 2, PH - 7, { align: 'center' });
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  const filename = `reporte_${clave}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

// ── PRIORIDAD ─────────────────────────────────────────────────────────────────
const PRIORIDAD_CONFIG = [
  { valor: 0, label: 'Sin definir', color: '#bdc3c7', bg: '#f4f6f7' },
  { valor: 1, label: 'Muy baja',    color: '#27ae60', bg: '#eafaf1' },
  { valor: 2, label: 'Baja',        color: '#2ecc71', bg: '#d5f5e3' },
  { valor: 3, label: 'Media',       color: '#f39c12', bg: '#fef5e7' },
  { valor: 4, label: 'Alta',        color: '#e67e22', bg: '#fdebd0' },
  { valor: 5, label: 'Crítica',     color: '#e74c3c', bg: '#fadbd8' },
];

function PrioridadSelector({ value, onChange }) {
  return (
    <div className="form-group">
      <label>Prioridad</label>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
        {PRIORIDAD_CONFIG.map(p => (
          <button key={p.valor} type="button" onClick={() => onChange(p.valor)}
            style={{
              padding: '6px 12px', borderRadius: '20px',
              border: `2px solid ${value === p.valor ? p.color : '#ecf0f1'}`,
              backgroundColor: value === p.valor ? p.bg : 'transparent',
              color: value === p.valor ? p.color : '#7f8c8d',
              fontSize: '12px', fontWeight: value === p.valor ? '700' : '400',
              cursor: 'pointer', transition: 'all 0.15s ease',
            }}
          >{p.valor} — {p.label}</button>
        ))}
      </div>
    </div>
  );
}

function PrioridadBadge({ value }) {
  const p = PRIORIDAD_CONFIG.find(c => c.valor === value) || PRIORIDAD_CONFIG[0];
  return (
    <span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700',
      backgroundColor: p.bg, color: p.color, whiteSpace: 'nowrap' }}>
      {p.valor} {p.label}
    </span>
  );
}

const ESTATUS_CONFIG = {
  'Abierto':     { bg: '#fef5e7', color: '#f39c12' },
  'En progreso': { bg: '#e8f4fd', color: '#2980b9' },
  'Completado':  { bg: '#eafaf1', color: '#27ae60' },
  'Abierto':     { bg: '#fef5e7', color: '#f39c12' },
  'En progreso': { bg: '#e8f4fd', color: '#2980b9' },
  'Completado':  { bg: '#eafaf1', color: '#27ae60' },
};

function formatFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatFechaHora(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
  return new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}
function formatMoneda(val) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val || 0);
}

// ── CompletarModal ─────────────────────────────────────────────────────────────
function CompletarModal({ ticket, onClose, onCompletado }) {
  const [accionCorrectiva, setAccionCorrectiva] = useState('');
  const [costoFinal, setCostoFinal] = useState(ticket.costo != null ? String(ticket.costo) : '');
  const [cerrando, setCerrando] = useState(false);
  const [error, setError] = useState(null);

  async function handleConfirmar(e) {
    e.preventDefault();
    if (!accionCorrectiva.trim()) {
      setError('La acción correctiva es obligatoria para cerrar el ticket.');
      return;
    }
    setCerrando(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/correctivo/${ticket.id_mantenimiento}/completar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clave_activo: ticket.clave_activo,
          accion_correctiva: accionCorrectiva.trim(),
          costo_final: costoFinal !== '' ? Number(costoFinal) : ticket.costo,
        }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Error al completar'); }
      onCompletado();
    } catch (err) { setError(err.message); }
    finally { setCerrando(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
        <div style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
          <h2 style={{ fontSize: '18px', color: '#2c3e50', marginBottom: '4px' }}>Cerrar Ticket #{ticket.id_mantenimiento}</h2>
          <p style={{ fontSize: '13px', color: '#7f8c8d', margin: 0 }}>
            {ticket.clave_activo}{ticket.equipos && ` — ${ticket.equipos.marca} ${ticket.equipos.modelo}`}
          </p>
        </div>
        <div style={{ backgroundColor: '#eafaf1', border: '1px solid #a9dfbf', borderRadius: '6px', padding: '10px 14px', marginBottom: '20px', fontSize: '13px', color: '#1e8449', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <span style={{ fontSize: '16px', lineHeight: 1.4 }}>✓</span>
          <span>Al confirmar, el ticket se marcará como <strong>Completado</strong> y el equipo regresará a estatus <strong>Activo</strong>.</span>
        </div>
        {error && <div style={{ backgroundColor: '#fceceb', color: '#e74c3c', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '15px' }}>{error}</div>}
        <form onSubmit={handleConfirmar}>
          <div className="form-group">
            <label>Acción Correctiva <span style={{ color: '#e74c3c', fontWeight: '700' }}>*</span></label>
            <textarea value={accionCorrectiva} onChange={e => setAccionCorrectiva(e.target.value)} required rows={5}
              placeholder="Describe el procedimiento realizado para resolver la falla..."
              style={{ padding: '10px', border: '1px solid #bdc3c7', borderRadius: '6px', fontSize: '14px', resize: 'vertical', width: '100%', outline: 'none', fontFamily: 'inherit', lineHeight: '1.5', transition: 'border-color 0.2s ease' }}
              onFocus={e => e.target.style.borderColor = '#3498db'}
              onBlur={e => e.target.style.borderColor = '#bdc3c7'} />
            <small style={{ color: '#7f8c8d', fontSize: '12px' }}>Este registro quedará en el historial permanente del equipo.</small>
          </div>
          <div className="form-group" style={{ marginTop: '4px' }}>
            <label>Costo Final del Servicio ($)</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#7f8c8d', fontSize: '14px', pointerEvents: 'none' }}>$</span>
              <input type="number" step="0.01" min="0" value={costoFinal} onChange={e => setCostoFinal(e.target.value)}
                placeholder={ticket.costo != null ? String(ticket.costo) : '0.00'}
                style={{ padding: '10px 10px 10px 26px', border: '1px solid #bdc3c7', borderRadius: '6px', fontSize: '14px', width: '100%', outline: 'none' }}
                onFocus={e => e.target.style.borderColor = '#3498db'}
                onBlur={e => e.target.style.borderColor = '#bdc3c7'} />
            </div>
            {ticket.costo != null && Number(ticket.costo) > 0 && (
              <small style={{ color: '#7f8c8d', fontSize: '12px' }}>Costo estimado registrado: {formatMoneda(ticket.costo)}</small>
            )}
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={cerrando}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={cerrando}
              style={{ backgroundColor: '#27ae60', transition: 'background-color 0.2s ease' }}>
              {cerrando ? 'Procesando...' : '✓ Confirmar y Cerrar Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── TicketDetalle ──────────────────────────────────────────────────────────────
function TicketDetalle({ ticket, onClose }) {
  const estConf = ESTATUS_CONFIG?.[ticket?.estatus] || ESTATUS_CONFIG?.Abierto || { bg: '#ecf0f1', color: '#7f8c8d' };

  const rows = [
    ['Proveedor', ticket.proveedores?.nombre || 'Resolución interna'],
    ['Costo', formatMoneda(ticket.costo)],
    ['Fecha de reporte', formatFechaHora(ticket.fecha_reporte)],
    ['Fecha programada', formatFecha(ticket.fecha_programada)],
    ['Fecha de cierre', ticket.fecha_cierre ? formatFechaHora(ticket.fecha_cierre) : '—'],
  ];

  const timeline = [
    { label: 'Reportado', activo: true },
    { label: 'En progreso', activo: ticket.estatus !== 'Abierto' },
    { label: 'Completado', activo: ticket.estatus === 'Completado' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '560px', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '14px' }}>
          <div>
            <h2 style={{ fontSize: '18px', color: '#2c3e50', marginBottom: '4px' }}>Ticket #{ticket.id_mantenimiento}</h2>
            <span style={{ fontSize: '13px', color: '#7f8c8d' }}>{ticket.clave_activo} — {ticket.equipos?.marca} {ticket.equipos?.modelo}</span>
          </div>
          <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, backgroundColor: estConf.bg, color: estConf.color }}>{ticket.estatus}</span>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', color: '#7f8c8d', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Prioridad</div>
          <PrioridadBadge value={ticket.prioridad || 0} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
          {rows.map(([label, val]) => (
            <div key={label}>
              <div style={{ fontSize: '11px', color: '#7f8c8d', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>{label}</div>
              <div style={{ fontSize: '13px', color: '#2c3e50', fontWeight: 600 }}>{val}</div>
            </div>
          ))}
        </div>

        {ticket.causa_falla && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: '#7f8c8d', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Causa de la falla</div>
            <div style={{ padding: '12px 14px', backgroundColor: '#fef5e7', borderRadius: '6px', fontSize: '14px', color: '#2c3e50', lineHeight: '1.5', borderLeft: '3px solid #f39c12' }}>{ticket.causa_falla}</div>
          </div>
        )}

        <div style={{ marginBottom: ticket.accion_correctiva ? '16px' : '20px' }}>
          <div style={{ fontSize: '11px', color: '#7f8c8d', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Descripción de la falla</div>
          <div style={{ padding: '12px 14px', backgroundColor: '#f8f9fa', borderRadius: '6px', fontSize: '14px', color: '#2c3e50', lineHeight: '1.5' }}>{ticket.descripcion}</div>
        </div>

        {ticket.accion_correctiva && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', color: '#7f8c8d', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Acción Correctiva Aplicada</div>
            <div style={{ padding: '12px 14px', backgroundColor: '#eafaf1', borderRadius: '6px', fontSize: '14px', color: '#1e8449', lineHeight: '1.6', borderLeft: '3px solid #27ae60' }}>{ticket.accion_correctiva}</div>
          </div>
        )}

        {/* Timeline */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', color: '#7f8c8d', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Línea de tiempo</div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {timeline.map((step, i) => (
              <React.Fragment key={step.label}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: step.activo ? '#3498db' : '#ecf0f1', color: step.activo ? 'white' : '#bdc3c7', fontSize: '12px', fontWeight: 700 }}>{i + 1}</div>
                  <div style={{ fontSize: '10px', color: step.activo ? '#2c3e50' : '#bdc3c7', marginTop: '4px', textAlign: 'center', fontWeight: step.activo ? 600 : 'normal' }}>{step.label}</div>
                </div>
                {i < timeline.length - 1 && <div style={{ flex: 1, height: '2px', backgroundColor: step.activo && timeline[i+1].activo ? '#3498db' : '#ecf0f1', margin: '0 8px' }} />}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: '10px' }}>
          <button className="btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

// ── TicketEditar ───────────────────────────────────────────────────────────────
function TicketEditar({ ticket, proveedores, onClose, onGuardado }) {
  const [form, setForm] = useState({
    descripcion: ticket.descripcion || '',
    causa_falla: ticket.causa_falla || '',
    prioridad: ticket.prioridad ?? 0,
    id_proveedor: ticket.id_proveedor || '',
    fecha_programada: ticket.fecha_programada ? ticket.fecha_programada.slice(0, 10) : '',
    costo: ticket.costo || '',
    estatus: ticket.estatus || 'Abierto',
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  function handleInput(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/correctivo/${ticket.id_mantenimiento}/editar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descripcion: form.descripcion,
          causa_falla: form.causa_falla || null,
          prioridad: form.prioridad ?? 0,
          id_proveedor: form.id_proveedor || null,
          fecha_programada: form.fecha_programada || null,
          costo: form.costo || 0,
          estatus: form.estatus,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al guardar');
      }
      onGuardado();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
        <h2 style={{ marginBottom: '6px', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>Editar Ticket #{ticket.id_mantenimiento}</h2>
        <p style={{ fontSize: '13px', color: '#7f8c8d', marginBottom: '20px' }}>{ticket.clave_activo} — {ticket.equipos?.marca} {ticket.equipos?.modelo}</p>
        {error && <div style={{ backgroundColor: '#fceceb', color: '#e74c3c', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '15px' }}>{error}</div>}

        <form onSubmit={guardar}>
          <div className="form-group">
            <label>Descripción de la falla</label>
            <textarea name="descripcion" value={form.descripcion} onChange={handleInput} required rows={3}
              style={{ padding: '10px', border: '1px solid #bdc3c7', borderRadius: '6px', fontSize: '14px', resize: 'vertical', width: '100%' }} />
          </div>

          <div className="form-group">
            <label>Causa de la falla</label>
            <input type="text" name="causa_falla" value={form.causa_falla} onChange={handleInput} placeholder="Ej. Sobrecalentamiento, cortocircuito..." />
          </div>

          <PrioridadSelector value={form.prioridad} onChange={val => setForm(prev => ({ ...prev, prioridad: val }))} />

          <div className="form-group">
            <label>Estatus</label>
            <select name="estatus" value={form.estatus} onChange={handleInput}>
              <option value="Abierto">Abierto</option>
              <option value="En progreso">En progreso</option>
              <option value="Completado">Completado</option>
            </select>
          </div>

          <div className="form-group">
            <label>Proveedor asignado (opcional)</label>
            <select name="id_proveedor" value={form.id_proveedor} onChange={handleInput}>
              <option value="">Resolución interna</option>
              {proveedores.map(p => <option key={p.id_proveedor} value={p.id_proveedor}>{p.nombre}{p.es_preferido ? ' ⭐' : ''}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div className="form-group">
              <label>Fecha programada</label>
              <input type="date" name="fecha_programada" value={form.fecha_programada} onChange={handleInput} />
            </div>
            <div className="form-group">
              <label>Costo estimado ($)</label>
              <input type="number" step="0.01" name="costo" value={form.costo} onChange={handleInput} placeholder="0.00" min="0" />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={guardando}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={guardando}>{guardando ? 'Procesando...' : 'Aplicar Modificaciones'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── EquipoPanel ────────────────────────────────────────────────────────────────
function EquipoPanel({ clave, tickets, proveedores, onClose, onCambiarEstatus, onRefresh }) {
  const [ticketInspectado, setTicketInspectado] = useState(null);
  const [ticketEditado, setTicketEditado] = useState(null);
  const [ticketCompletando, setTicketCompletando] = useState(null);
  const [exportando, setExportando] = useState(false);
  const [exportError, setExportError] = useState(null);

  const ticketsDeEquipo = tickets.filter(t => t.clave_activo === clave);
  const activos = ticketsDeEquipo.filter(t => t.estatus !== 'Completado');
  const historial = ticketsDeEquipo.filter(t => t.estatus === 'Completado');
  const equipoInfo = ticketsDeEquipo[0]?.equipos || null;
  const labInfo = equipoInfo?.laboratorios || null;

  async function handleExportar() {
    setExportando(true);
    setExportError(null);
    try {
      await generarReportePDF(clave, ticketsDeEquipo, equipoInfo, labInfo);
    } catch (err) {
      console.error('PDF export error:', err);
      setExportError('Error al generar el PDF. Intenta de nuevo.');
    } finally {
      setExportando(false);
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 900 }} />

      <div style={{ position: 'fixed', top: 0, right: 0, width: '520px', height: '100vh', backgroundColor: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.15)', zIndex: 901, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #ecf0f1', backgroundColor: '#1a252f', color: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: '18px', margin: 0, marginBottom: '4px' }}>{clave}</h2>
              {equipoInfo && <p style={{ fontSize: '13px', color: '#bdc3c7', margin: 0 }}>{equipoInfo.marca} {equipoInfo.modelo}</p>}
              {labInfo && <p style={{ fontSize: '12px', color: '#95a5a6', margin: '2px 0 0' }}>📍 {labInfo.nombre}</p>}
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#bdc3c7', cursor: 'pointer', fontSize: '20px' }}>✕</button>
          </div>

          <div style={{ display: 'flex', gap: '16px', marginTop: '14px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#f39c12' }}>{activos.length}</div>
              <div style={{ fontSize: '11px', color: '#bdc3c7' }}>Activos</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#27ae60' }}>{historial.length}</div>
              <div style={{ fontSize: '11px', color: '#bdc3c7' }}>Completados</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#3498db' }}>{formatMoneda(ticketsDeEquipo.reduce((s, t) => s + (Number(t.costo) || 0), 0))}</div>
              <div style={{ fontSize: '11px', color: '#bdc3c7' }}>Costo total</div>
            </div>
          </div>

          <div style={{ marginTop: '14px' }}>
            {exportError && <div style={{ fontSize: '11px', color: '#e74c3c', backgroundColor: 'rgba(231,76,60,0.15)', padding: '5px 8px', borderRadius: '4px', marginBottom: '8px' }}>{exportError}</div>}
            <button onClick={handleExportar} disabled={exportando} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '9px 16px', borderRadius: '6px', cursor: exportando ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 600, backgroundColor: exportando ? 'rgba(52,152,219,0.3)' : 'rgba(52,152,219,0.15)', color: exportando ? '#7f8c8d' : '#3498db', border: '1px solid rgba(52,152,219,0.4)' }}>
              {exportando ? (
                <><span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid #3498db', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Generando PDF...</>
              ) : (
                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Exportar Reporte PDF</>
              )}
            </button>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <div style={{ marginBottom: '28px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#7f8c8d', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Tickets activos</h3>
            {activos.length === 0 ? (
              <div style={{ padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px', textAlign: 'center', fontSize: '13px', color: '#7f8c8d' }}>Sin tickets activos</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {activos.map(t => {
                  const estConf = ESTATUS_CONFIG[t.estatus] || ESTATUS_CONFIG['Abierto'];
                  return (
                    <div key={t.id_mantenimiento} style={{ padding: '14px 16px', border: '1px solid #ecf0f1', borderRadius: '8px', borderLeft: `3px solid ${estConf.color}`, backgroundColor: '#fafafa' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#7f8c8d' }}>#{t.id_mantenimiento}</span>
                        <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 700, backgroundColor: estConf.bg, color: estConf.color }}>{t.estatus}</span>
                      </div>
                      <p style={{ fontSize: '13px', color: '#2c3e50', margin: '0 0 4px 0', lineHeight: '1.4' }}>{t.descripcion}</p>
                      {t.causa_falla && <p style={{ fontSize: '12px', color: '#e67e22', margin: '0 0 8px 0' }}>⚠ {t.causa_falla}</p>}
                      <div style={{ marginBottom: '6px' }}><PrioridadBadge value={t.prioridad || 0} /></div>
                      <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '10px' }}>{t.proveedores?.nombre || 'Resolución interna'} · {formatFecha(t.fecha_programada)} · {formatMoneda(t.costo)}</div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button className="btn-icon" style={{ fontSize: '11px' }} onClick={() => setTicketInspectado(t)}>🔍 Inspeccionar</button>
                        <button className="btn-icon" style={{ borderColor: '#f39c12', color: '#f39c12', fontSize: '11px' }} onClick={() => setTicketEditado(t)}>✏️ Editar</button>
                        {t.estatus === 'Abierto' && <button className="btn-icon" style={{ borderColor: '#2980b9', color: '#2980b9', fontSize: '11px' }} onClick={() => onCambiarEstatus(t.id_mantenimiento, 'En progreso')}>▶ En progreso</button>}
                        <button className="btn-icon" style={{ borderColor: '#27ae60', color: '#27ae60', fontSize: '11px' }} onClick={() => setTicketCompletando(t)}>✓ Completar</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#7f8c8d', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Historial completados</h3>
            {historial.length === 0 ? (
              <div style={{ padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px', textAlign: 'center', fontSize: '13px', color: '#7f8c8d' }}>Sin historial de tickets completados</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {historial.map(t => (
                  <div key={t.id_mantenimiento} style={{ padding: '12px 16px', border: '1px solid #ecf0f1', borderRadius: '8px', borderLeft: '3px solid #27ae60', backgroundColor: '#fafafa' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '6px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#7f8c8d' }}>#{t.id_mantenimiento}</span>
                          <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700, backgroundColor: '#eafaf1', color: '#27ae60' }}>Completado</span>
                        </div>
                        <p style={{ fontSize: '13px', color: '#2c3e50', margin: '0 0 3px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.descripcion}</p>
                        <span style={{ fontSize: '11px', color: '#7f8c8d' }}>Cerrado: {formatFecha(t.fecha_cierre)} · {formatMoneda(t.costo)}</span>
                        {t.accion_correctiva && (
                          <div style={{ marginTop: '6px', padding: '6px 8px', backgroundColor: '#eafaf1', borderRadius: '4px', fontSize: '11px', color: '#1e8449', borderLeft: '2px solid #27ae60', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '1.4' }}>
                            <strong>Acción: </strong>{t.accion_correctiva}
                          </div>
                        )}
                      </div>
                      <button className="btn-icon" style={{ fontSize: '11px', whiteSpace: 'nowrap', flexShrink: 0 }} onClick={() => setTicketInspectado(t)}>🔍 Inspeccionar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {ticketInspectado && <TicketDetalle ticket={ticketInspectado} onClose={() => setTicketInspectado(null)} />}
      {ticketEditado && <TicketEditar ticket={ticketEditado} proveedores={proveedores} onClose={() => setTicketEditado(null)} onGuardado={() => { setTicketEditado(null); onRefresh(); }} />}
      {ticketCompletando && <CompletarModal ticket={ticketCompletando} onClose={() => setTicketCompletando(null)} onCompletado={() => { setTicketCompletando(null); onRefresh(); }} />}
    </>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function Correctivo() {
  const [tickets, setTickets] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [laboratorios, setLaboratorios] = useState([]);

  const [filtroLab, setFiltroLab] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('');
  const [filtroClave, setFiltroClave] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);

  const [mostrarModal, setMostrarModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [panelClave, setPanelClave] = useState(null);
  const [ticketCompletando, setTicketCompletando] = useState(null);

  const [form, setForm] = useState({ clave_activo: '', descripcion: '', causa_falla: '', prioridad: 0, id_proveedor: '', fecha_programada: '', costo: '' });

  useEffect(() => { cargarDatos(); }, []);

  async function cargarDatos() {
    setCargando(true); setError(null);
    try {
      const [dataTickets, dataEq, dataProv, dataLabs] = await Promise.all([
        fetch(`${API_URL}/correctivo`).then(r => r.json()),
        equiposAPI.obtenerTodos(),
        proveedoresAPI.obtenerTodos(),
        inventarioAPI.obtenerLaboratorios(),
      ]);
      setTickets(dataTickets);
      setEquipos(dataEq);
      setProveedores(dataProv);
      setLaboratorios(dataLabs);
    } catch (err) {
      setError('No se pudo cargar la información. Verifica que el backend esté corriendo.');
    } finally {
      setCargando(false);
    }
  }

  function handleInput(e) { const { name, value } = e.target; setForm(prev => ({ ...prev, [name]: value })); }

  function abrirModal() { setForm({ clave_activo: '', descripcion: '', causa_falla: '', prioridad: 0, id_proveedor: '', fecha_programada: '', costo: '' }); setError(null); setMostrarModal(true); }

  async function crearTicket(e) {
    e.preventDefault(); setGuardando(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/correctivo`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clave_activo: form.clave_activo, descripcion: form.descripcion, causa_falla: form.causa_falla || null, prioridad: form.prioridad || 0, id_proveedor: form.id_proveedor || null, fecha_programada: form.fecha_programada || null, costo: form.costo || 0 }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Error al crear ticket'); }
      setMostrarModal(false); mostrarExitoMsg('Ticket correctivo registrado correctamente.'); cargarDatos();
    } catch (err) { setError(err.message); }
    finally { setGuardando(false); }
  }

  async function cambiarEstatus(id, estatus) {
    try {
      const res = await fetch(`${API_URL}/correctivo/${id}/estatus`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estatus }) });
      if (!res.ok) throw new Error('Error al actualizar estatus');
      await cargarDatos();
    } catch (err) { setError(err.message); }
  }

  function mostrarExitoMsg(msg) { setMensajeExito(msg); setTimeout(() => setMensajeExito(null), 3500); }

  const filtrados = tickets.filter(t => {
    const coincideEstatus = filtroEstatus === '' || t.estatus === filtroEstatus;
    const coincideClave = filtroClave === '' || t.clave_activo === filtroClave;
    const coincideBusqueda = busqueda === '' || t.clave_activo?.toLowerCase().includes(busqueda.toLowerCase()) || t.descripcion?.toLowerCase().includes(busqueda.toLowerCase());
    const coincideLab = filtroLab === '' || t.equipos?.id_laboratorio == filtroLab;
    return coincideEstatus && coincideClave && coincideBusqueda && coincideLab;
  });

  const abiertos = tickets.filter(t => t.estatus === 'Abierto').length;
  const enProgreso = tickets.filter(t => t.estatus === 'En progreso').length;
  const completados = tickets.filter(t => t.estatus === 'Completado').length;
  const costoTotal = tickets.reduce((sum, t) => sum + (Number(t.costo) || 0), 0);

  return (
    <div className="dashboard-container">
      <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><h1>Mantenimiento Correctivo</h1><p>Registro y seguimiento de fallas y tickets de reparación</p></div>
        <button className="btn-primary" onClick={abrirModal}>+ Nuevo Ticket</button>
      </header>

      {error && !mostrarModal && <div style={{ backgroundColor: '#fceceb', color: '#e74c3c', padding: '12px 16px', borderRadius: '6px', fontSize: '14px' }}>{error}</div>}
      {mensajeExito && <div style={{ backgroundColor: '#eafaf1', color: '#27ae60', padding: '12px 16px', borderRadius: '6px', fontSize: '14px' }}>{mensajeExito}</div>}

      <section className="kpi-grid">
        <div className="kpi-card"><h3>Tickets Abiertos</h3><p className="kpi-number warning-text">{abiertos}</p><span className="kpi-status warning">Pendientes de atención</span></div>
        <div className="kpi-card"><h3>En Progreso</h3><p className="kpi-number" style={{ color: '#2980b9' }}>{enProgreso}</p><span className="kpi-status info">En atención activa</span></div>
        <div className="kpi-card"><h3>Completados</h3><p className="kpi-number" style={{ color: '#27ae60' }}>{completados}</p><span className="kpi-status ok">Histórico total</span></div>
        <div className="kpi-card"><h3>Costo Acumulado</h3><p className="kpi-number" style={{ fontSize: '22px' }}>{formatMoneda(costoTotal)}</p><span className="kpi-status info">Servicios correctivos</span></div>
      </section>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" placeholder="Buscar por clave o descripción..." className="input-search" style={{ minWidth: '260px' }} value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        <select className="select-filter" value={filtroLab} onChange={e => setFiltroLab(e.target.value)}>
          <option value="">Todos los laboratorios</option>
          {laboratorios.map(l => <option key={l.id_laboratorio} value={l.id_laboratorio}>{l.nombre}</option>)}
        </select>
        <select className="select-filter" value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)}>
          <option value="">Todos los estatus</option>
          <option value="Abierto">Abierto</option>
          <option value="En progreso">En progreso</option>
          <option value="Completado">Completado</option>
        </select>
        <select className="select-filter" value={filtroClave} onChange={e => setFiltroClave(e.target.value)}>
          <option value="">Todos los equipos</option>
          {[...new Set(tickets.map(t => t.clave_activo))].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <section className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th><th>Equipo</th><th>Descripción de la falla</th><th>Proveedor</th>
              <th>Fecha programada</th><th>Costo</th><th>Prioridad</th><th>Estatus</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan="9" style={{ textAlign: 'center', padding: '20px' }}>Procesando información...</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan="9" style={{ textAlign: 'center', padding: '20px' }}>No se localizaron registros bajo los criterios especificados.</td></tr>
            ) : (
              filtrados.map(t => {
                const estConf = ESTATUS_CONFIG[t.estatus] || ESTATUS_CONFIG['Abierto'];
                const abierto = t.estatus !== 'Completado';
                return (
                  <tr key={t.id_mantenimiento}>
                    <td><span style={{ fontSize: '12px', fontWeight: 700, color: '#7f8c8d' }}>#{t.id_mantenimiento}</span></td>
                    <td><strong>{t.clave_activo}</strong><br /><small style={{ color: '#7f8c8d' }}>{t.equipos?.marca} {t.equipos?.modelo}</small></td>
                    <td style={{ maxWidth: '320px' }}><span style={{ fontSize: '13px' }}>{t.descripcion}</span>
                      {t.estatus === 'Completado' && t.accion_correctiva && <div style={{ fontSize: '11px', color: '#27ae60', marginTop: '3px', fontStyle: 'italic' }}>✓ Acción registrada</div>}
                    </td>
                    <td>{t.proveedores?.nombre || 'Resolución interna'}</td>
                    <td>{formatFecha(t.fecha_programada)}</td>
                    <td>{formatMoneda(t.costo)}</td>
                    <td><PrioridadBadge value={t.prioridad || 0} /></td>
                    <td><span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, backgroundColor: estConf.bg, color: estConf.color }}>{t.estatus}</span></td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <button className="btn-icon" style={{ fontSize: '11px' }} onClick={() => setPanelClave(t.clave_activo)}>👁 Ver equipo</button>
                        {t.estatus === 'Abierto' && <button className="btn-icon" style={{ borderColor: '#2980b9', color: '#2980b9', fontSize: '11px' }} onClick={() => cambiarEstatus(t.id_mantenimiento, 'En progreso')}>▶ En progreso</button>}
                        {abierto && <button className="btn-icon" style={{ borderColor: '#27ae60', color: '#27ae60', fontSize: '11px' }} onClick={() => setTicketCompletando(t)}>✓ Completar</button>}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      {mostrarModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '580px' }}>
            <h2 style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Registrar Ticket Correctivo</h2>
            {error && <div style={{ backgroundColor: '#fceceb', color: '#e74c3c', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '15px' }}>{error}</div>}
            <form onSubmit={crearTicket}>
              <div className="form-group">
                <label>Equipo</label>
                <select name="clave_activo" value={form.clave_activo} onChange={handleInput} required>
                  <option value="">-- Seleccionar equipo --</option>
                  {equipos.map(eq => <option key={eq.clave_activo} value={eq.clave_activo}>{eq.clave_activo} — {eq.marca} {eq.modelo}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Descripción de la falla</label>
                <textarea name="descripcion" value={form.descripcion} onChange={handleInput} required rows={3} placeholder="Describe detalladamente el problema detectado..." style={{ padding: '10px', border: '1px solid #bdc3c7', borderRadius: '6px', fontSize: '14px', resize: 'vertical', width: '100%' }} />
              </div>

              <div className="form-group">
                <label>Causa de la falla</label>
                <input type="text" name="causa_falla" value={form.causa_falla} onChange={handleInput} placeholder="Ej. Sobrecalentamiento, cortocircuito, desgaste..." />
              </div>

              <PrioridadSelector value={form.prioridad} onChange={val => setForm(prev => ({ ...prev, prioridad: val }))} />

              <div className="form-group">
                <label>Proveedor asignado (opcional)</label>
                <select name="id_proveedor" value={form.id_proveedor} onChange={handleInput}>
                  <option value="">Resolución interna</option>
                  {proveedores.map(p => <option key={p.id_proveedor} value={p.id_proveedor}>{p.nombre}{p.es_preferido ? ' ⭐' : ''}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group"><label>Fecha programada</label><input type="date" name="fecha_programada" value={form.fecha_programada} onChange={handleInput} /></div>
                <div className="form-group"><label>Costo estimado ($)</label><input type="number" step="0.01" name="costo" value={form.costo} onChange={handleInput} placeholder="0.00" min="0" /></div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setMostrarModal(false)} disabled={guardando}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={guardando}>{guardando ? 'Procesando...' : 'Crear Ticket'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {ticketCompletando && (
        <CompletarModal ticket={ticketCompletando} onClose={() => setTicketCompletando(null)} onCompletado={() => { setTicketCompletando(null); mostrarExitoMsg('Ticket cerrado correctamente.'); cargarDatos(); }} />
      )}

      {panelClave && (
        <EquipoPanel clave={panelClave} tickets={tickets} proveedores={proveedores}
          onClose={() => setPanelClave(null)}
          onCambiarEstatus={async (id, estatus) => { await cambiarEstatus(id, estatus); }}
          onRefresh={() => { cargarDatos(); mostrarExitoMsg('Ticket actualizado correctamente.'); }} />
      )}
    </div>
  );
}