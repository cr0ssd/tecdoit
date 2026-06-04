import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { mantenimientosAPI, proveedoresAPI, equiposAPI, inventarioAPI } from '../services/api';

const API_URL = import.meta.env.VITE_API_URL;

// ── Shared prioridad components ───────────────────────────────────────────────
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
              padding: '6px 12px', borderRadius: '20px', cursor: 'pointer',
              border: `2px solid ${value === p.valor ? p.color : '#ecf0f1'}`,
              backgroundColor: value === p.valor ? p.bg : 'transparent',
              color: value === p.valor ? p.color : '#7f8c8d',
              fontSize: '12px', fontWeight: value === p.valor ? '700' : '400',
              transition: 'all 0.15s ease',
            }}>
            {p.valor} — {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PrioridadBadge({ value }) {
  const p = PRIORIDAD_CONFIG.find(c => c.valor === value) || PRIORIDAD_CONFIG[0];
  return (
    <span style={{
      padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700',
      backgroundColor: p.bg, color: p.color, whiteSpace: 'nowrap',
    }}>
      {p.valor} {p.label}
    </span>
  );
}

const TIPOS_REQUERIMIENTO = [
  'Limpieza general', 'Calibración', 'Cambio de baterías',
  'Revisión eléctrica', 'Lubricación', 'Actualización de firmware', 'Otro',
];

const ESTATUS_CONFIG = {
  'Abierto':     { clase: 'warning', bg: '#fef5e7', color: '#f39c12' },
  'En progreso': { clase: 'info',    bg: '#e8f4fd', color: '#2980b9' },
  'Completado':  { clase: 'ok',      bg: '#eafaf1', color: '#27ae60' },
};

function formatFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatMoneda(val) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val || 0);
}

// ── Modal states: null | 'picker' | 'preventivo' | 'correctivo' ───────────────
function Mantenimiento() {
  const location = useLocation();

  const [mantenimientos, setMantenimientos]   = useState([]);
  const [equipos, setEquipos]                 = useState([]);
  const [proveedores, setProveedores]         = useState([]);
  const [laboratorios, setLaboratorios]       = useState([]);
  const [cargando, setCargando]               = useState(true);
  const [error, setError]                     = useState(null);
  const [mensajeExito, setMensajeExito]       = useState(null);

  // Filters
  const [busqueda, setBusqueda]               = useState('');
  const [filtroTipo, setFiltroTipo]           = useState('');
  const [filtroEstatus, setFiltroEstatus]     = useState('');
  const [filtroLab, setFiltroLab]             = useState('');

  // Modal flow
  const [modalEstado, setModalEstado]         = useState(null); // null | 'picker' | 'preventivo' | 'correctivo'
  const [guardando, setGuardando]             = useState(false);
  const [clavePreset, setClavePreset]         = useState('');

  // ── Preventivo form state ─────────────────────────────────────────────────
  const [formPrev, setFormPrev] = useState({
    clave_activo: '', tipo_requerimiento: '', descripcion_custom: '',
    descripcion_problema: '', solucion_esperada: '', prioridad: 0,
    id_proveedor: '', fecha_programada: '', costo: '',
  });
  const [paginaPrev, setPaginaPrev] = useState(1);

  // ── Correctivo form state ─────────────────────────────────────────────────
  const [formCorr, setFormCorr] = useState({
    clave_activo: '', descripcion: '', causa_falla: '', prioridad: 0,
    id_proveedor: '', fecha_programada: '', costo: '',
  });

  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => { cargarDatos(); }, []);

  useEffect(() => {
    if (location.state?.autoCompletarClave) {
      abrirPicker(location.state.autoCompletarClave);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  async function cargarDatos() {
    setCargando(true);
    setError(null);
    try {
      const [dataMant, dataEq, dataProv, dataLabs] = await Promise.all([
        mantenimientosAPI.obtenerTodos(),
        equiposAPI.obtenerTodos(),
        proveedoresAPI.obtenerTodos(),
        inventarioAPI.obtenerLaboratorios(),
      ]);
      setMantenimientos(dataMant);
      setEquipos(dataEq);
      setProveedores(dataProv);
      setLaboratorios(dataLabs);
    } catch (err) {
      setError('No se pudo conectar con el servidor. Verifica que el backend esté corriendo.');
    } finally {
      setCargando(false);
    }
  }

  function mostrarExito(msg) {
    setMensajeExito(msg);
    setTimeout(() => setMensajeExito(null), 3500);
  }

  // ── Modal open helpers ────────────────────────────────────────────────────
  function abrirPicker(clave = '') {
    setClavePreset(clave);
    setError(null);
    setModalEstado('picker');
  }

  function seleccionarPreventivo() {
    setFormPrev({
      clave_activo: clavePreset, tipo_requerimiento: '', descripcion_custom: '',
      descripcion_problema: '', solucion_esperada: '', prioridad: 0,
      id_proveedor: '', fecha_programada: '', costo: '',
    });
    setPaginaPrev(1);
    setError(null);
    setModalEstado('preventivo');
  }

  function seleccionarCorrectivo() {
    setFormCorr({
      clave_activo: clavePreset, descripcion: '', causa_falla: '', prioridad: 0,
      id_proveedor: '', fecha_programada: '', costo: '',
    });
    setError(null);
    setModalEstado('correctivo');
  }

  function cerrarModal() {
    setModalEstado(null);
    setError(null);
  }

  // ── Preventivo submit ─────────────────────────────────────────────────────
  function siguientePrev(e) {
    e.preventDefault();
    if (!formPrev.clave_activo) { setError('Selecciona un equipo.'); return; }
    if (!formPrev.tipo_requerimiento) { setError('Selecciona un tipo de requerimiento.'); return; }
    if (formPrev.tipo_requerimiento === 'Otro' && !formPrev.descripcion_custom) { setError('Describe el requerimiento personalizado.'); return; }
    setError(null);
    setPaginaPrev(2);
  }

  async function guardarPreventivo(e) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    const descFinal = formPrev.tipo_requerimiento === 'Otro' ? formPrev.descripcion_custom : formPrev.tipo_requerimiento;
    try {
      const res = await fetch(`${API_URL}/preventivo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clave_activo: formPrev.clave_activo,
          descripcion: descFinal,
          descripcion_problema: formPrev.descripcion_problema || null,
          solucion_esperada: formPrev.solucion_esperada || null,
          prioridad: formPrev.prioridad || 0,
          id_proveedor: formPrev.id_proveedor || null,
          fecha_programada: formPrev.fecha_programada || null,
          costo: formPrev.costo || 0,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error'); }
      cerrarModal();
      mostrarExito('Mantenimiento preventivo registrado correctamente.');
      cargarDatos();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  // ── Correctivo submit ─────────────────────────────────────────────────────
  async function guardarCorrectivo(e) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/correctivo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clave_activo: formCorr.clave_activo,
          descripcion: formCorr.descripcion,
          causa_falla: formCorr.causa_falla || null,
          prioridad: formCorr.prioridad || 0,
          id_proveedor: formCorr.id_proveedor || null,
          fecha_programada: formCorr.fecha_programada || null,
          costo: formCorr.costo || 0,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error'); }
      cerrarModal();
      mostrarExito('Ticket correctivo registrado correctamente.');
      cargarDatos();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function completarMantenimiento(id, clave_activo) {
    try {
      await mantenimientosAPI.completar(id, clave_activo);
      cargarDatos();
    } catch (err) {
      setError('Error al completar el servicio.');
    }
  }

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtrados = mantenimientos.filter(m => {
    const texto = busqueda.toLowerCase();
    const coincideTexto = busqueda === '' ||
      m.clave_activo?.toLowerCase().includes(texto) ||
      m.descripcion?.toLowerCase().includes(texto);
    const coincideTipo    = filtroTipo    === '' || m.tipo_mantenimiento === filtroTipo;
    const coincideEstatus = filtroEstatus === '' || m.estatus === filtroEstatus;
    const coincideLab = filtroLab === '' || m.equipos?.id_laboratorio == filtroLab;
    return coincideTexto && coincideTipo && coincideEstatus && coincideLab;
  });

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="dashboard-container">
      <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Gestión de Mantenimiento</h1>
          <p>Control unificado de servicios preventivos y correctivos</p>
        </div>
        <button className="btn-primary" onClick={() => abrirPicker('')}>+ Nuevo Mantenimiento</button>
      </header>

      {error && !modalEstado && (
        <div style={{ backgroundColor: '#fceceb', color: '#e74c3c', padding: '12px 16px', borderRadius: '6px', fontSize: '14px' }}>{error}</div>
      )}
      {mensajeExito && (
        <div style={{ backgroundColor: '#eafaf1', color: '#27ae60', padding: '12px 16px', borderRadius: '6px', fontSize: '14px' }}>{mensajeExito}</div>
      )}

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" placeholder="Buscar por clave o descripción..."
          className="input-search" style={{ minWidth: '240px' }}
          value={busqueda} onChange={e => setBusqueda(e.target.value)} />

        <select className="select-filter" value={filtroLab} onChange={e => setFiltroLab(e.target.value)}>
          <option value="">Todos los laboratorios</option>
          {laboratorios.map(l => (
            <option key={l.id_laboratorio} value={l.id_laboratorio}>{l.nombre}</option>
          ))}
        </select>

        <select className="select-filter" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          <option value="Preventivo">Preventivo</option>
          <option value="Correctivo">Correctivo</option>
        </select>

        <select className="select-filter" value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)}>
          <option value="">Todos los estatus</option>
          <option value="Abierto">Abierto</option>
          <option value="En progreso">En progreso</option>
          <option value="Completado">Completado</option>
        </select>

        {(busqueda || filtroLab || filtroTipo || filtroEstatus) && (
          <button className="btn-secondary" style={{ padding: '8px 14px', fontSize: '13px' }}
            onClick={() => { setBusqueda(''); setFiltroLab(''); setFiltroTipo(''); setFiltroEstatus(''); }}>
            ✕ Limpiar
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <section className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Equipo</th>
              <th>Laboratorio</th>
              <th>Tipo</th>
              <th>Descripción</th>
              <th>Prioridad</th>
              <th>Proveedor</th>
              <th>Fechas</th>
              <th>Estatus / Costo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan="9" style={{ textAlign: 'center', padding: '20px' }}>Procesando información...</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan="9" style={{ textAlign: 'center', padding: '20px' }}>No se localizaron registros bajo los criterios especificados.</td></tr>
            ) : (
              filtrados.map(m => {
                const estConf = ESTATUS_CONFIG[m.estatus] || ESTATUS_CONFIG['Abierto'];
                const labNombre = equipos.find(e => e.clave_activo === m.clave_activo)?.laboratorios?.nombre || '—';
                return (
                  <tr key={m.id_mantenimiento}>
                    <td>
                      <strong>{m.clave_activo}</strong><br />
                      <small style={{ color: '#7f8c8d' }}>{m.equipos?.marca} {m.equipos?.modelo}</small>
                    </td>
                    <td><small>{labNombre}</small></td>
                    <td>
                      <span style={{
                        padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '600',
                        backgroundColor: m.tipo_mantenimiento === 'Preventivo' ? '#e8f4fd' : '#fef5e7',
                        color: m.tipo_mantenimiento === 'Preventivo' ? '#2980b9' : '#e67e22',
                      }}>
                        {m.tipo_mantenimiento}
                      </span>
                    </td>
                    <td style={{ maxWidth: '180px', fontSize: '13px' }}>{m.descripcion}</td>
                    <td><PrioridadBadge value={m.prioridad || 0} /></td>
                    <td>{m.proveedores?.nombre || 'Interna'}</td>
                    <td>
                      <small>Prog: {formatFecha(m.fecha_programada)}</small><br />
                      <small style={{ color: m.fecha_cierre ? '#27ae60' : '#7f8c8d' }}>
                        Cierre: {m.fecha_cierre ? formatFecha(m.fecha_cierre) : '—'}
                      </small>
                    </td>
                    <td>
                      <span style={{
                        padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700',
                        backgroundColor: estConf.bg, color: estConf.color, display: 'inline-block', marginBottom: '4px',
                      }}>
                        {m.estatus || 'Abierto'}
                      </span><br />
                      <strong style={{ fontSize: '13px' }}>{formatMoneda(m.costo)}</strong>
                    </td>
                    <td>
                      {m.estatus !== 'Completado' && (
                        <button className="btn-icon" style={{ color: '#27ae60', borderColor: '#27ae60' }}
                          onClick={() => completarMantenimiento(m.id_mantenimiento, m.clave_activo)}>
                          ✓ Completar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          MODAL FLOW
      ══════════════════════════════════════════════════════════════════ */}

      {/* ── Picker: choose type ── */}
      {modalEstado === 'picker' && (
        <div className="modal-overlay" onClick={() => !guardando && setModalEstado(null)}>
          <div className="modal-content" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '6px', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
              Nuevo Mantenimiento
            </h2>
            <p style={{ fontSize: '13px', color: '#7f8c8d', marginBottom: '24px' }}>
              Selecciona el tipo de servicio a registrar
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              {/* Preventivo card */}
              <button type="button" onClick={seleccionarPreventivo}
                style={{
                  padding: '24px 20px', borderRadius: '10px', border: '2px solid #e8f4fd',
                  backgroundColor: '#f4faff', cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={e => { e.currentTarget.style.borderColor = '#3498db'; e.currentTarget.style.backgroundColor = '#e8f4fd'; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = '#e8f4fd'; e.currentTarget.style.backgroundColor = '#f4faff'; }}
              >
                <div style={{ fontSize: '28px', marginBottom: '10px' }}>🗓</div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#2c3e50', marginBottom: '6px' }}>
                  Registrar Preventivo
                </div>
                <div style={{ fontSize: '12px', color: '#7f8c8d', lineHeight: '1.5' }}>
                  Mantenimiento programado por intervalo o requerimiento técnico
                </div>
              </button>

              {/* Correctivo card */}
              <button type="button" onClick={seleccionarCorrectivo}
                style={{
                  padding: '24px 20px', borderRadius: '10px', border: '2px solid #fef5e7',
                  backgroundColor: '#fffaf4', cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={e => { e.currentTarget.style.borderColor = '#e67e22'; e.currentTarget.style.backgroundColor = '#fef5e7'; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = '#fef5e7'; e.currentTarget.style.backgroundColor = '#fffaf4'; }}
              >
                <div style={{ fontSize: '28px', marginBottom: '10px' }}>🎫</div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#2c3e50', marginBottom: '6px' }}>
                  Registrar Correctivo
                </div>
                <div style={{ fontSize: '12px', color: '#7f8c8d', lineHeight: '1.5' }}>
                  Ticket de reparación por falla o problema detectado en el equipo
                </div>
              </button>
            </div>

            <div className="modal-actions" style={{ borderTop: '1px solid #eee', paddingTop: '16px', marginTop: 0 }}>
              <button type="button" className="btn-secondary" onClick={cerrarModal}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Preventivo form (2-page) ── */}
      {modalEstado === 'preventivo' && (
        <div className="modal-overlay" onClick={() => !guardando && setModalEstado(null)}>
          <div className="modal-content" style={{ maxWidth: '560px' }} onClick={e => e.stopPropagation()}>
            {/* Header + step indicator */}
            <div style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', color: '#2c3e50', marginBottom: '8px' }}>
                Registrar Mantenimiento Preventivo
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {[1, 2].map(step => (
                  <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                      width: '24px', height: '24px', borderRadius: '50%', fontSize: '11px', fontWeight: '700',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: paginaPrev >= step ? '#3498db' : '#ecf0f1',
                      color: paginaPrev >= step ? 'white' : '#7f8c8d',
                    }}>{step}</div>
                    <span style={{ fontSize: '12px', color: paginaPrev >= step ? '#2c3e50' : '#bdc3c7', fontWeight: paginaPrev === step ? '600' : '400' }}>
                      {step === 1 ? 'Identificación' : 'Detalles y configuración'}
                    </span>
                    {step < 2 && <div style={{ width: '24px', height: '2px', backgroundColor: paginaPrev > step ? '#3498db' : '#ecf0f1', marginLeft: '2px' }} />}
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div style={{ backgroundColor: '#fceceb', color: '#e74c3c', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '15px' }}>{error}</div>
            )}

            {/* Page 1 */}
            {paginaPrev === 1 && (
              <form onSubmit={siguientePrev}>
                <div className="form-group">
                  <label>Equipo</label>
                  <select name="clave_activo" value={formPrev.clave_activo}
                    onChange={e => setFormPrev(p => ({ ...p, clave_activo: e.target.value }))} required>
                    <option value="">-- Seleccionar equipo --</option>
                    {equipos.map(eq => (
                      <option key={eq.clave_activo} value={eq.clave_activo}>
                        {eq.clave_activo} — {eq.marca} {eq.modelo}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div className="form-group">
                    <label>Tipo de requerimiento</label>
                    <select name="tipo_requerimiento" value={formPrev.tipo_requerimiento}
                      onChange={e => setFormPrev(p => ({ ...p, tipo_requerimiento: e.target.value }))} required>
                      <option value="">-- Seleccionar --</option>
                      {TIPOS_REQUERIMIENTO.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  {formPrev.tipo_requerimiento === 'Otro' && (
                    <div className="form-group">
                      <label>Descripción personalizada</label>
                      <input type="text" value={formPrev.descripcion_custom}
                        onChange={e => setFormPrev(p => ({ ...p, descripcion_custom: e.target.value }))}
                        placeholder="Describe el motivo..." required />
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Descripción del problema <span style={{ fontWeight: 'normal', color: '#bdc3c7' }}>(opcional)</span></label>
                  <textarea value={formPrev.descripcion_problema} rows={3}
                    onChange={e => setFormPrev(p => ({ ...p, descripcion_problema: e.target.value }))}
                    placeholder="Detalla el problema observado o síntomas del equipo..."
                    style={{ padding: '10px', border: '1px solid #bdc3c7', borderRadius: '6px', fontSize: '14px', resize: 'vertical', width: '100%' }} />
                </div>

                <div className="form-group">
                  <label>Solución esperada <span style={{ fontWeight: 'normal', color: '#bdc3c7' }}>(opcional)</span></label>
                  <textarea value={formPrev.solucion_esperada} rows={3}
                    onChange={e => setFormPrev(p => ({ ...p, solucion_esperada: e.target.value }))}
                    placeholder="Describe el procedimiento o solución anticipada..."
                    style={{ padding: '10px', border: '1px solid #bdc3c7', borderRadius: '6px', fontSize: '14px', resize: 'vertical', width: '100%' }} />
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-secondary"
                    onClick={() => { setError(null); setModalEstado('picker'); }}>← Regresar</button>
                  <button type="submit" className="btn-primary">Siguiente →</button>
                </div>
              </form>
            )}

            {/* Page 2 */}
            {paginaPrev === 2 && (
              <form onSubmit={guardarPreventivo}>
                <PrioridadSelector value={formPrev.prioridad} onChange={val => setFormPrev(p => ({ ...p, prioridad: val }))} />

                <div className="form-group">
                  <label>Proveedor asignado (opcional)</label>
                  <select value={formPrev.id_proveedor} onChange={e => setFormPrev(p => ({ ...p, id_proveedor: e.target.value }))}>
                    <option value="">Resolución interna</option>
                    {proveedores.map(pv => (
                      <option key={pv.id_proveedor} value={pv.id_proveedor}>
                        {pv.nombre}{pv.es_preferido ? ' ⭐' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div className="form-group">
                    <label>Fecha programada</label>
                    <input type="date" value={formPrev.fecha_programada}
                      onChange={e => setFormPrev(p => ({ ...p, fecha_programada: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label>Costo estimado ($)</label>
                    <input type="number" step="0.01" value={formPrev.costo}
                      onChange={e => setFormPrev(p => ({ ...p, costo: e.target.value }))} placeholder="0.00" min="0" />
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-secondary"
                    onClick={() => { setError(null); setPaginaPrev(1); }} disabled={guardando}>← Regresar</button>
                  <button type="submit" className="btn-primary" disabled={guardando}>
                    {guardando ? 'Procesando...' : 'Confirmar Registro'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Correctivo form ── */}
      {modalEstado === 'correctivo' && (
        <div className="modal-overlay" onClick={() => !guardando && setModalEstado(null)}>
          <div className="modal-content" style={{ maxWidth: '560px' }} onClick={e => e.stopPropagation()}>
            <div style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', color: '#2c3e50' }}>Registrar Ticket Correctivo</h2>
            </div>

            {error && (
              <div style={{ backgroundColor: '#fceceb', color: '#e74c3c', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '15px' }}>{error}</div>
            )}

            <form onSubmit={guardarCorrectivo}>
              <div className="form-group">
                <label>Equipo</label>
                <select value={formCorr.clave_activo}
                  onChange={e => setFormCorr(p => ({ ...p, clave_activo: e.target.value }))} required>
                  <option value="">-- Seleccionar equipo --</option>
                  {equipos.map(eq => (
                    <option key={eq.clave_activo} value={eq.clave_activo}>
                      {eq.clave_activo} — {eq.marca} {eq.modelo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Descripción de la falla</label>
                <textarea value={formCorr.descripcion} required rows={3}
                  onChange={e => setFormCorr(p => ({ ...p, descripcion: e.target.value }))}
                  placeholder="Describe detalladamente el problema detectado..."
                  style={{ padding: '10px', border: '1px solid #bdc3c7', borderRadius: '6px', fontSize: '14px', resize: 'vertical', width: '100%' }} />
              </div>

              <div className="form-group">
                <label>Causa de la falla</label>
                <input type="text" value={formCorr.causa_falla}
                  onChange={e => setFormCorr(p => ({ ...p, causa_falla: e.target.value }))}
                  placeholder="Ej. Sobrecalentamiento, cortocircuito, desgaste..." />
              </div>

              <PrioridadSelector value={formCorr.prioridad} onChange={val => setFormCorr(p => ({ ...p, prioridad: val }))} />

              <div className="form-group">
                <label>Proveedor asignado (opcional)</label>
                <select value={formCorr.id_proveedor} onChange={e => setFormCorr(p => ({ ...p, id_proveedor: e.target.value }))}>
                  <option value="">Resolución interna</option>
                  {proveedores.map(pv => (
                    <option key={pv.id_proveedor} value={pv.id_proveedor}>
                      {pv.nombre}{pv.es_preferido ? ' ⭐' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>Fecha programada</label>
                  <input type="date" value={formCorr.fecha_programada}
                    onChange={e => setFormCorr(p => ({ ...p, fecha_programada: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Costo estimado ($)</label>
                  <input type="number" step="0.01" value={formCorr.costo}
                    onChange={e => setFormCorr(p => ({ ...p, costo: e.target.value }))} placeholder="0.00" min="0" />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary"
                  onClick={() => { setError(null); setModalEstado('picker'); }} disabled={guardando}>← Regresar</button>
                <button type="submit" className="btn-primary" disabled={guardando}>
                  {guardando ? 'Procesando...' : 'Crear Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Mantenimiento;