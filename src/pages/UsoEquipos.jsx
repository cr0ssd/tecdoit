import React, { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { usoEquiposAPI, equiposAPI } from '../services/api';

import EquipoPicker from '../components/EquipoPicker';
import { useOrdenamiento } from '../hooks/useOrdenamiento';
import Th from '../components/Th';



// ─── Carrera helpers ──────────────────────────────────────────────────────────
// Quick-select options shown as pill buttons
const CARRERAS_RAPIDAS = ['PREPA','EXTERNO'];

// Regex mirrors backend: exactly 3 uppercase letters OR "PREPA"
const CARRERA_REGEX = /^([A-Z]{3}|EXTERNO|PREPA)$/;

function normalizarCarrera(raw) {
  return raw ? raw.trim().toUpperCase() : '';
}

function carreraValida(val) {
  return CARRERA_REGEX.test(normalizarCarrera(val));
}

// ── PDF: Reporte del Día ───────────────────────────────────────────────────────
async function generarReporteDia(registros) {
  const { jsPDF }       = await import('jspdf');
  const { applyPlugin } = await import('jspdf-autotable');
  applyPlugin(jsPDF);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const PW  = doc.internal.pageSize.getWidth();   // 297
  const PH  = doc.internal.pageSize.getHeight();  // 210

  // ── Palette ────────────────────────────────────────────────────────────────
  const DARK   = [26,  37,  47];
  const BLUE   = [52,  152, 219];
  const LIGHT  = [244, 247, 246];
  const MUTED  = [127, 140, 141];
  const TEXT   = [44,  62,  80];
  const WHITE  = [255, 255, 255];
  const BORDER = [236, 240, 241];
  const C_OK   = [39,  174, 96];
  const C_WARN = [243, 156, 18];

  // ── Date helpers ───────────────────────────────────────────────────────────
  const hoy = new Date();
  const hoyStr = hoy.toLocaleDateString('es-MX', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    timeZone: 'America/Mexico_City',
  });
  const hoyISO = hoy.toLocaleDateString('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    timeZone: 'America/Mexico_City',
  });

  const fmtTime = (iso) => {
    if (!iso) return '—';
    const d = iso.includes('Z') ? iso : `${iso}Z`;
    return new Date(d).toLocaleString('es-MX', {
      timeZone: 'America/Mexico_City',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  };
  const fmtFull = (iso) => {
    if (!iso) return '—';
    const d = iso.includes('Z') ? iso : `${iso}Z`;
    return new Date(d).toLocaleString('es-MX', {
      timeZone: 'America/Mexico_City',
      day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  };

  // Duration helper
  const duracion = (inicio, fin) => {
    if (!inicio) return '—';
    const start = new Date(inicio.includes('Z') ? inicio : `${inicio}Z`);
    const end   = fin ? new Date(fin.includes('Z') ? fin : `${fin}Z`) : new Date();
    const mins  = Math.round((end - start) / 60000);
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60), m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  // Filter to today's records (Mexico City timezone)
  const registrosHoy = registros.filter(r => {
    if (!r.hora_inicio) return false;
    const d  = r.hora_inicio.includes('Z') ? r.hora_inicio : `${r.hora_inicio}Z`;
    const tz = new Date(d).toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' });
    const hoyTz = new Date().toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' });
    return tz === hoyTz;
  });

  const enUso     = registrosHoy.filter(r => r.estatus === 'En uso').length;
  const finalizados = registrosHoy.filter(r => r.estatus !== 'En uso').length;

  // Unique equipos and labs used today
  const equiposSet = new Set(registrosHoy.map(r => r.clave_activo));
  const labsSet    = new Set(
    registrosHoy
      .map(r => r.equipos?.laboratorios?.nombre)
      .filter(Boolean)
  );

  // ── Reusable draw helpers ──────────────────────────────────────────────────
  function drawHeader() {
    // Dark band
    doc.setFillColor(...DARK);
    doc.rect(0, 0, PW, 20, 'F');
    // Blue accent line
    doc.setFillColor(...BLUE);
    doc.rect(0, 20, PW, 0.8, 'F');
    // Left diagonal accent
    doc.setFillColor(...BLUE);
    doc.triangle(0, 0, 28, 0, 0, 20, 'F');
    // Logo
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...WHITE);
    doc.text('tecdoit', 4, 13);
    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...BLUE);
    doc.text('REPORTE DEL DÍA', 32, 9);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(180, 195, 199);
    doc.text('Registro de Préstamos y Uso de Equipos', 32, 15);
    // Date right-aligned
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...WHITE);
    doc.text(hoyStr.charAt(0).toUpperCase() + hoyStr.slice(1), PW - 10, 10, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(180, 195, 199);
    doc.text(
      `Generado: ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit', hour12: true })}`,
      PW - 10, 16, { align: 'right' }
    );
  }

  function drawFooter(pageNum, totalPages) {
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.line(10, PH - 10, PW - 10, PH - 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text('tecdoit — Sistema Integral de Gestión de Laboratorios', 10, PH - 6);
    doc.text(`Página ${pageNum} de ${totalPages}`, PW / 2, PH - 6, { align: 'center' });
    doc.text(`Documento confidencial · ${hoyISO}`, PW - 10, PH - 6, { align: 'right' });
  }

  // ── PAGE 1 ─────────────────────────────────────────────────────────────────
  drawHeader();

  // ── KPI row ────────────────────────────────────────────────────────────────
  const kpiY = 26;
  const kpis = [
    { label: 'Préstamos del día',  value: String(registrosHoy.length),    color: BLUE  },
    { label: 'En uso ahora',       value: String(enUso),                  color: C_WARN },
    { label: 'Finalizados',        value: String(finalizados),            color: C_OK  },
    { label: 'Equipos distintos',  value: String(equiposSet.size),        color: [142, 68, 173] },
    { label: 'Laboratorios',       value: String(labsSet.size),           color: [41, 128, 185] },
  ];
  const kpiW = (PW - 20 - (kpis.length - 1) * 3) / kpis.length;

  kpis.forEach((k, i) => {
    const kx = 10 + i * (kpiW + 3);
    doc.setFillColor(...WHITE);
    doc.roundedRect(kx, kpiY, kpiW, 16, 1.5, 1.5, 'F');
    doc.setFillColor(...k.color);
    doc.roundedRect(kx, kpiY, kpiW, 2, 1, 1, 'F');
    doc.setDrawColor(...k.color);
    doc.setLineWidth(0.3);
    doc.roundedRect(kx, kpiY, kpiW, 16, 1.5, 1.5, 'S');
    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...k.color);
    doc.text(k.value, kx + kpiW / 2, kpiY + 10, { align: 'center' });
    // Label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(...MUTED);
    doc.text(k.label.toUpperCase(), kx + kpiW / 2, kpiY + 14.5, { align: 'center' });
  });

  // ── No records case ────────────────────────────────────────────────────────
  if (registrosHoy.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text('No se registraron préstamos el día de hoy.', PW / 2, 80, { align: 'center' });
    drawFooter(1, 1);
    doc.save(`reporte_dia_${hoyISO.replace(/\//g, '-')}.pdf`);
    return;
  }

  // ── Main table ─────────────────────────────────────────────────────────────
  const tableY = kpiY + 22;

  // Section label
  doc.setFillColor(...DARK);
  doc.roundedRect(10, tableY, PW - 20, 7, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...BLUE);
  doc.text('▪', 14, tableY + 4.8);
  doc.setTextColor(...WHITE);
  doc.text('BITÁCORA COMPLETA DEL DÍA', 20, tableY + 4.8);

  doc.autoTable({
    startY: tableY + 10,
    margin: { left: 10, right: 10 },
    tableWidth: PW - 20,
    head: [[
      { content: 'Equipo',        styles: { cellWidth: 30 } },
      { content: 'Marca / Modelo',styles: { cellWidth: 38 } },
      { content: 'Laboratorio',   styles: { cellWidth: 38 } },
      { content: 'Usuario',       styles: { cellWidth: 40 } },
      { content: 'Carrera',       styles: { halign: 'center', cellWidth: 18 } },
      { content: 'Propósito',     styles: { cellWidth: 42 } },
      { content: 'Inicio',        styles: { halign: 'center', cellWidth: 22 } },
      { content: 'Fin',           styles: { halign: 'center', cellWidth: 22 } },
      { content: 'Duración',      styles: { halign: 'center', cellWidth: 20 } },
      { content: 'Estatus',       styles: { halign: 'center', cellWidth: 20 } },
    ]],
    body: registrosHoy.map(r => {
      const isEnUso = r.estatus === 'En uso';
      return [
        { content: r.clave_activo || '—', styles: { fontStyle: 'bold', fontSize: 7.5 } },
        { content: [r.equipos?.marca, r.equipos?.modelo].filter(Boolean).join(' ') || '—', styles: { fontSize: 7 } },
        { content: r.equipos?.laboratorios?.nombre || '—', styles: { fontSize: 7 } },
        { content: r.usuario_nombre || '—', styles: { fontSize: 7.5, fontStyle: 'bold' } },
        {
          content: r.carrera || '—',
          styles: {
            halign: 'center', fontSize: 7, fontStyle: 'bold',
            textColor: [41, 128, 185],
          },
        },
        { content: r.proposito || '—', styles: { fontSize: 6.5, textColor: MUTED } },
        { content: fmtTime(r.hora_inicio), styles: { halign: 'center', fontSize: 7 } },
        { content: fmtTime(r.hora_fin),    styles: { halign: 'center', fontSize: 7, textColor: isEnUso ? C_WARN : MUTED } },
        { content: duracion(r.hora_inicio, r.hora_fin), styles: { halign: 'center', fontSize: 7 } },
        {
          content: r.estatus,
          styles: {
            halign: 'center', fontSize: 6.5, fontStyle: 'bold',
            textColor: isEnUso ? C_WARN : C_OK,
          },
        },
      ];
    }),
    headStyles: {
      fillColor: DARK,
      textColor: WHITE,
      fontSize:  7,
      fontStyle: 'bold',
      cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
    },
    bodyStyles: {
      cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
      lineColor:   BORDER,
      lineWidth:   0.2,
      fontSize:    7,
    },
    alternateRowStyles: { fillColor: LIGHT },
    // Draw header + footer on every new page generated by autoTable
    didDrawPage: (data) => {
      if (data.pageNumber > 1) drawHeader();
      // Footer stamped in post-pass below
    },
  });

  // ── Page 2: Per-equipment breakdown (if more than 4 unique machines) ───────
  if (equiposSet.size > 0) {
    doc.addPage();
    drawHeader();

    let curY = 26;

    // Section heading
    doc.setFillColor(...DARK);
    doc.roundedRect(10, curY, PW - 20, 7, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...BLUE);
    doc.text('▪', 14, curY + 4.8);
    doc.setTextColor(...WHITE);
    doc.text('RESUMEN POR EQUIPO', 20, curY + 4.8);
    curY += 12;

    // Group registros by clave_activo
    const porEquipo = {};
    registrosHoy.forEach(r => {
      if (!porEquipo[r.clave_activo]) porEquipo[r.clave_activo] = [];
      porEquipo[r.clave_activo].push(r);
    });

    const equipoRows = Object.entries(porEquipo).map(([clave, regs]) => {
      const first     = regs[0];
      const totalMins = regs.reduce((sum, r) => {
        if (!r.hora_inicio) return sum;
        const start = new Date(r.hora_inicio.includes('Z') ? r.hora_inicio : `${r.hora_inicio}Z`);
        const end   = r.hora_fin
          ? new Date(r.hora_fin.includes('Z') ? r.hora_fin : `${r.hora_fin}Z`)
          : new Date();
        return sum + Math.max(0, Math.round((end - start) / 60000));
      }, 0);
      const hh = Math.floor(totalMins / 60), mm = totalMins % 60;
      const totalStr = totalMins < 60 ? `${totalMins} min` : mm > 0 ? `${hh}h ${mm}m` : `${hh}h`;

      const usuarios = [...new Set(regs.map(r => r.usuario_nombre))].join(', ');
      const activo   = regs.some(r => r.estatus === 'En uso');

      return [
        { content: clave, styles: { fontStyle: 'bold', fontSize: 7.5 } },
        { content: [first.equipos?.marca, first.equipos?.modelo].filter(Boolean).join(' ') || '—', styles: { fontSize: 7 } },
        { content: first.equipos?.laboratorios?.nombre || '—', styles: { fontSize: 7 } },
        { content: String(regs.length), styles: { halign: 'center', fontStyle: 'bold', fontSize: 8 } },
        { content: totalStr, styles: { halign: 'center', fontSize: 7 } },
        {
          content: usuarios.length > 50 ? usuarios.slice(0, 48) + '…' : usuarios,
          styles: { fontSize: 6.5, textColor: MUTED },
        },
        {
          content: activo ? 'En uso' : 'Libre',
          styles: { halign: 'center', fontSize: 7, fontStyle: 'bold', textColor: activo ? C_WARN : C_OK },
        },
      ];
    });

    doc.autoTable({
      startY: curY,
      margin: { left: 10, right: 10 },
      tableWidth: PW - 20,
      head: [[
        { content: 'Clave Activo',   styles: { cellWidth: 32 } },
        { content: 'Marca / Modelo', styles: { cellWidth: 42 } },
        { content: 'Laboratorio',    styles: { cellWidth: 48 } },
        { content: 'Sesiones',       styles: { halign: 'center', cellWidth: 20 } },
        { content: 'Tiempo total',   styles: { halign: 'center', cellWidth: 25 } },
        { content: 'Usuarios del día', styles: { cellWidth: 'auto' } },
        { content: 'Estado actual',  styles: { halign: 'center', cellWidth: 24 } },
      ]],
      body: equipoRows,
      headStyles: { fillColor: DARK, textColor: WHITE, fontSize: 7, fontStyle: 'bold', cellPadding: 3 },
      bodyStyles: { cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 }, lineColor: BORDER, lineWidth: 0.2 },
      alternateRowStyles: { fillColor: LIGHT },
      didDrawPage: (data) => { if (data.pageNumber > 1) drawHeader(); },
    });

    curY = doc.lastAutoTable.finalY + 10;

    // ── Carrera breakdown mini-table ──────────────────────────────────────────
    if (curY + 40 > PH - 14) { doc.addPage(); drawHeader(); curY = 26; }

    doc.setFillColor(...DARK);
    doc.roundedRect(10, curY, PW - 20, 7, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...BLUE);
    doc.text('▪', 14, curY + 4.8);
    doc.setTextColor(...WHITE);
    doc.text('DISTRIBUCIÓN POR CARRERA', 20, curY + 4.8);
    curY += 12;

    const porCarrera = {};
    registrosHoy.forEach(r => {
      const key = r.carrera || 'Sin carrera';
      porCarrera[key] = (porCarrera[key] || 0) + 1;
    });
    const carreraRows = Object.entries(porCarrera)
      .sort((a, b) => b[1] - a[1])
      .map(([carrera, count]) => [
        { content: carrera, styles: { fontStyle: 'bold', fontSize: 8, textColor: [41, 128, 185] } },
        { content: String(count), styles: { halign: 'center', fontStyle: 'bold', fontSize: 9 } },
        {
          content: `${Math.round((count / registrosHoy.length) * 100)}%`,
          styles: { halign: 'center', fontSize: 7.5, textColor: MUTED },
        },
      ]);

    doc.autoTable({
      startY: curY,
      margin: { left: 10, right: 10 },
      tableWidth: 100,   // compact — left side only
      head: [[
        { content: 'Carrera',    styles: { cellWidth: 40 } },
        { content: 'Sesiones',   styles: { halign: 'center', cellWidth: 30 } },
        { content: '% del día',  styles: { halign: 'center', cellWidth: 30 } },
      ]],
      body: carreraRows,
      headStyles: { fillColor: DARK, textColor: WHITE, fontSize: 7, fontStyle: 'bold', cellPadding: 3 },
      bodyStyles: { cellPadding: 3.5, lineColor: BORDER, lineWidth: 0.2 },
      alternateRowStyles: { fillColor: LIGHT },
    });
  }

  // ── Stamp page numbers on all pages ───────────────────────────────────────
  const totalPages = doc.internal.pages.length - 1;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(p, totalPages);
  }

  const filename = `reporte_dia_${hoyISO.replace(/\//g, '-')}.pdf`;
  doc.save(filename);
}

// ── Component ──────────────────────────────────────────────────────────────────
function UsoEquipos() {
  const [registros,      setRegistros]      = useState([]);
  const [cargando,       setCargando]       = useState(true);
  const [error,          setError]          = useState(null);
  const [mensajeExito,   setMensajeExito]   = useState(null);
  const [mostrarCamara,  setMostrarCamara]  = useState(false);
  const [exportando,     setExportando]     = useState(false);
  const [equipos, setEquipos] = useState([]);

  const [mostrarCamara, setMostrarCamara] = useState(false);
  const [nuevoUso, setNuevoUso] = useState({
    clave_activo:   '',
    usuario_nombre: '',
    proposito:      '',
    carrera:        '',
  });
  const [carreraCustom, setCarreraCustom] = useState(false);
  const [carreraError,  setCarreraError]  = useState(null);

  useEffect(() => {
    obtenerRegistros();
    cargarEquipos();
  }, []);

  async function obtenerRegistros() {
    setCargando(true);
    try {
      const data = await usoEquiposAPI.obtenerRegistros();
      setRegistros(data);
    } catch (err) {
      console.error('Error al cargar registros:', err.message);
      setError('No se pudo cargar la bitácora. Verifica que el backend esté corriendo.');
    } finally {
      setCargando(false);
    }
  }

  async function cargarEquipos() {
    try {
      const data = await equiposAPI.obtenerTodos();
      setEquipos(data);
    } catch (err) {
      console.error('Error al cargar equipos:', err.message);
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNuevoUso(prev => ({ ...prev, [name]: value }));
    if (name === 'carrera') setCarreraError(null);
  };

  const seleccionarCarrera = (valor) => {
    setNuevoUso(prev => ({ ...prev, carrera: valor }));
    setCarreraCustom(false);
    setCarreraError(null);
  };

  const activarCarreraCustom = () => {
    setNuevoUso(prev => ({ ...prev, carrera: '' }));
    setCarreraCustom(true);
    setCarreraError(null);
  };

  const handleQRScan = (resultado) => {
    if (!resultado) return;
    let textoDetectado = '';
    if (Array.isArray(resultado) && resultado.length > 0) {
      textoDetectado = resultado[0].rawValue;
    } else if (typeof resultado === 'string') {
      textoDetectado = resultado;
    }
    if (textoDetectado) {
      setNuevoUso(prev => ({ ...prev, clave_activo: textoDetectado }));
      setMostrarCamara(false);
      setMensajeExito(`Código escaneado: ${textoDetectado}`);
      setTimeout(() => setMensajeExito(null), 3000);
    }
  };

  const iniciarUso = async (e) => {
    e.preventDefault();
    setError(null);
    setMensajeExito(null);
    setCarreraError(null);
    const carreraFinal = normalizarCarrera(nuevoUso.carrera);
    if (!carreraFinal) { setCarreraError('Selecciona o ingresa una carrera.'); return; }
    if (!carreraValida(carreraFinal)) { setCarreraError('Debe ser 3 letras (Ej: ITC) o "Prepa".'); return; }
    try {
      await usoEquiposAPI.iniciarUso({
        clave_activo:   nuevoUso.clave_activo,
        usuario_nombre: nuevoUso.usuario_nombre,
        proposito:      nuevoUso.proposito,
        carrera:        carreraFinal,
      });
      setMensajeExito('Sesión de uso iniciada correctamente.');
      setNuevoUso({ clave_activo: '', usuario_nombre: '', proposito: '', carrera: '' });
      setCarreraCustom(false);
      obtenerRegistros();
    } catch (err) {
      setError(err.message);
    }
  };

  const finalizarUso = async (id_uso) => {
    setError(null);
    try {
      await usoEquiposAPI.finalizarUso(id_uso);
      setMensajeExito('Sesión finalizada. Equipo liberado.');
      obtenerRegistros();
    } catch (err) {
      setError('Error al finalizar: ' + err.message);
    }
  };

  async function handleExportarReporte() {
    setExportando(true);
    try {
      await generarReporteDia(registros);
    } catch (err) {
      console.error('PDF error:', err);
      setError('Error al generar el reporte. Intenta de nuevo.');
    } finally {
      setExportando(false);
    }
  }

  const formatearFecha = (fechaIso) => {
    if (!fechaIso) return '-';
    const fechaUtc = fechaIso.includes('Z') ? fechaIso : `${fechaIso}Z`;
    return new Date(fechaUtc).toLocaleString('es-MX', {
      timeZone: 'America/Mexico_City',
      day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  };

  const { datosOrdenados, orden, ordenarPor } = useOrdenamiento(registros);

  // Count today's loans for the button label
  const registrosHoy = registros.filter(r => {
    if (!r.hora_inicio) return false;
    const d    = r.hora_inicio.includes('Z') ? r.hora_inicio : `${r.hora_inicio}Z`;
    const tz   = new Date(d).toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' });
    const hoyTz = new Date().toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' });
    return tz === hoyTz;
  });

  return (
    <div className="dashboard-container">
      <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Registro de Uso de Equipos</h1>
          <p>Control de bitácora y asignación temporal mediante QR</p>
        </div>
      </header>

      {error && (
        <div style={{ backgroundColor: '#fceceb', color: '#e74c3c', padding: '12px 16px', borderRadius: '6px', fontSize: '14px' }}>
          {error}
        </div>
      )}
      {mensajeExito && (
        <div style={{ backgroundColor: '#eafaf1', color: '#27ae60', padding: '12px 16px', borderRadius: '6px', fontSize: '14px' }}>
          {mensajeExito}
        </div>
      )}

      {/* ── Registration form ──────────────────────────────────────────────── */}
      <section className="kpi-card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={{ fontSize: '16px', color: '#2c3e50' }}>Registrar Nueva Sesión</h2>

          {/* Button row: Reporte del Día + Escanear QR */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>

            {/* Reporte del Día */}
            <button
              type="button"
              onClick={handleExportarReporte}
              disabled={exportando}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '8px 14px', borderRadius: '6px',
                cursor: exportando ? 'not-allowed' : 'pointer',
                fontSize: '13px', fontWeight: '600',
                backgroundColor: exportando ? 'rgba(39,174,96,0.15)' : 'rgba(39,174,96,0.12)',
                color: exportando ? '#7f8c8d' : '#27ae60',
                border: '1px solid rgba(39,174,96,0.35)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => { if (!exportando) e.currentTarget.style.backgroundColor = 'rgba(39,174,96,0.22)'; }}
              onMouseLeave={e => { if (!exportando) e.currentTarget.style.backgroundColor = 'rgba(39,174,96,0.12)'; }}
            >
              {exportando ? (
                <>
                  <span style={{ display: 'inline-block', width: '11px', height: '11px', border: '2px solid #27ae60', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Generando…
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Reporte del Día
                  {registrosHoy.length > 0 && (
                    <span style={{ backgroundColor: '#27ae60', color: 'white', borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: '700', marginLeft: '2px' }}>
                      {registrosHoy.length}
                    </span>
                  )}
                </>
              )}
            </button>

            {/* Escanear QR */}
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setMostrarCamara(!mostrarCamara)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {mostrarCamara ? 'Cerrar Cámara' : 'Escanear QR'}
            </button>
          </div>
        </div>

        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

        {mostrarCamara && (
          <div style={{ maxWidth: '300px', margin: '0 auto 20px auto', border: '2px dashed #3498db', padding: '10px', borderRadius: '8px' }}>
            <p style={{ textAlign: 'center', fontSize: '12px', color: '#7f8c8d', marginBottom: '10px' }}>
              Apunta el código QR a tu cámara
            </p>
            <Scanner
              onScan={(resultado) => handleQRScan(resultado)}
              onResult={(resultado) => handleQRScan(resultado)}
              onError={(error) => console.log(error?.message)}
            />
          </div>
        )}

        <form onSubmit={iniciarUso}>
          {/* Row 1: equipment, user, purpose */}
          <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '15px' }}>
            <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
              <label>Clave del Equipo</label>
              <EquipoPicker
                equipos={equipos}
                value={nuevoUso.clave_activo}
                onChange={val => setNuevoUso(prev => ({ ...prev, clave_activo: val }))}
              />
              <input type="text" name="clave_activo" required value={nuevoUso.clave_activo}
                onChange={handleInputChange} placeholder="Ej. TEC-COMP-001 (Escríbelo o usa la cámara)" />
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
              <label>Nombre del Usuario / Alumno</label>
              <input type="text" name="usuario_nombre" required value={nuevoUso.usuario_nombre}
                onChange={handleInputChange} placeholder="Nombre completo" />
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
              <label>Propósito (Opcional)</label>
              <input type="text" name="proposito" value={nuevoUso.proposito}
                onChange={handleInputChange} placeholder="Ej. Práctica de redes" />
            </div>
          </div>

          {/* Row 2: carrera + submit */}
          <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: '280px', marginBottom: 0 }}>
              <label>
                Carrera <span style={{ color: '#e74c3c', fontWeight: '700' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: carreraCustom ? '8px' : '0' }}>
                {CARRERAS_RAPIDAS.map((opcion) => {
                  const selected = !carreraCustom && nuevoUso.carrera === opcion;
                  return (
                    <button key={opcion} type="button" onClick={() => seleccionarCarrera(opcion)} style={{
                      padding: '6px 14px', borderRadius: '20px',
                      border: `2px solid ${selected ? '#3498db' : '#bdc3c7'}`,
                      backgroundColor: selected ? '#3498db' : 'transparent',
                      color: selected ? 'white' : '#7f8c8d',
                      fontSize: '13px', fontWeight: selected ? '700' : '400',
                      cursor: 'pointer', transition: 'all 0.15s ease',
                    }}>{opcion}</button>
                  );
                })}
                <button type="button" onClick={activarCarreraCustom} style={{
                  padding: '6px 14px', borderRadius: '20px',
                  border: `2px solid ${carreraCustom ? '#3498db' : '#bdc3c7'}`,
                  backgroundColor: carreraCustom ? '#eaf4fb' : 'transparent',
                  color: carreraCustom ? '#2980b9' : '#7f8c8d',
                  fontSize: '13px', fontWeight: carreraCustom ? '700' : '400',
                  cursor: 'pointer', transition: 'all 0.15s ease',
                }}>Profesional…</button>
              </div>
              {carreraCustom && (
                <input type="text" name="carrera" value={nuevoUso.carrera} onChange={handleInputChange}
                  placeholder="3 letras, Ej: LIN, ARQ…" maxLength={5} autoFocus
                  style={{
                    padding: '8px 10px',
                    border: `1px solid ${carreraError ? '#e74c3c' : '#bdc3c7'}`,
                    borderRadius: '6px', fontSize: '14px', width: '160px', outline: 'none',
                    textTransform: 'uppercase', letterSpacing: '1px',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#3498db')}
                  onBlur={e => (e.target.style.borderColor = carreraError ? '#e74c3c' : '#bdc3c7')}
                />
              )}
              {carreraError
                ? <span style={{ fontSize: '12px', color: '#e74c3c', marginTop: '4px', display: 'block' }}>{carreraError}</span>
                : <span style={{ fontSize: '11px', color: '#bdc3c7', marginTop: '4px', display: 'block' }}>Elige una opción o escribe 3 letras / "Prepa"</span>
              }
            </div>
            <button type="submit" className="btn-primary" style={{ height: '41px', flexShrink: 0 }}>
              Iniciar Uso
            </button>
          </div>
        </form>
      </section>

      {/* ── Bitácora table ────────────────────────────────────────────────── */}
      <section className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <Th col="equipo" get={r => r.clave_activo} orden={orden} ordenarPor={ordenarPor}>Equipo</Th>
              <Th col="usuario" get={r => r.usuario_nombre || ''} orden={orden} ordenarPor={ordenarPor}>Usuario</Th>
              <Th col="carrera" get={r => r.carrera || ''} orden={orden} ordenarPor={ordenarPor}>Carrera</Th>
              <Th col="inicio" get={r => r.hora_inicio ? new Date(r.hora_inicio).getTime() : null} orden={orden} ordenarPor={ordenarPor}>Inicio</Th>
              <Th col="fin" get={r => r.hora_fin ? new Date(r.hora_fin).getTime() : null} orden={orden} ordenarPor={ordenarPor}>Fin</Th>
              <Th col="estatus" get={r => r.hora_fin ? 1 : 0} orden={orden} ordenarPor={ordenarPor}>Estatus</Th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>Procesando información...</td></tr>
            ) : registros.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>No se localizaron registros bajo los criterios especificados.</td></tr>
            ) : (
              datosOrdenados.map((reg) => (
                <tr key={reg.id_uso}>
                  <td>
                    <strong>{reg.clave_activo}</strong><br />
                    <small>{reg.equipos?.marca} {reg.equipos?.modelo}</small>
                  </td>
                  <td>
                    {reg.usuario_nombre}<br />
                    <small style={{ color: '#7f8c8d' }}>{reg.proposito}</small>
                  </td>
                  <td>
                    {reg.carrera ? (
                      <span style={{ padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: '700', backgroundColor: '#e8f4fd', color: '#2980b9', letterSpacing: '0.5px' }}>
                        {reg.carrera}
                      </span>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#bdc3c7' }}>—</span>
                    )}
                  </td>
                  <td>{formatearFecha(reg.hora_inicio)}</td>
                  <td>{formatearFecha(reg.hora_fin)}</td>
                  <td>
                    <span className={`badge ${reg.estatus === 'En uso' ? 'warning' : 'ok'}`}>
                      {reg.estatus}
                    </span>
                  </td>
                  <td>
                    {reg.estatus === 'En uso' ? (
                      <button className="btn-icon" style={{ borderColor: '#e74c3c', color: '#e74c3c' }} onClick={() => finalizarUso(reg.id_uso)}>
                        Finalizar
                      </button>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#7f8c8d' }}>Completado</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default UsoEquipos;