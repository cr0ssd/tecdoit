import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../services/api';
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const API_URL = import.meta.env.VITE_API_URL;

// ── Calendar helpers ───────────────────────────────────────────────────────────
const MESES      = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS_SEMANA = ['Do','Lu','Ma','Mi','Ju','Vi','Sa'];
function getMesesDias(year, month) {
  return { firstDay: new Date(year, month, 1).getDay(), daysInMonth: new Date(year, month + 1, 0).getDate() };
}

// ── CalendarioPanel ────────────────────────────────────────────────────────────
function CalendarioPanel({ fechas, onClose }) {
  const today = new Date();
  const [mes,  setMes]  = useState(today.getMonth());
  const [anio, setAnio] = useState(today.getFullYear());
  const ref = useRef(null);

  const mapaFechas = {};
  fechas.forEach(f => {
    if (!f.proxima_fecha) return;
    const key = f.proxima_fecha.slice(0, 10);
    if (!mapaFechas[key]) mapaFechas[key] = [];
    mapaFechas[key].push(f);
  });

  const { firstDay, daysInMonth } = getMesesDias(anio, mes);
  const prevMes = () => { if (mes === 0) { setMes(11); setAnio(a => a - 1); } else setMes(m => m - 1); };
  const nextMes = () => { if (mes === 11) { setMes(0);  setAnio(a => a + 1); } else setMes(m => m + 1); };

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const cells = [];
  for (let i = 0; i < firstDay; i++)    cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div ref={ref} style={{ position: 'absolute', right: 0, top: '44px', width: '320px', backgroundColor: '#ffffff', border: '1px solid #e0e0e0', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.14)', zIndex: 1001, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', backgroundColor: '#1a252f', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={prevMes} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}>‹</button>
        <strong style={{ fontSize: '14px' }}>{MESES[mes]} {anio}</strong>
        <button onClick={nextMes} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '8px 8px 0', gap: '2px' }}>
        {DIAS_SEMANA.map(d => <div key={d} style={{ textAlign: 'center', fontSize: '10px', color: '#7f8c8d', fontWeight: '700', paddingBottom: '4px' }}>{d}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '0 8px 10px', gap: '2px' }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const key    = `${anio}-${String(mes + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const eventos = mapaFechas[key] || [];
          const isToday = day === today.getDate() && mes === today.getMonth() && anio === today.getFullYear();
          const hasMaint = eventos.length > 0;
          return (
            <div key={key} title={hasMaint ? eventos.map(e => `${e.clave_activo}: ${e.tipo_requerimiento}`).join('\n') : undefined}
              style={{ textAlign: 'center', padding: '5px 2px', borderRadius: '6px', fontSize: '12px', position: 'relative', backgroundColor: isToday ? '#1a252f' : hasMaint ? '#fff3cd' : 'transparent', color: isToday ? 'white' : '#2c3e50', fontWeight: isToday ? '700' : 'normal' }}>
              {day}
              {hasMaint && (
                <div style={{ position: 'absolute', bottom: '2px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '2px' }}>
                  {eventos.slice(0, 3).map((_, idx) => <div key={idx} style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#e67e22' }} />)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ padding: '8px 16px 12px', borderTop: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#fff3cd', border: '1px solid #e67e22' }} />
        <span style={{ fontSize: '11px', color: '#7f8c8d' }}>Mantenimiento preventivo pendiente</span>
      </div>
      {Object.keys(mapaFechas).length > 0 && (
        <div style={{ borderTop: '1px solid #f0f0f0', padding: '10px 14px 12px' }}>
          <div style={{ fontSize: '11px', color: '#7f8c8d', fontWeight: '700', marginBottom: '6px', textTransform: 'uppercase' }}>Próximos</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '120px', overflowY: 'auto' }}>
            {Object.entries(mapaFechas).sort(([a],[b]) => a.localeCompare(b)).slice(0,5).map(([fecha, items]) => (
              <div key={fecha} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '11px', color: '#e67e22', fontWeight: '700', whiteSpace: 'nowrap', minWidth: '75px' }}>
                  {new Date(fecha + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                </span>
                <span style={{ fontSize: '11px', color: '#2c3e50' }}>{items.map(i => i.clave_activo).join(', ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── PDF: Reporte de Laboratorio ────────────────────────────────────────────────
async function generarReporteLaboratorio(datos) {
  const { jsPDF }     = await import('jspdf');
  const { autoTable } = await import('jspdf-autotable');

  const { laboratorio, periodo, desde, equipos, mantenimientos, usos, preventivos } = datos;
  const labNombre  = laboratorio.nombre;
  const deptNombre = laboratorio.departamentos?.nombre || '—';

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PW  = doc.internal.pageSize.getWidth();
  const PH  = doc.internal.pageSize.getHeight();

  // ── Palette ────────────────────────────────────────────────────────────────
  const DARK   = [26,  37,  47];
  const BLUE   = [52,  152, 219];
  const TEAL   = [39,  174, 128];
  const LIGHT  = [244, 247, 246];
  const MUTED  = [127, 140, 141];
  const TEXT   = [44,  62,  80];
  const WHITE  = [255, 255, 255];
  const BORDER = [236, 240, 241];
  const C_OK   = [39,  174, 96];
  const C_WARN = [243, 156, 18];
  const C_DNGR = [231, 76,  60];
  const C_INFO = [52,  152, 219];

  // ── Period label ───────────────────────────────────────────────────────────
  const PERIODO_LABELS = { dia: 'Día (Hoy)', semana: 'Últimos 7 días', mes: 'Últimos 30 días', semestre: 'Últimos 6 meses' };
  const periodoLabel   = PERIODO_LABELS[periodo] || periodo;
  const desdeLabel     = new Date(desde).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Mexico_City' });
  const ahoraLabel     = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Mexico_City' });

  // ── Helpers ────────────────────────────────────────────────────────────────
  const fmtDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const fmtDT = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Mexico_City' });
  };
  const fmtMXN = (v) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v || 0);
  const dur = (ini, fin) => {
    if (!ini) return '—';
    const s = new Date(ini.includes('Z') ? ini : `${ini}Z`);
    const e = fin ? new Date(fin.includes('Z') ? fin : `${fin}Z`) : new Date();
    const m = Math.round((e - s) / 60000);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60), rm = m % 60;
    return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
  };

  // ── Aggregates ─────────────────────────────────────────────────────────────
  const totalEquipos     = equipos.length;
  const activos          = equipos.filter(e => e.estatus === 'Activo').length;
  const enMant           = equipos.filter(e => e.estatus === 'En Mantenimiento').length;
  const valorTotal       = equipos.reduce((s, e) => s + (Number(e.costo) || 0), 0);
  const costoMant        = mantenimientos.reduce((s, m) => s + (Number(m.costo) || 0), 0);
  const totalUsos        = usos.length;
  const usosActivos      = usos.filter(u => u.estatus === 'En uso').length;
  const mantAbiertos     = mantenimientos.filter(m => m.estatus !== 'Completado').length;
  const mantCompletados  = mantenimientos.filter(m => m.estatus === 'Completado').length;

  // ── Draw helpers ───────────────────────────────────────────────────────────
  function drawCoverHeader() {
    doc.setFillColor(...DARK);
    doc.rect(0, 0, PW, 62, 'F');
    doc.setFillColor(...BLUE);
    doc.triangle(0, 62, 50, 62, 0, 38, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...BLUE);
    doc.text('REPORTE DE LABORATORIO', 10, 20);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(...WHITE);
    doc.text(labNombre, 10, 33);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(180, 195, 199);
    doc.text(`${deptNombre}  •  Período: ${periodoLabel}`, 10, 42);
    doc.text(`${desdeLabel} — ${ahoraLabel}`, 10, 50);

    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(
      `Emitido: ${new Date().toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Mexico_City' })}`,
      PW - 10, 55, { align: 'right' }
    );
  }

  function drawPageHeader(subtitle) {
    doc.setFillColor(...DARK);
    doc.rect(0, 0, PW, 17, 'F');
    doc.setFillColor(...BLUE);
    doc.rect(0, 17, PW, 0.6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...BLUE);
    doc.text('tecdoit', 10, 11);
    doc.setTextColor(...WHITE);
    doc.text(`${labNombre} — ${subtitle}`, 33, 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(160, 175, 180);
    doc.text(periodoLabel, PW - 10, 11, { align: 'right' });
  }

  function drawFooter(p, total) {
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.line(10, PH - 11, PW - 10, PH - 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text('tecdoit — Sistema Integral de Gestión de Laboratorios', 10, PH - 7);
    doc.text(`Página ${p} de ${total}`, PW / 2, PH - 7, { align: 'center' });
    doc.text('Documento confidencial', PW - 10, PH - 7, { align: 'right' });
  }

  function sectionBar(label, y) {
    doc.setFillColor(...DARK);
    doc.roundedRect(10, y, PW - 20, 8, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...BLUE);
    doc.text('▪', 14, y + 5.3);
    doc.setTextColor(...WHITE);
    doc.text(label.toUpperCase(), 20, y + 5.3);
    return y + 12;
  }

  function kv(label, value, x, y, valColor) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), x, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...(valColor || TEXT));
    doc.text(String(value ?? '—'), x, y + 4.5);
  }

  function newPage(subtitle) {
    doc.addPage();
    drawPageHeader(subtitle);
    drawFooter(0, 0); // stamped in post-pass
    return 22;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 1 — COVER
  // ════════════════════════════════════════════════════════════════════════════
  drawCoverHeader();

  // KPI badges
  const kpiY = 68;
  const kpis = [
    { label: 'Equipos',       value: String(totalEquipos), color: BLUE  },
    { label: 'Activos',       value: String(activos),      color: C_OK  },
    { label: 'En Mant.',      value: String(enMant),       color: C_WARN },
    { label: 'Préstamos',     value: String(totalUsos),    color: [142, 68, 173] },
    { label: 'Mantenimientos',value: String(mantenimientos.length), color: C_INFO },
    { label: 'Costo Mant.',   value: fmtMXN(costoMant),   color: TEAL  },
  ];
  const kW = (PW - 20 - 5 * 3) / 6;
  kpis.forEach((k, i) => {
    const kx = 10 + i * (kW + 3);
    doc.setFillColor(...WHITE);
    doc.roundedRect(kx, kpiY, kW, 18, 1.5, 1.5, 'F');
    doc.setFillColor(...k.color);
    doc.roundedRect(kx, kpiY, kW, 2, 1, 1, 'F');
    doc.setDrawColor(...k.color);
    doc.setLineWidth(0.3);
    doc.roundedRect(kx, kpiY, kW, 18, 1.5, 1.5, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...k.color);
    doc.text(k.value, kx + kW / 2, kpiY + 11, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(...MUTED);
    doc.text(k.label.toUpperCase(), kx + kW / 2, kpiY + 16, { align: 'center' });
  });

  let curY = kpiY + 26;

  // ── Lab identity card ──────────────────────────────────────────────────────
  curY = sectionBar('Datos del Laboratorio', curY);
  doc.setFillColor(...LIGHT);
  doc.roundedRect(10, curY, PW - 20, 22, 2, 2, 'F');
  const c1 = 16, c2 = PW / 2 + 4;
  kv('Nombre del Laboratorio', labNombre,  c1, curY + 6);
  kv('Departamento',           deptNombre, c2, curY + 6);
  kv('Total de Equipos',       totalEquipos, c1, curY + 16);
  kv('Valor de Inventario',    fmtMXN(valorTotal), c2, curY + 16, TEAL);
  curY += 28;

  // ── Equipment status summary ───────────────────────────────────────────────
  curY = sectionBar('Estado del Inventario', curY);
  const statusRows = [
    ['Activo',           equipos.filter(e => e.estatus === 'Activo').length,           C_OK],
    ['En Mantenimiento', equipos.filter(e => e.estatus === 'En Mantenimiento').length,  C_WARN],
    ['Baja',             equipos.filter(e => e.estatus === 'Baja').length,              C_DNGR],
  ];

  if (equipos.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text('No hay equipos registrados en este laboratorio.', PW / 2, curY + 6, { align: 'center' });
    curY += 14;
  } else {
    // Mini horizontal bar chart using rectangles
    const barW = PW - 20;
    const barH = 8;
    statusRows.forEach((row, i) => {
      const [label, count, color] = row;
      const pct = totalEquipos > 0 ? count / totalEquipos : 0;
      const bx  = 10;
      const by  = curY + i * 13;
      // Background
      doc.setFillColor(240, 243, 244);
      doc.roundedRect(bx + 38, by, barW - 38 - 24, barH, 2, 2, 'F');
      // Fill
      if (pct > 0) {
        doc.setFillColor(...color);
        doc.roundedRect(bx + 38, by, Math.max(4, (barW - 38 - 24) * pct), barH, 2, 2, 'F');
      }
      // Label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...color);
      doc.text(label, bx, by + 6);
      // Count
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...color);
      doc.text(String(count), PW - 10, by + 6, { align: 'right' });
    });
    curY += statusRows.length * 13 + 6;
  }

  // ── Maintenance summary ────────────────────────────────────────────────────
  curY = sectionBar('Resumen de Mantenimientos', curY);
  doc.setFillColor(...LIGHT);
  doc.roundedRect(10, curY, PW - 20, 22, 2, 2, 'F');
  kv('Total en período',  mantenimientos.length, c1, curY + 6);
  kv('Costo acumulado',   fmtMXN(costoMant),     c2, curY + 6, TEAL);
  kv('Abiertos',          mantAbiertos,           c1, curY + 16, C_WARN);
  kv('Completados',       mantCompletados,        c2, curY + 16, C_OK);
  curY += 28;

  // ── Uso summary ───────────────────────────────────────────────────────────
  curY = sectionBar('Resumen de Préstamos', curY);
  doc.setFillColor(...LIGHT);
  doc.roundedRect(10, curY, PW - 20, 22, 2, 2, 'F');
  kv('Total de sesiones',  totalUsos,    c1, curY + 6);
  kv('En uso actualmente', usosActivos,  c2, curY + 6, C_WARN);
  const uniqUsuarios = new Set(usos.map(u => u.usuario_nombre)).size;
  const uniqCarreras = new Set(usos.map(u => u.carrera).filter(Boolean)).size;
  kv('Usuarios distintos', uniqUsuarios, c1, curY + 16);
  kv('Carreras distintas', uniqCarreras, c2, curY + 16);
  curY += 28;

  drawFooter(0, 0); // patched below

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 2 — INVENTARIO COMPLETO
  // ════════════════════════════════════════════════════════════════════════════
  curY = newPage('Inventario de Equipos');
  curY = sectionBar('Catálogo Completo de Equipos', curY);

  if (equipos.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text('No hay equipos registrados en este laboratorio.', PW / 2, curY + 8, { align: 'center' });
  } else {
    autoTable(doc, {
      startY: curY,
      margin: { left: 10, right: 10 },
      head: [[
        { content: 'Clave Activo',  styles: { cellWidth: 30 } },
        { content: 'Marca',         styles: { cellWidth: 28 } },
        { content: 'Modelo',        styles: { cellWidth: 32 } },
        { content: 'Estatus',       styles: { halign: 'center', cellWidth: 24 } },
        { content: 'Valor',         styles: { halign: 'right',  cellWidth: 24 } },
        { content: 'Horas Acum.',   styles: { halign: 'center', cellWidth: 20 } },
        { content: 'Límite Hrs',    styles: { halign: 'center', cellWidth: 18 } },
        { content: 'Urg.',          styles: { halign: 'center', cellWidth: 12 } },
        { content: 'Alta',          styles: { halign: 'center', cellWidth: 'auto' } },
      ]],
      body: equipos.map(e => {
        const sColor = e.estatus === 'Activo' ? C_OK : e.estatus === 'Baja' ? C_DNGR : C_WARN;
        return [
          { content: e.clave_activo,          styles: { fontStyle: 'bold', fontSize: 7.5 } },
          { content: e.marca || '—',           styles: { fontSize: 7 } },
          { content: e.modelo || '—',          styles: { fontSize: 7 } },
          { content: e.estatus,                styles: { halign: 'center', fontSize: 7, fontStyle: 'bold', textColor: sColor } },
          { content: fmtMXN(e.costo),          styles: { halign: 'right',  fontSize: 7 } },
          { content: String(e.horas_acumuladas ?? 0), styles: { halign: 'center', fontSize: 7 } },
          { content: e.limite_horas ? String(e.limite_horas) : '—', styles: { halign: 'center', fontSize: 7 } },
          { content: e.mantenimiento_urgente ? '⚠' : '—', styles: { halign: 'center', fontSize: 8, textColor: e.mantenimiento_urgente ? C_DNGR : MUTED } },
          { content: fmtDate(e.fecha_registro), styles: { halign: 'center', fontSize: 6.5, textColor: MUTED } },
        ];
      }),
      headStyles:         { fillColor: DARK, textColor: WHITE, fontSize: 7, fontStyle: 'bold', cellPadding: 3 },
      bodyStyles:         { cellPadding: { top: 3, bottom: 3, left: 3, right: 3 }, lineColor: BORDER, lineWidth: 0.2 },
      alternateRowStyles: { fillColor: LIGHT },
      didDrawPage:        (d) => { if (d.pageNumber > 1) { drawPageHeader('Inventario de Equipos'); drawFooter(0,0); } },
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 3 — MANTENIMIENTOS
  // ════════════════════════════════════════════════════════════════════════════
  curY = newPage('Mantenimientos');
  curY = sectionBar(`Mantenimientos en el período (${mantenimientos.length})`, curY);

  if (mantenimientos.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text('No se registraron mantenimientos en este período.', PW / 2, curY + 8, { align: 'center' });
  } else {
    autoTable(doc, {
      startY: curY,
      margin: { left: 10, right: 10 },
      head: [[
        { content: 'Equipo',       styles: { cellWidth: 28 } },
        { content: 'Tipo',         styles: { cellWidth: 20 } },
        { content: 'Descripción',  styles: { cellWidth: 48 } },
        { content: 'Proveedor',    styles: { cellWidth: 30 } },
        { content: 'Programado',   styles: { halign: 'center', cellWidth: 24 } },
        { content: 'Cierre',       styles: { halign: 'center', cellWidth: 24 } },
        { content: 'Costo',        styles: { halign: 'right',  cellWidth: 22 } },
        { content: 'Estatus',      styles: { halign: 'center', cellWidth: 'auto' } },
      ]],
      body: mantenimientos.map(m => {
        const sColor = m.estatus === 'Completado' ? C_OK : m.estatus === 'En progreso' ? C_INFO : C_WARN;
        const tColor = m.tipo_mantenimiento === 'Correctivo' ? C_DNGR : C_INFO;
        return [
          { content: m.clave_activo,           styles: { fontStyle: 'bold', fontSize: 7.5 } },
          { content: m.tipo_mantenimiento,     styles: { fontSize: 6.5, fontStyle: 'bold', textColor: tColor } },
          { content: (m.descripcion || '').slice(0, 55) + ((m.descripcion || '').length > 55 ? '…' : ''), styles: { fontSize: 7 } },
          { content: m.proveedores?.nombre || 'Interna', styles: { fontSize: 7 } },
          { content: fmtDate(m.fecha_programada), styles: { halign: 'center', fontSize: 7 } },
          { content: fmtDate(m.fecha_cierre),     styles: { halign: 'center', fontSize: 7, textColor: m.fecha_cierre ? C_OK : MUTED } },
          { content: fmtMXN(m.costo),            styles: { halign: 'right',  fontSize: 7 } },
          { content: m.estatus || 'Abierto',     styles: { halign: 'center', fontSize: 6.5, fontStyle: 'bold', textColor: sColor } },
        ];
      }),
      headStyles:         { fillColor: DARK, textColor: WHITE, fontSize: 7, fontStyle: 'bold', cellPadding: 3 },
      bodyStyles:         { cellPadding: { top: 3, bottom: 3, left: 3, right: 3 }, lineColor: BORDER, lineWidth: 0.2 },
      alternateRowStyles: { fillColor: LIGHT },
      didDrawPage:        (d) => { if (d.pageNumber > 1) { drawPageHeader('Mantenimientos'); drawFooter(0,0); } },
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 4 — REGISTRO DE PRÉSTAMOS / USO
  // ════════════════════════════════════════════════════════════════════════════
  curY = newPage('Registro de Préstamos');
  curY = sectionBar(`Sesiones de uso en el período (${usos.length})`, curY);

  if (usos.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text('No se registraron préstamos en este período.', PW / 2, curY + 8, { align: 'center' });
  } else {
    autoTable(doc, {
      startY: curY,
      margin: { left: 10, right: 10 },
      head: [[
        { content: 'Equipo',    styles: { cellWidth: 30 } },
        { content: 'Usuario',   styles: { cellWidth: 42 } },
        { content: 'Carrera',   styles: { halign: 'center', cellWidth: 20 } },
        { content: 'Propósito', styles: { cellWidth: 44 } },
        { content: 'Inicio',    styles: { halign: 'center', cellWidth: 30 } },
        { content: 'Fin',       styles: { halign: 'center', cellWidth: 30 } },
        { content: 'Duración',  styles: { halign: 'center', cellWidth: 'auto' } },
      ]],
      body: usos.map(u => {
        const isActive = u.estatus === 'En uso';
        return [
          { content: u.clave_activo,   styles: { fontStyle: 'bold', fontSize: 7.5 } },
          { content: u.usuario_nombre, styles: { fontSize: 7.5 } },
          { content: u.carrera || '—', styles: { halign: 'center', fontSize: 7, fontStyle: 'bold', textColor: C_INFO } },
          { content: (u.proposito || '—').slice(0, 40), styles: { fontSize: 6.5, textColor: MUTED } },
          { content: fmtDT(u.hora_inicio), styles: { halign: 'center', fontSize: 7 } },
          {
            content: isActive ? 'En uso' : fmtDT(u.hora_fin),
            styles: { halign: 'center', fontSize: 7, textColor: isActive ? C_WARN : MUTED },
          },
          { content: dur(u.hora_inicio, u.hora_fin), styles: { halign: 'center', fontSize: 7 } },
        ];
      }),
      headStyles:         { fillColor: DARK, textColor: WHITE, fontSize: 7, fontStyle: 'bold', cellPadding: 3 },
      bodyStyles:         { cellPadding: { top: 3, bottom: 3, left: 3, right: 3 }, lineColor: BORDER, lineWidth: 0.2 },
      alternateRowStyles: { fillColor: LIGHT },
      didDrawPage:        (d) => { if (d.pageNumber > 1) { drawPageHeader('Registro de Préstamos'); drawFooter(0,0); } },
    });
  }

  // ── Distribución por carrera ───────────────────────────────────────────────
  if (usos.length > 0) {
    const lastY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : curY + 20;
    let secY    = lastY;
    if (secY + 50 > PH - 14) { secY = newPage('Registro de Préstamos'); }

    secY = sectionBar('Distribución por Carrera', secY);
    const porCarrera = {};
    usos.forEach(u => { const k = u.carrera || 'Sin carrera'; porCarrera[k] = (porCarrera[k] || 0) + 1; });
    const carreraRows = Object.entries(porCarrera)
      .sort((a, b) => b[1] - a[1])
      .map(([c, n]) => [
        { content: c, styles: { fontStyle: 'bold', fontSize: 8, textColor: C_INFO } },
        { content: String(n), styles: { halign: 'center', fontStyle: 'bold', fontSize: 9 } },
        { content: `${Math.round((n / usos.length) * 100)}%`, styles: { halign: 'center', fontSize: 7.5, textColor: MUTED } },
      ]);

    autoTable(doc, {
      startY:  secY,
      margin:  { left: 10, right: 10 },
      tableWidth: 90,
      head: [[
        { content: 'Carrera',   styles: { cellWidth: 38 } },
        { content: 'Sesiones',  styles: { halign: 'center', cellWidth: 28 } },
        { content: '% del total', styles: { halign: 'center', cellWidth: 24 } },
      ]],
      body: carreraRows,
      headStyles:         { fillColor: DARK, textColor: WHITE, fontSize: 7, fontStyle: 'bold', cellPadding: 3 },
      bodyStyles:         { cellPadding: 3.5, lineColor: BORDER, lineWidth: 0.2 },
      alternateRowStyles: { fillColor: LIGHT },
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 5 — PREVENTIVO (if any)
  // ════════════════════════════════════════════════════════════════════════════
  if (preventivos.length > 0) {
    curY = newPage('Mantenimiento Preventivo');
    curY = sectionBar(`Configuraciones preventivas (${preventivos.length})`, curY);

    const hoy     = new Date();
    const diasHasta = (fecha) => {
      if (!fecha) return null;
      const t = new Date(fecha); t.setHours(0,0,0,0);
      const h = new Date(hoy);   h.setHours(0,0,0,0);
      return Math.ceil((t - h) / 86400000);
    };
    const estadoLabel = (p) => {
      if (p.en_mantenimiento) return { txt: 'En Mantenimiento', col: C_WARN };
      const d = diasHasta(p.proxima_fecha);
      if (d === null) return { txt: 'Sin fecha', col: MUTED };
      if (d < 0) return { txt: `Vencido ${Math.abs(d)}d`, col: C_DNGR };
      if (d <= 7) return { txt: `${d} días`, col: C_WARN };
      return { txt: `${d} días`, col: C_OK };
    };

    autoTable(doc, {
      startY: curY,
      margin: { left: 10, right: 10 },
      head: [[
        { content: 'Equipo',         styles: { cellWidth: 32 } },
        { content: 'Periodicidad',   styles: { halign: 'center', cellWidth: 24 } },
        { content: 'Próxima fecha',  styles: { halign: 'center', cellWidth: 28 } },
        { content: 'Última ejec.',   styles: { halign: 'center', cellWidth: 28 } },
        { content: 'Proveedor',      styles: { cellWidth: 34 } },
        { content: 'Responsable',    styles: { cellWidth: 34 } },
        { content: 'Tareas',         styles: { halign: 'center', cellWidth: 16 } },
        { content: 'Estado',         styles: { halign: 'center', cellWidth: 'auto' } },
      ]],
      body: preventivos.map(p => {
        const est = estadoLabel(p);
        return [
          { content: p.clave_activo, styles: { fontStyle: 'bold', fontSize: 7.5 } },
          { content: p.intervalo_dias ? `${p.intervalo_dias} días` : '—', styles: { halign: 'center', fontSize: 7 } },
          { content: fmtDate(p.proxima_fecha), styles: { halign: 'center', fontSize: 7 } },
          { content: fmtDate(p.ultima_ejecucion), styles: { halign: 'center', fontSize: 7, textColor: MUTED } },
          { content: p.proveedor   || '—', styles: { fontSize: 7 } },
          { content: p.responsable || '—', styles: { fontSize: 7 } },
          { content: String((p.tareas || []).length), styles: { halign: 'center', fontSize: 7 } },
          { content: est.txt, styles: { halign: 'center', fontSize: 6.5, fontStyle: 'bold', textColor: est.col } },
        ];
      }),
      headStyles:         { fillColor: DARK, textColor: WHITE, fontSize: 7, fontStyle: 'bold', cellPadding: 3 },
      bodyStyles:         { cellPadding: { top: 3, bottom: 3, left: 3, right: 3 }, lineColor: BORDER, lineWidth: 0.2 },
      alternateRowStyles: { fillColor: LIGHT },
      didDrawPage:        (d) => { if (d.pageNumber > 1) { drawPageHeader('Mantenimiento Preventivo'); drawFooter(0,0); } },
    });
  }

  // ── Stamp correct page numbers on all pages ────────────────────────────────
  const totalPages = doc.internal.pages.length - 1;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFillColor(...WHITE);
    doc.rect(PW / 2 - 20, PH - 9.5, 40, 5, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(`Página ${p} de ${totalPages}`, PW / 2, PH - 6.5, { align: 'center' });
  }

  const safeName = labNombre.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`reporte_${safeName}_${periodo}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
function Dashboard() {
  const navigate = useNavigate();

  const [metricas, setMetricas] = useState({
    totalEquipos: 0, mantenimientoActivo: 0, prestados: 0,
    opexMantenimientos: 0, opexReposiciones: 0, opexTotal: 0,
  });
  const [actividadReciente,         setActividadReciente]         = useState([]);
  const [prestamosActivos,           setPrestamosActivos]           = useState([]);
  const [notificaciones,             setNotificaciones]             = useState([]);
  const [leidasLocales,              setLeidasLocales]              = useState([]);
  const [mostrarMenuNotificaciones,  setMostrarMenuNotificaciones]  = useState(false);
  const [mostrarCalendario,          setMostrarCalendario]          = useState(false);
  const [fechasPreventivo,           setFechasPreventivo]           = useState([]);
  const [datosGraficaEstatus,        setDatosGraficaEstatus]        = useState([]);
  const [datosGraficaLabs,           setDatosGraficaLabs]           = useState([]);
  const [cargando,                   setCargando]                   = useState(true);

  // ── Reporte laboratorio state ─────────────────────────────────────────────
  const [laboratorios,    setLaboratorios]    = useState([]);
  const [labSeleccionado, setLabSeleccionado] = useState('');
  const [periodoReporte,  setPeriodoReporte]  = useState('mes');
  const [exportandoLab,   setExportandoLab]   = useState(false);
  const [errorReporte,    setErrorReporte]    = useState(null);

  const COLORES_ESTATUS = ['#27ae60', '#f39c12', '#3498db'];

  useEffect(() => {
    obtenerDatosDashboard();
    obtenerFechasCalendario();
    obtenerLaboratorios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leidasLocales]);

  async function obtenerFechasCalendario() {
    try {
      const res = await fetch(`${API_URL}/preventivo/calendario`);
      if (res.ok) setFechasPreventivo(await res.json());
    } catch (_) {}
  }

  async function obtenerLaboratorios() {
    try {
      const res = await fetch(`${API_URL}/dashboard/laboratorios`);
      if (res.ok) {
        const data = await res.json();
        setLaboratorios(data);
        if (data.length > 0) setLabSeleccionado(String(data[0].id_laboratorio));
      }
    } catch (_) {}
  }

  async function obtenerDatosDashboard() {
    try {
      setCargando(true);
      const [dataEquipos, dataMant, dataUso, dataNotificaciones] = await Promise.all([
        dashboardAPI.obtenerEquipos(),
        dashboardAPI.obtenerCostosMantenimientos(),
        dashboardAPI.obtenerPrestamosActivos(),
        dashboardAPI.obtenerNotificaciones(),
      ]);

      const totalEquipos       = dataEquipos.length;
      const mantenimientoActivo = dataEquipos.filter(e => e.estatus === 'En Mantenimiento').length;
      const prestados           = dataUso.length;
      const opexReposiciones    = dataEquipos.reduce((sum, item) => sum + (Number(item.costo) || 0), 0);
      const opexMantenimientos  = dataMant.reduce((sum, item) => sum + (Number(item.costo) || 0), 0);
      const opexTotal           = opexReposiciones + opexMantenimientos;

      const alertasDinamicas = dataEquipos
        .filter(e => e.mantenimiento_urgente || (e.horas_acumuladas || 0) >= (e.limite_horas || 8))
        .map(e => ({
          id: `din-${e.clave_activo}`,
          clave_activo: e.clave_activo,
          mensaje: e.mantenimiento_urgente
            ? 'Requiere mantenimiento urgente.'
            : `Límite operativo de ${e.limite_horas} horas alcanzado.`,
          tipo:    e.mantenimiento_urgente ? 'Critico' : 'Advertencia',
          fecha:   new Date().toISOString(),
          author1: { nombre: 'Sistema' },
          leida:   leidasLocales.includes(`din-${e.clave_activo}`),
        }));

      setMetricas({ totalEquipos, mantenimientoActivo, prestados, opexMantenimientos, opexReposiciones, opexTotal });
      setActividadReciente(dataEquipos.slice(0, 5));
      setPrestamosActivos(dataUso);

      const todasNotificaciones = [...alertasDinamicas, ...dataNotificaciones];
      todasNotificaciones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      setNotificaciones(todasNotificaciones);

      setDatosGraficaEstatus([
        { name: 'Disponibles',        value: (totalEquipos - mantenimientoActivo) - prestados },
        { name: 'En Mantenimiento',   value: mantenimientoActivo },
        { name: 'En Uso (Prestados)', value: prestados },
      ]);

      const conteoLabs = {};
      dataEquipos.forEach(equipo => {
        const nombreLab = equipo.laboratorios?.nombre || 'Sin asignar';
        conteoLabs[nombreLab] = (conteoLabs[nombreLab] || 0) + 1;
      });
      setDatosGraficaLabs(Object.keys(conteoLabs).map(llave => ({ nombre: llave, Cantidad: conteoLabs[llave] })));
    } catch (error) {
      console.error('Error en la carga de métricas operativas:', error.message);
    } finally {
      setCargando(false);
    }
  }

  async function handleExportarLaboratorio() {
    if (!labSeleccionado) { setErrorReporte('Selecciona un laboratorio.'); return; }
    setExportandoLab(true);
    setErrorReporte(null);
    try {
      const res = await fetch(`${API_URL}/dashboard/reporte-laboratorio/${labSeleccionado}?periodo=${periodoReporte}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al obtener datos del laboratorio.');
      }
      const datos = await res.json();
      await generarReporteLaboratorio(datos);
    } catch (err) {
      console.error('Reporte lab error:', err);
      setErrorReporte(err.message || 'Error al generar el reporte.');
    } finally {
      setExportandoLab(false);
    }
  }

  const procesarClicNotificacion = async (notif) => {
    if (!notif.leida) {
      setNotificaciones(prev => prev.map(n => n.id === notif.id ? { ...n, leida: true } : n));
      if (String(notif.id).startsWith('din-')) {
        setLeidasLocales(prev => [...prev, notif.id]);
      } else {
        try { await dashboardAPI.marcarNotificacionLeida(notif.id); } catch (_) {}
      }
    }
    setMostrarMenuNotificaciones(false);
    navigate('/mantenimiento', { state: { autoCompletarClave: notif.clave_activo } });
  };

  const marcarTodasComoLeidas = async () => {
    try {
      const idsDinamicas = notificaciones
        .filter(n => !n.leida && String(n.id).startsWith('din-'))
        .map(n => n.id);
      if (idsDinamicas.length > 0) setLeidasLocales(prev => [...prev, ...idsDinamicas]);
      await dashboardAPI.marcarTodasLeidas();
      obtenerDatosDashboard();
    } catch (_) {}
  };

  const formatoMoneda  = (c) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(c);
  const formatearFecha = (iso) => new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  const notificacionesPendientes = notificaciones.filter(n => !n.leida).length;

  const PERIODOS = [
    { key: 'dia',      label: 'Día' },
    { key: 'semana',   label: 'Semana' },
    { key: 'mes',      label: 'Mes' },
    { key: 'semestre', label: 'Semestre' },
  ];

  return (
    <div className="dashboard-container">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Inicio</h1>
          <p>Análisis de gastos de operación y estatus de la red</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

          {/* Calendar */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => { setMostrarCalendario(!mostrarCalendario); setMostrarMenuNotificaciones(false); }}
              title="Calendario preventivo"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px', position: 'relative' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2c3e50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {fechasPreventivo.length > 0 && <span style={{ position: 'absolute', top: '2px', right: '2px', width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#e67e22' }} />}
            </button>
            {mostrarCalendario && <CalendarioPanel fechas={fechasPreventivo} onClose={() => setMostrarCalendario(false)} />}
          </div>

          {/* Notifications */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => { setMostrarMenuNotificaciones(!mostrarMenuNotificaciones); setMostrarCalendario(false); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', padding: '5px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2c3e50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {notificacionesPendientes > 0 && (
                <span style={{ position: 'absolute', top: '0px', right: '0px', backgroundColor: '#e74c3c', color: 'white', borderRadius: '50%', minWidth: '16px', height: '16px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {notificacionesPendientes}
                </span>
              )}
            </button>
            {mostrarMenuNotificaciones && (
              <div style={{ position: 'absolute', right: 0, top: '40px', width: '380px', backgroundColor: '#ffffff', border: '1px solid #e0e0e0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000, overflow: 'hidden' }}>
                <div style={{ padding: '12px 15px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '14px', color: '#2c3e50' }}>Centro de Notificaciones</strong>
                  {notificacionesPendientes > 0 && <button onClick={marcarTodasComoLeidas} style={{ background: 'none', border: 'none', color: '#3498db', fontSize: '12px', cursor: 'pointer', padding: 0 }}>Marcar todo leído</button>}
                </div>
                <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  {notificaciones.length === 0
                    ? <div style={{ padding: '20px', textAlign: 'center', color: '#7f8c8d', fontSize: '13px' }}>Bandeja vacía</div>
                    : notificaciones.map((notif, index) => (
                      <div key={notif.id || index} onClick={() => procesarClicNotificacion(notif)}
                        style={{ padding: '12px 15px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', backgroundColor: notif.leida ? '#ffffff' : '#f4f6f7', transition: 'background-color 0.2s ease' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <strong style={{ fontSize: '13px', color: notif.tipo === 'Critico' ? '#e74c3c' : '#2c3e50', fontWeight: notif.leida ? 'normal' : 'bold' }}>{notif.clave_activo}</strong>
                          <span style={{ fontSize: '10px', backgroundColor: notif.tipo === 'Critico' ? '#fadbd8' : '#fcf3cf', color: notif.tipo === 'Critico' ? '#c0392b' : '#d35400', padding: '2px 6px', borderRadius: '4px' }}>{notif.tipo}</span>
                        </div>
                        <span style={{ fontSize: '13px', color: '#34495e' }}>{notif.mensaje}</span>
                        <span style={{ fontSize: '11px', color: '#95a5a6', marginTop: '4px', display: 'block' }}>{notif.author1?.nombre || 'Sistema'} • {formatearFecha(notif.fecha)}</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── KPIs ────────────────────────────────────────────────────────────── */}
      <section className="kpi-grid">
        <div className="kpi-card">
          <h3>Volumen de Activos</h3>
          <p className="kpi-number">{cargando ? '...' : metricas.totalEquipos}</p>
          <span className="kpi-status ok">Operación General</span>
        </div>
        <div className="kpi-card">
          <h3>Asignaciones Temporales</h3>
          <p className="kpi-number" style={{ color: '#3498db' }}>{cargando ? '...' : metricas.prestados}</p>
          <span className="kpi-status info">Préstamos en curso</span>
        </div>
        <div className="kpi-card">
          <h3>Soporte Técnico</h3>
          <p className="kpi-number warning-text">{cargando ? '...' : metricas.mantenimientoActivo}</p>
          <span className="kpi-status warning">Equipos en revisión</span>
        </div>
        <div className="kpi-card" style={{ borderTop: '4px solid #27ae60', minWidth: '280px' }}>
          <h3>OpEx Acumulado</h3>
          <p className="kpi-number" style={{ color: '#27ae60', fontSize: '28px' }}>{cargando ? '...' : formatoMoneda(metricas.opexTotal)}</p>
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#7f8c8d' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Reposiciones/Equipos:</span><strong>{formatoMoneda(metricas.opexReposiciones)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
              <span>Servicios/Mantenimientos:</span><strong>{formatoMoneda(metricas.opexMantenimientos)}</strong>
            </div>
          </div>
        </div>
      </section>

      {/* ── Charts ──────────────────────────────────────────────────────────── */}
      <section className="charts-grid">
        <div className="chart-card">
          <h2>Distribución Operativa</h2>
          <div className="chart-wrapper">
            {cargando ? <p>Procesando métricas...</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={datosGraficaEstatus} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                    {datosGraficaEstatus.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORES_ESTATUS[index % COLORES_ESTATUS.length]} />)}
                  </Pie>
                  <Tooltip /><Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        <div className="chart-card">
          <h2>Concentración por Sector</h2>
          <div className="chart-wrapper">
            {cargando ? <p>Procesando métricas...</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datosGraficaLabs} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip cursor={{ fill: '#f4f7f6' }} />
                  <Bar dataKey="Cantidad" fill="#2c3e50" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      {/* ── Bottom tables ────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <section className="recent-activity">
          <h2>Registro de Asignaciones Temporales</h2>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th>Identificador de Activo</th><th>Sector de Origen</th><th>Responsable Actual</th></tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px' }}>Sincronizando información...</td></tr>
                ) : prestamosActivos.length === 0 ? (
                  <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px' }}>Operación estable. Sin asignaciones pendientes.</td></tr>
                ) : (
                  prestamosActivos.map(uso => (
                    <tr key={uso.id_uso}>
                      <td><strong>{uso.clave_activo}</strong><br /><small>{uso.equipos?.marca}</small></td>
                      <td>{uso.equipos?.laboratorios?.nombre || 'N/D'}</td>
                      <td>{uso.usuario_nombre}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="recent-activity">
          <h2>Auditoría de Registros Recientes</h2>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th>Identificador de Activo</th><th>Sector Asignado</th><th>Estado del Sistema</th></tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px' }}>Sincronizando información...</td></tr>
                ) : actividadReciente.length === 0 ? (
                  <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px' }}>Sin registros documentados.</td></tr>
                ) : (
                  actividadReciente.map(item => (
                    <tr key={item.clave_activo}>
                      <td><strong>{item.clave_activo}</strong><br /><small>{item.marca}</small></td>
                      <td>{item.laboratorios?.nombre || 'Sin asignación formal'}</td>
                      <td><span className={`badge ${item.estatus === 'Activo' ? 'ok' : 'warning'}`}>{item.estatus}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* ── Reporte de Laboratorio ───────────────────────────────────────────── */}
      <section style={{ marginTop: '10px' }}>
        {/* Section header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '18px', color: '#2c3e50', marginBottom: '3px' }}>Reporte de Laboratorio</h2>
            <p style={{ fontSize: '13px', color: '#7f8c8d', margin: 0 }}>
              Genera un PDF completo con inventario, mantenimientos, préstamos y preventivo del laboratorio seleccionado.
            </p>
          </div>
        </div>

        {/* Controls card */}
        <div className="kpi-card" style={{ padding: '20px 24px' }}>
          {/* Row 1: lab dropdown + export button */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '16px' }}>
            <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
              <label>Laboratorio</label>
              <select
                className="select-filter"
                style={{ width: '100%', minWidth: 'unset' }}
                value={labSeleccionado}
                onChange={e => setLabSeleccionado(e.target.value)}
              >
                {laboratorios.length === 0
                  ? <option value="">Cargando...</option>
                  : laboratorios.map(lab => (
                    <option key={lab.id_laboratorio} value={lab.id_laboratorio}>
                      {lab.nombre}{lab.departamentos?.nombre ? ` — ${lab.departamentos.nombre}` : ''}
                    </option>
                  ))
                }
              </select>
            </div>

            <button
              onClick={handleExportarLaboratorio}
              disabled={exportandoLab || !labSeleccionado}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 20px', borderRadius: '6px',
                cursor: (exportandoLab || !labSeleccionado) ? 'not-allowed' : 'pointer',
                fontSize: '14px', fontWeight: '600',
                backgroundColor: (exportandoLab || !labSeleccionado) ? '#bdc3c7' : '#3498db',
                color: 'white', border: 'none',
                transition: 'background-color 0.2s ease',
                flexShrink: 0, height: '41px',
              }}
              onMouseEnter={e => { if (!exportandoLab && labSeleccionado) e.currentTarget.style.backgroundColor = '#2980b9'; }}
              onMouseLeave={e => { if (!exportandoLab && labSeleccionado) e.currentTarget.style.backgroundColor = '#3498db'; }}
            >
              {exportandoLab ? (
                <>
                  <span style={{ display: 'inline-block', width: '13px', height: '13px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Generando…
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Exportar PDF
                </>
              )}
            </button>
          </div>

          {/* Row 2: period selector */}
          <div>
            <p style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '8px', fontWeight: '600' }}>PERÍODO DEL REPORTE</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {PERIODOS.map(p => {
                const selected = periodoReporte === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPeriodoReporte(p.key)}
                    style={{
                      padding: '7px 20px', borderRadius: '20px',
                      border: `2px solid ${selected ? '#3498db' : '#bdc3c7'}`,
                      backgroundColor: selected ? '#3498db' : 'transparent',
                      color: selected ? 'white' : '#7f8c8d',
                      fontSize: '13px', fontWeight: selected ? '700' : '400',
                      cursor: 'pointer', transition: 'all 0.15s ease',
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error message */}
          {errorReporte && (
            <div style={{ marginTop: '12px', backgroundColor: '#fceceb', color: '#e74c3c', padding: '10px 14px', borderRadius: '6px', fontSize: '13px' }}>
              {errorReporte}
            </div>
          )}
        </div>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </section>

    </div>
  );
}

export default Dashboard;