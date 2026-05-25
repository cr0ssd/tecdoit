import React, { useState, useEffect } from 'react';
import { mantenimientosAPI, proveedoresAPI, equiposAPI, inventarioAPI } from '../services/api';

const API_URL = import.meta.env.VITE_API_URL;

const TIPOS_REQUERIMIENTO = [
  'Limpieza general',
  'Calibración',
  'Cambio de baterías',
  'Revisión eléctrica',
  'Lubricación',
  'Actualización de firmware',
  'Otro',
];

function formatFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatMoneda(val) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val || 0);
}

function diasHasta(fecha) {
  if (!fecha) return null;
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const target = new Date(fecha); target.setHours(0,0,0,0);
  return Math.ceil((target - hoy) / (1000 * 60 * 60 * 24));
}

function estadoBadge(dias) {
  if (dias === null) return { clase: 'ok', texto: 'Sin fecha' };
  if (dias < 0)  return { clase: 'danger',  texto: `Vencido hace ${Math.abs(dias)} días` };
  if (dias === 0) return { clase: 'danger',  texto: 'Vence hoy' };
  if (dias <= 7)  return { clase: 'warning', texto: `En ${dias} días` };
  return { clase: 'ok', texto: `En ${dias} días` };
}


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
          <button
            key={p.valor}
            type="button"
            onClick={() => onChange(p.valor)}
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              border: `2px solid ${value === p.valor ? p.color : '#ecf0f1'}`,
              backgroundColor: value === p.valor ? p.bg : 'transparent',
              color: value === p.valor ? p.color : '#7f8c8d',
              fontSize: '12px',
              fontWeight: value === p.valor ? '700' : '400',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
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

export default function Preventivo() {
  const [registros, setRegistros] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [laboratorios, setLaboratorios] = useState([]);
  const [filtroLab, setFiltroLab] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);

  const [mostrarModal, setMostrarModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [paginaModal, setPaginaModal] = useState(1);

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('');

  const [form, setForm] = useState({
    clave_activo: '',
    descripcion: '',
    tipo_requerimiento: '',
    descripcion_custom: '',
    descripcion_problema: '',
    solucion_esperada: '',
    prioridad: 0,
    id_proveedor: '',
    fecha_programada: '',
    costo: '',
  });

  useEffect(() => { cargarDatos(); }, []);

  async function cargarDatos() {
    setCargando(true);
    setError(null);
    try {
      const [resPreventivo, dataEq, dataProv, dataLabs] = await Promise.all([
        fetch(`${API_URL}/preventivo`).then(r => r.json()),
        equiposAPI.obtenerTodos(),
        proveedoresAPI.obtenerTodos(),
        inventarioAPI.obtenerLaboratorios(),
      ]);
      setRegistros(resPreventivo);
      setEquipos(dataEq);
      setProveedores(dataProv);
      setLaboratorios(dataLabs);
    } catch (err) {
      setError('No se pudo cargar la información. Verifica que el backend esté corriendo.');
    } finally {
      setCargando(false);
    }
  }

  function handleInput(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function abrirModal() {
    setForm({ clave_activo: '', descripcion: '', tipo_requerimiento: '', descripcion_custom: '', descripcion_problema: '', solucion_esperada: '', prioridad: 0, id_proveedor: '', fecha_programada: '', costo: '' });
    setError(null);
    setPaginaModal(1);
    setMostrarModal(true);
  }

  function siguientePagina(e) {
    e.preventDefault();
    // Validate page 1 required fields before advancing
    if (!form.clave_activo) { setError('Selecciona un equipo.'); return; }
    if (!form.tipo_requerimiento) { setError('Selecciona un tipo de requerimiento.'); return; }
    if (form.tipo_requerimiento === 'Otro' && !form.descripcion_custom) { setError('Describe el requerimiento personalizado.'); return; }
    setError(null);
    setPaginaModal(2);
  }

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setError(null);

    // Build descripcion: preset label or custom text
    const descFinal = form.tipo_requerimiento === 'Otro'
      ? form.descripcion_custom
      : form.tipo_requerimiento;

    try {
      const res = await fetch(`${API_URL}/preventivo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clave_activo: form.clave_activo,
          descripcion: descFinal,
          descripcion_problema: form.descripcion_problema || null,
          solucion_esperada: form.solucion_esperada || null,
          prioridad: form.prioridad || 0,
          id_proveedor: form.id_proveedor || null,
          fecha_programada: form.fecha_programada || null,
          costo: form.costo || 0,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al guardar');
      }
      setMostrarModal(false);
      setMensajeExito('Mantenimiento preventivo registrado correctamente.');
      setTimeout(() => setMensajeExito(null), 3500);
      cargarDatos();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function completar(id_mantenimiento, clave_activo) {
    try {
      const res = await fetch(`${API_URL}/preventivo/${id_mantenimiento}/completar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clave_activo }),
      });
      if (!res.ok) throw new Error('Error al completar');
      setMensajeExito('Mantenimiento marcado como completado.');
      setTimeout(() => setMensajeExito(null), 3500);
      cargarDatos();
    } catch (err) {
      setError(err.message);
    }
  }

  const filtrados = registros.filter(r => {
    const coincideTexto = busqueda === '' ||
      r.clave_activo?.toLowerCase().includes(busqueda.toLowerCase()) ||
      r.descripcion?.toLowerCase().includes(busqueda.toLowerCase());
    const coincideEstatus = filtroEstatus === '' || r.estatus === filtroEstatus;
    const coincideLab = filtroLab === '' || r.equipos?.id_laboratorio == filtroLab;
    return coincideTexto && coincideEstatus && coincideLab;
  });

  // KPIs
  const vencidos  = registros.filter(r => r.estatus !== 'Completado' && diasHasta(r.fecha_programada) < 0).length;
  const proximos7 = registros.filter(r => r.estatus !== 'Completado' && diasHasta(r.fecha_programada) >= 0 && diasHasta(r.fecha_programada) <= 7).length;
  const activos   = registros.filter(r => r.estatus !== 'Completado').length;

  return (
    <div className="dashboard-container">
      <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Mantenimiento Preventivo</h1>
          <p>Programación y seguimiento de mantenimientos por intervalo</p>
        </div>
        <button className="btn-primary" onClick={abrirModal}>+ Registrar Preventivo</button>
      </header>

      {error && !mostrarModal && (
        <div style={{ backgroundColor: '#fceceb', color: '#e74c3c', padding: '12px 16px', borderRadius: '6px', fontSize: '14px' }}>{error}</div>
      )}
      {mensajeExito && (
        <div style={{ backgroundColor: '#eafaf1', color: '#27ae60', padding: '12px 16px', borderRadius: '6px', fontSize: '14px' }}>{mensajeExito}</div>
      )}

      {/* KPIs */}
      <section className="kpi-grid">
        <div className="kpi-card">
          <h3>Preventivos Activos</h3>
          <p className="kpi-number">{activos}</p>
          <span className="kpi-status info">En curso o pendientes</span>
        </div>
        <div className="kpi-card">
          <h3>Vencidos</h3>
          <p className="kpi-number danger-text">{vencidos}</p>
          <span className="kpi-status danger">Requieren atención inmediata</span>
        </div>
        <div className="kpi-card">
          <h3>Próximos 7 días</h3>
          <p className="kpi-number warning-text">{proximos7}</p>
          <span className="kpi-status warning">Programar pronto</span>
        </div>
        <div className="kpi-card">
          <h3>Completados</h3>
          <p className="kpi-number" style={{ color: '#27ae60' }}>{registros.length - activos}</p>
          <span className="kpi-status ok">Histórico total</span>
        </div>
      </section>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" placeholder="Buscar por equipo o descripción..." className="input-search"
          value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        <select className="select-filter" value={filtroLab} onChange={e => setFiltroLab(e.target.value)}>
          <option value="">Todos los laboratorios</option>
          {laboratorios.map(l => (
            <option key={l.id_laboratorio} value={l.id_laboratorio}>{l.nombre}</option>
          ))}
        </select>

        <select className="select-filter" value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)}>
          <option value="">Todos los estatus</option>
          <option value="Abierto">Abierto</option>
          <option value="En progreso">En progreso</option>
          <option value="Completado">Completado</option>
        </select>
      </div>

      {/* Table */}
      <section className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Equipo</th>
              <th>Requerimiento</th>
              <th>Descripción / Solución esperada</th>
              <th>Proveedor</th>
              <th>Fecha Programada</th>
              <th>Costo</th>
              <th>Prioridad</th>
              <th>Estatus / Días</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan="9" style={{ textAlign: 'center', padding: '20px' }}>Procesando información...</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan="9" style={{ textAlign: 'center', padding: '20px' }}>No se localizaron registros bajo los criterios especificados.</td></tr>
            ) : (
              filtrados.map(r => {
                const dias = diasHasta(r.fecha_programada);
                const badge = r.estatus === 'Completado'
                  ? { clase: 'ok', texto: 'Completado' }
                  : estadoBadge(dias);

                return (
                  <tr key={r.id_mantenimiento}>
                    <td>
                      <strong>{r.clave_activo}</strong><br />
                      <small style={{ color: '#7f8c8d' }}>{r.equipos?.marca} {r.equipos?.modelo}</small>
                    </td>
                    <td>{r.descripcion || '—'}</td>
                    <td style={{ maxWidth: '200px' }}>
                      {r.descripcion_problema && (
                        <div style={{ fontSize: '13px', color: '#2c3e50', marginBottom: r.solucion_esperada ? '4px' : '0' }}>
                          {r.descripcion_problema}
                        </div>
                      )}
                      {r.solucion_esperada && (
                        <div style={{ fontSize: '12px', marginTop: '3px', padding: '3px 7px', backgroundColor: '#eafaf1', borderRadius: '4px', display: 'inline-block' }}>
                          <span style={{ color: '#27ae60', fontWeight: '600' }}>✔ </span>
                          <span style={{ color: '#27ae60' }}>{r.solucion_esperada}</span>
                        </div>
                      )}
                      {!r.descripcion_problema && !r.solucion_esperada && <span style={{ color: '#bdc3c7' }}>—</span>}
                    </td>
                    <td>{r.proveedores?.nombre || 'Resolución interna'}</td>
                    <td>{formatFecha(r.fecha_programada)}</td>
                    <td>{formatMoneda(r.costo)}</td>
                    <td><PrioridadBadge value={r.prioridad || 0} /></td>
                    <td><span className={`badge ${badge.clase}`}>{badge.texto}</span></td>
                    <td>
                      {r.estatus !== 'Completado' && (
                        <button
                          className="btn-icon"
                          style={{ borderColor: '#27ae60', color: '#27ae60' }}
                          onClick={() => completar(r.id_mantenimiento, r.clave_activo)}
                        >
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

      {/* Modal — 2 pages */}
      {mostrarModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '560px' }}>

            {/* Modal header */}
            <div style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', color: '#2c3e50', marginBottom: '8px' }}>
                Registrar Mantenimiento Preventivo
              </h2>
              {/* Step indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {[1, 2].map(step => (
                  <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', fontWeight: '700',
                      backgroundColor: paginaModal >= step ? '#3498db' : '#ecf0f1',
                      color: paginaModal >= step ? 'white' : '#7f8c8d',
                    }}>
                      {step}
                    </div>
                    <span style={{ fontSize: '12px', color: paginaModal >= step ? '#2c3e50' : '#bdc3c7', fontWeight: paginaModal === step ? '600' : '400' }}>
                      {step === 1 ? 'Identificación' : 'Detalles y configuración'}
                    </span>
                    {step < 2 && (
                      <div style={{ width: '24px', height: '2px', backgroundColor: paginaModal > step ? '#3498db' : '#ecf0f1', marginLeft: '2px' }} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div style={{ backgroundColor: '#fceceb', color: '#e74c3c', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '15px' }}>{error}</div>
            )}

            {/* ── Page 1: Identification ── */}
            {paginaModal === 1 && (
              <form onSubmit={siguientePagina}>
                <div className="form-group">
                  <label>Equipo</label>
                  <select name="clave_activo" value={form.clave_activo} onChange={handleInput} required>
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
                    <select name="tipo_requerimiento" value={form.tipo_requerimiento} onChange={handleInput} required>
                      <option value="">-- Seleccionar --</option>
                      {TIPOS_REQUERIMIENTO.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  {form.tipo_requerimiento === 'Otro' && (
                    <div className="form-group">
                      <label>Descripción personalizada</label>
                      <input type="text" name="descripcion_custom" value={form.descripcion_custom}
                        onChange={handleInput} placeholder="Describe el motivo..." required />
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Descripción del problema <span style={{ fontWeight: 'normal', color: '#bdc3c7' }}>(opcional)</span></label>
                  <textarea
                    name="descripcion_problema"
                    value={form.descripcion_problema}
                    onChange={handleInput}
                    rows={3}
                    placeholder="Detalla el problema observado o síntomas del equipo..."
                    style={{ padding: '10px', border: '1px solid #bdc3c7', borderRadius: '6px', fontSize: '14px', resize: 'vertical', width: '100%' }}
                  />
                </div>

                <div className="form-group">
                  <label>Solución esperada <span style={{ fontWeight: 'normal', color: '#bdc3c7' }}>(opcional)</span></label>
                  <textarea
                    name="solucion_esperada"
                    value={form.solucion_esperada}
                    onChange={handleInput}
                    rows={3}
                    placeholder="Describe el procedimiento o solución anticipada..."
                    style={{ padding: '10px', border: '1px solid #bdc3c7', borderRadius: '6px', fontSize: '14px', resize: 'vertical', width: '100%' }}
                  />
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setMostrarModal(false)}>Cancelar</button>
                  <button type="submit" className="btn-primary">Siguiente →</button>
                </div>
              </form>
            )}

            {/* ── Page 2: Details & config ── */}
            {paginaModal === 2 && (
              <form onSubmit={guardar}>
                <PrioridadSelector value={form.prioridad} onChange={val => setForm(prev => ({ ...prev, prioridad: val }))} />

                <div className="form-group">
                  <label>Proveedor asignado (opcional)</label>
                  <select name="id_proveedor" value={form.id_proveedor} onChange={handleInput}>
                    <option value="">Resolución interna</option>
                    {proveedores.map(p => (
                      <option key={p.id_proveedor} value={p.id_proveedor}>
                        {p.nombre}{p.es_preferido ? ' ⭐' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div className="form-group">
                    <label>Fecha programada</label>
                    <input type="date" name="fecha_programada" value={form.fecha_programada} onChange={handleInput} required />
                  </div>
                  <div className="form-group">
                    <label>Costo estimado ($)</label>
                    <input type="number" step="0.01" name="costo" value={form.costo}
                      onChange={handleInput} placeholder="0.00" min="0" />
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => { setError(null); setPaginaModal(1); }} disabled={guardando}>← Regresar</button>
                  <button type="submit" className="btn-primary" disabled={guardando}>
                    {guardando ? 'Procesando...' : 'Confirmar Registro'}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}
    </div>
  );
}