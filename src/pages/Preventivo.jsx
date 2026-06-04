import React, { useState, useEffect, useRef } from 'react';

import EquipoPicker from '../components/EquipoPicker';

import { useOrdenamiento } from '../hooks/useOrdenamiento';
import Th from '../components/Th';

const API_URL = import.meta.env.VITE_API_URL;

const PERIODICIDADES = [
  { value: '7',    label: '7 Días',   dias: 7   },
  { value: '15',   label: '15 Días',  dias: 15  },
  { value: '30',   label: '1 Mes',    dias: 30  },
  { value: '60',   label: '2 Meses',  dias: 60  },
  { value: '90',   label: '3 Meses',  dias: 90  },
  { value: '120',  label: '4 Meses',  dias: 120 },
  { value: '150',  label: '5 Meses',  dias: 150 },
  { value: '180',  label: '6 Meses',  dias: 180 },
  { value: 'otro', label: 'Otro',     dias: null },
];

// ── Helpers ───────────────────────────────────────────────────────

function diasHasta(fecha) {
  if (!fecha) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const target = new Date(fecha);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - hoy) / (1000 * 60 * 60 * 24));
}

// En Mantenimiento and Vencido are parallel states:
//   - dias === 0       → En Mantenimiento only (due today)
//   - dias < 0         → En Mantenimiento + Vencido (overdue)
// The DB flag en_mantenimiento is also respected (set by trigger on writes)
// but we derive state locally too so the UI is correct on page load
// without needing a write to fire the trigger.
function calcularEstado(config) {
  const dias = diasHasta(config.proxima_fecha);
  // Active if DB flag is set OR if the due date has arrived (dias <= 0)
  const esEnMantenimiento = !!config.en_mantenimiento || (dias !== null && dias <= 0);
  const esVencido = esEnMantenimiento && dias !== null && dias < 0;
  const diasVencido = esVencido ? Math.abs(dias) : 0;
  return { esEnMantenimiento, esVencido, diasVencido, dias };
}

// Always adds days from today — next cycle is always today + intervalo.
function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ── Estado badges — renders 1 or 2 badges side by side ───────────
function EstadoBadges({ config }) {
  const { esEnMantenimiento, esVencido, diasVencido, dias } = calcularEstado(config);

  if (esEnMantenimiento && esVencido) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span className="badge warning">En Mantenimiento</span>
        <span className="badge danger">Vencido hace {diasVencido} día{diasVencido !== 1 ? 's' : ''}</span>
      </div>
    );
  }
  if (esEnMantenimiento) {
    return <span className="badge warning">En Mantenimiento</span>;
  }
  if (dias === null) {
    return <span className="badge ok">Sin fecha</span>;
  }
  if (dias <= 7) {
    return <span className="badge warning">En {dias} días</span>;
  }
  return <span className="badge ok">En {dias} días</span>;
}

// ─────────────────────────────────────────────────────────────────

export default function Preventivo() {
  const [equipos,      setEquipos]      = useState([]);
  const [proveedores,  setProveedores]  = useState([]);
  const [configs,      setConfigs]      = useState([]);
  const [cargando,     setCargando]     = useState(true);
  const [error,        setError]        = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);

  // Registro / edición modal
  const [mostrarModal, setMostrarModal] = useState(false);
  const [guardando,    setGuardando]    = useState(false);
  const [modoEdicion,  setModoEdicion]  = useState(false);

  // Completar modal
  const [mostrarCompletarModal, setMostrarCompletarModal] = useState(false);
  const [configCompletando,     setConfigCompletando]     = useState(null);
  const [tareasCompletando,     setTareasCompletando]     = useState([]);
  const [finalizando,           setFinalizando]           = useState(false);

  // Filters
  const [busqueda,     setBusqueda]     = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  // Form
  const [form, setForm] = useState({
    clave_activo:      '',
    periodicidad:      '',
    periodicidad_dias: '',
    id_proveedor:      '',
    responsable:       '',
    tareas:            [],
  });

  useEffect(() => { cargarDatos(); }, []);

  // ── Data ────────────────────────────────────────────────────────

  async function cargarDatos() {
    setCargando(true);
    setError(null);
    try {
      const [resEq, resConf, resProv] = await Promise.all([
        fetch(`${API_URL}/equipos`),
        fetch(`${API_URL}/preventivo`),
        fetch(`${API_URL}/proveedores`),
      ]);
      if (!resEq.ok)   throw new Error('Error al cargar equipos');
      if (!resConf.ok) throw new Error('Error al cargar configuraciones');
      if (!resProv.ok) throw new Error('Error al cargar proveedores');
      const [dataEq, dataConf, dataProv] = await Promise.all([
        resEq.json(), resConf.json(), resProv.json(),
      ]);
      setEquipos(dataEq);
      setConfigs(dataConf);
      setProveedores(dataProv);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  // ── Computed ─────────────────────────────────────────────────────

  // Equipos that already have a preventivo config — excluded from the picker
  const clavesConConfig = new Set(configs.map(c => c.clave_activo));

  // In edit mode the current equipo is allowed through (it already has the config)
  const equiposDisponibles = equipos.filter(eq =>
    !clavesConConfig.has(eq.clave_activo) || eq.clave_activo === form.clave_activo
  );

  const configsFiltradas = configs.filter(c => {
    const coincideBusqueda = busqueda === '' ||
      c.clave_activo.toLowerCase().includes(busqueda.toLowerCase());
    if (!coincideBusqueda) return false;
    if (filtroEstado === '') return true;
    const { esEnMantenimiento, esVencido, dias } = calcularEstado(c);
    if (filtroEstado === 'vencido')       return esVencido;
    if (filtroEstado === 'mantenimiento') return esEnMantenimiento && !esVencido;
    if (filtroEstado === 'ambos')         return esEnMantenimiento && esVencido;
    if (filtroEstado === 'proximo')       return !esEnMantenimiento && dias !== null && dias >= 0 && dias <= 7;
    if (filtroEstado === 'ok')            return !esEnMantenimiento && dias !== null && dias > 7;
    return true;
  });

  const { datosOrdenados, orden, ordenarPor } = useOrdenamiento(configsFiltradas);

  const kpiVencidos      = configs.filter(c => calcularEstado(c).esVencido).length;
  const kpiMantenimiento = configs.filter(c => {
    const e = calcularEstado(c);
    return e.esEnMantenimiento && !e.esVencido;
  }).length;
  const kpiProximos7 = configs.filter(c => {
    const { esEnMantenimiento, dias } = calcularEstado(c);
    return !esEnMantenimiento && dias !== null && dias >= 0 && dias <= 7;
  }).length;

  const labelPeriodicidad = (config) => {
    const p = PERIODICIDADES.find(p => p.dias === config.intervalo_dias);
    return p ? p.label : `${config.intervalo_dias} días`;
  };

  // ── Registro / Edición ───────────────────────────────────────────

  function abrirModalNuevo() {
    setModoEdicion(false);
    setForm({ clave_activo: '', periodicidad: '', periodicidad_dias: '', id_proveedor: '', responsable: '', tareas: [] });
    setError(null);
    setMostrarModal(true);
  }

  function abrirModalEditar(config) {
    setModoEdicion(true);
    const periValue = PERIODICIDADES.find(p => p.dias === config.intervalo_dias)?.value || 'otro';
    setForm({
      clave_activo:      config.clave_activo,
      periodicidad:      periValue,
      periodicidad_dias: config.intervalo_dias || '',
      id_proveedor:      config.id_proveedor || '',
      responsable:       config.responsable || '',
      tareas: (config.tareas || []).map((t, i) => ({
        id: Date.now() + i,
        texto: typeof t === 'string' ? t : t.texto,
      })),
    });
    setError(null);
    setMostrarModal(true);
  }

  function handleInput(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function agregarTarea() {
    setForm(prev => ({ ...prev, tareas: [...prev.tareas, { id: Date.now(), texto: '' }] }));
  }

  function actualizarTarea(id, texto) {
    setForm(prev => ({ ...prev, tareas: prev.tareas.map(t => t.id === id ? { ...t, texto } : t) }));
  }

  function eliminarTarea(id) {
    setForm(prev => ({ ...prev, tareas: prev.tareas.filter(t => t.id !== id) }));
  }

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setError(null);

    if (!form.clave_activo) {
      setError('Selecciona un equipo de la lista.');
      setGuardando(false);
      return;
    }

    const periObjeto = PERIODICIDADES.find(p => p.value === form.periodicidad);
    const diasCalculados = form.periodicidad === 'otro'
      ? parseInt(form.periodicidad_dias, 10)
      : periObjeto?.dias;

    if (!diasCalculados || diasCalculados < 1) {
      setError('Selecciona una periodicidad válida.');
      setGuardando(false);
      return;
    }

    const payload = {
      clave_activo:   form.clave_activo,
      intervalo_dias: diasCalculados,
      proxima_fecha:  addDays(diasCalculados),
      id_proveedor:   form.id_proveedor || null,
      responsable:    form.responsable  || null,
      tareas:         form.tareas.map(t => t.texto.trim()).filter(Boolean),
    };

    try {
      const url    = modoEdicion ? `${API_URL}/preventivo/${form.clave_activo}` : `${API_URL}/preventivo`;
      const method = modoEdicion ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al guardar');
      }
      setMostrarModal(false);
      setMensajeExito(modoEdicion ? 'Configuración actualizada correctamente.' : 'Preventivo registrado correctamente.');
      setTimeout(() => setMensajeExito(null), 3500);
      cargarDatos();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(clave) {
    if (!window.confirm(`¿Eliminar configuración de preventivo para ${clave}?`)) return;
    try {
      const res = await fetch(`${API_URL}/preventivo/${clave}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      setMensajeExito('Configuración eliminada.');
      setTimeout(() => setMensajeExito(null), 3000);
      cargarDatos();
    } catch (err) {
      setError(err.message);
    }
  }

  // ── Completar mantenimiento ──────────────────────────────────────

  function abrirCompletarModal(config) {
    setConfigCompletando(config);
    setTareasCompletando(
      (config.tareas || []).map((t, i) => ({
        id: i,
        texto: typeof t === 'string' ? t : t.texto,
        estado: 'pendiente',
      }))
    );
    setError(null);
    setMostrarCompletarModal(true);
  }

  function toggleTareaEstado(id, nuevoEstado) {
    setTareasCompletando(prev =>
      prev.map(t => t.id === id ? { ...t, estado: t.estado === nuevoEstado ? 'pendiente' : nuevoEstado } : t)
    );
  }

  function marcarTodas() {
    setTareasCompletando(prev => prev.map(t => ({ ...t, estado: 'completado' })));
  }

  const todasResueltas = tareasCompletando.every(
    t => t.estado === 'completado' || t.estado === 'no_necesario'
  );

  async function finalizarMantenimiento() {
    if (!todasResueltas && tareasCompletando.length > 0) {
      setError('Marca todas las tareas como Completado o No Necesario antes de finalizar.');
      return;
    }
    setFinalizando(true);
    setError(null);

    const nuevaProxima    = addDays(configCompletando.intervalo_dias);
    const ultimaEjecucion = new Date().toISOString().slice(0, 10);

    try {
      const res = await fetch(`${API_URL}/preventivo/${configCompletando.clave_activo}/completar`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ultima_ejecucion: ultimaEjecucion,
          tareas_resultado: tareasCompletando.map(t => ({ texto: t.texto, estado: t.estado })),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al completar mantenimiento');
      }
      setMostrarCompletarModal(false);
      setConfigCompletando(null);
      setMensajeExito(
        `Mantenimiento completado. Próximo ciclo: ${new Date(nuevaProxima).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}`
      );
      setTimeout(() => setMensajeExito(null), 5000);
      cargarDatos();
    } catch (err) {
      setError(err.message);
    } finally {
      setFinalizando(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="dashboard-container">

      <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Mantenimiento Preventivo</h1>
          <p>Configuración de periodicidades, tareas y responsables por equipo</p>
        </div>
        <button className="btn-primary" onClick={abrirModalNuevo}>+ Asignar Preventivo</button>
      </header>

      {error && !mostrarModal && !mostrarCompletarModal && (
        <div style={{ backgroundColor: '#fceceb', color: '#e74c3c', padding: '12px 16px', borderRadius: '6px', fontSize: '14px' }}>
          {error}
        </div>
      )}
      {mensajeExito && (
        <div style={{ backgroundColor: '#eafaf1', color: '#27ae60', padding: '12px 16px', borderRadius: '6px', fontSize: '14px' }}>
          {mensajeExito}
        </div>
      )}

      {/* KPIs */}
      <section className="kpi-grid">
        <div className="kpi-card">
          <h3>Configuraciones Activas</h3>
          <p className="kpi-number">{configs.length}</p>
          <span className="kpi-status info">Total registradas</span>
        </div>
        <div className="kpi-card">
          <h3>En Mantenimiento</h3>
          <p className="kpi-number warning-text">{kpiMantenimiento}</p>
          <span className="kpi-status warning">Ciclo activo en curso</span>
        </div>
        <div className="kpi-card">
          <h3>Vencidas</h3>
          <p className="kpi-number danger-text">{kpiVencidos}</p>
          <span className="kpi-status danger">En mantenimiento y sin completar</span>
        </div>
        <div className="kpi-card">
          <h3>Próximos 7 días</h3>
          <p className="kpi-number" style={{ color: '#f39c12' }}>{kpiProximos7}</p>
          <span className="kpi-status warning">Programar pronto</span>
        </div>
      </section>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Buscar por clave de equipo..."
          className="input-search"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
        <select className="select-filter" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="mantenimiento">En Mantenimiento</option>
          <option value="vencido">Vencido</option>
          <option value="ambos">En Mantenimiento + Vencido</option>
          <option value="proximo">Próximos 7 días</option>
          <option value="ok">Al corriente</option>
        </select>
      </div>

      {/* Table */}
      <section className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <Th col="equipo" get={c => c.clave_activo} orden={orden} ordenarPor={ordenarPor}>Equipo</Th>
              <Th col="periodo" get={c => c.intervalo_dias || 0} orden={orden} ordenarPor={ordenarPor}>Periodicidad</Th>
              <Th col="prov" get={c => proveedores.find(p => p.id_proveedor === c.id_proveedor)?.nombre || ''} orden={orden} ordenarPor={ordenarPor}>Proveedor / Responsable</Th>
              <Th col="tareas" get={c => (c.tareas?.length || 0)} orden={orden} ordenarPor={ordenarPor}>Tareas</Th>
              <Th col="proxima" get={c => c.proxima_fecha ? new Date(c.proxima_fecha).getTime() : null} orden={orden} ordenarPor={ordenarPor}>Próxima fecha</Th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>Procesando información...</td></tr>
            ) : configsFiltradas.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>No se localizaron registros bajo los criterios especificados.</td></tr>
            ) : (
              datosOrdenados.map(config => {
                const { esEnMantenimiento, esVencido } = calcularEstado(config);
                const provNombre = proveedores.find(p => p.id_proveedor === config.id_proveedor)?.nombre;

                return (
                  <tr key={config.id || config.clave_activo}>
                    <td>
                      <strong>{config.clave_activo}</strong><br />
                      <small style={{ color: '#7f8c8d' }}>{config.equipos?.marca} {config.equipos?.modelo}</small>
                    </td>
                    <td>
                      <span style={{ padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: '600', backgroundColor: '#e8f4fd', color: '#2980b9' }}>
                        {labelPeriodicidad(config)}
                      </span>
                      <br />
                      <small style={{ color: '#7f8c8d', fontSize: '11px' }}>
                        Última: {config.ultima_ejecucion ? new Date(config.ultima_ejecucion).toLocaleDateString('es-MX') : '—'}
                      </small>
                    </td>
                    <td>
                      <span style={{ fontSize: '13px' }}>{provNombre || '—'}</span>
                      {config.responsable && (
                        <><br /><small style={{ color: '#7f8c8d' }}>Resp: {config.responsable}</small></>
                      )}
                    </td>
                    <td>
                      {config.tareas && config.tareas.length > 0
                        ? <span style={{ fontSize: '13px' }}>{config.tareas.length} tarea{config.tareas.length !== 1 ? 's' : ''}</span>
                        : <span style={{ fontSize: '12px', color: '#bdc3c7' }}>Sin tareas</span>
                      }
                    </td>
                    <td>
                      <strong style={{ fontSize: '13px' }}>
                        {config.proxima_fecha
                          ? new Date(config.proxima_fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      </strong>
                    </td>
                    <td>
                      <EstadoBadges config={config} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {(esEnMantenimiento || esVencido) && (
                          <button className="btn-icon" style={{ borderColor: '#27ae60', color: '#27ae60' }} onClick={() => abrirCompletarModal(config)}>
                            ✓ Completar
                          </button>
                        )}
                        <button className="btn-icon" onClick={() => abrirModalEditar(config)}>Editar</button>
                        <button className="btn-icon" style={{ borderColor: '#e74c3c', color: '#e74c3c' }} onClick={() => eliminar(config.clave_activo)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      {/* ─── Modal: Registro / Edición ─────────────────────────── */}
      {mostrarModal && (
        <div className="modal-overlay" onClick={() => !guardando && setMostrarModal(false)}>
          <div className="modal-content" style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
              {modoEdicion ? 'Editar Configuración Preventiva' : 'Asignar Mantenimiento Preventivo'}
            </h2>

            {error && (
              <div style={{ backgroundColor: '#fceceb', color: '#e74c3c', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '15px' }}>
                {error}
              </div>
            )}

            <form onSubmit={guardar}>

              {/* Equipo — searchable picker, excludes already-configured equipos */}
              <div className="form-group">
                <label>Equipo</label>
                <EquipoPicker
                  equipos={equiposDisponibles}
                  value={form.clave_activo}
                  onChange={val => setForm(prev => ({ ...prev, clave_activo: val }))}
                  disabled={modoEdicion}
                />
                {!modoEdicion && (
                  <small style={{ color: '#7f8c8d', fontSize: '12px' }}>
                    Solo se muestran equipos sin preventivo asignado.
                  </small>
                )}
              </div>

              {/* Periodicidad */}
              <div style={{ display: 'grid', gridTemplateColumns: form.periodicidad === 'otro' ? '1fr 1fr' : '1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>Periodicidad</label>
                  <select name="periodicidad" value={form.periodicidad} onChange={handleInput} required>
                    <option value="">-- Seleccionar intervalo --</option>
                    {PERIODICIDADES.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                  <small style={{ color: '#7f8c8d', fontSize: '12px' }}>
                    El equipo entrará en mantenimiento cada vez que se cumpla este intervalo.
                  </small>
                </div>
                {form.periodicidad === 'otro' && (
                  <div className="form-group">
                    <label>Número de días</label>
                    <input type="number" name="periodicidad_dias" value={form.periodicidad_dias} onChange={handleInput} placeholder="Ej. 45" min="1" required />
                  </div>
                )}
              </div>

              {/* Proveedor (from DB) + Responsable */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>Proveedor Asignado (Opcional)</label>
                  <select name="id_proveedor" value={form.id_proveedor} onChange={handleInput}>
                    <option value="">Resolución Interna</option>
                    {proveedores.map(prov => (
                      <option key={prov.id_proveedor} value={prov.id_proveedor}>
                        {prov.nombre}{prov.es_preferido ? ' ⭐' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Responsable</label>
                  <input type="text" name="responsable" value={form.responsable} onChange={handleInput} placeholder="Nombre del responsable" />
                </div>
              </div>

              {/* Tareas */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '600', color: '#7f8c8d' }}>Lista de Tareas</label>
                  <button type="button" className="btn-icon" onClick={agregarTarea} style={{ fontSize: '13px' }}>
                    + Agregar tarea
                  </button>
                </div>

                {form.tareas.length === 0 && (
                  <p style={{ fontSize: '13px', color: '#bdc3c7', textAlign: 'center', padding: '16px', border: '1px dashed #ecf0f1', borderRadius: '6px' }}>
                    Sin tareas registradas. Haz clic en "+ Agregar tarea" para comenzar.
                  </p>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {form.tareas.map((tarea, idx) => (
                    <div key={tarea.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#bdc3c7', minWidth: '18px', textAlign: 'right' }}>{idx + 1}.</span>
                      <input
                        type="text"
                        value={tarea.texto}
                        onChange={e => actualizarTarea(tarea.id, e.target.value)}
                        placeholder="Descripción de la tarea..."
                        style={{ flex: 1, padding: '8px 10px', border: '1px solid #bdc3c7', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
                        onFocus={e => e.target.style.borderColor = '#3498db'}
                        onBlur={e => e.target.style.borderColor = '#bdc3c7'}
                      />
                      <button type="button" onClick={() => eliminarTarea(tarea.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e74c3c', fontSize: '18px', padding: '2px 4px', lineHeight: 1 }}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setMostrarModal(false)} disabled={guardando}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={guardando}>
                  {guardando ? 'Procesando...' : modoEdicion ? 'Aplicar Modificaciones' : 'Confirmar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal: Completar Mantenimiento ───────────────────────── */}
      {mostrarCompletarModal && configCompletando && (
        <div className="modal-overlay" onClick={() => !guardando && setMostrarCompletarModal(false)}>
          <div className="modal-content" style={{ maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
              <h2 style={{ marginBottom: '4px' }}>Completar Mantenimiento</h2>
              <p style={{ fontSize: '13px', color: '#7f8c8d', margin: 0 }}>
                {configCompletando.clave_activo}
                {configCompletando.equipos && ` — ${configCompletando.equipos.marca} ${configCompletando.equipos.modelo}`}
              </p>
            </div>

            {error && (
              <div style={{ backgroundColor: '#fceceb', color: '#e74c3c', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '15px' }}>
                {error}
              </div>
            )}

            <div style={{ backgroundColor: '#eafaf1', border: '1px solid #a9dfbf', borderRadius: '6px', padding: '10px 14px', marginBottom: '20px', fontSize: '13px', color: '#1e8449' }}>
              Al finalizar, el próximo mantenimiento se programará para{' '}
              <strong>
                {new Date(addDays(configCompletando.intervalo_dias)).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
              </strong>
              {' '}({labelPeriodicidad(configCompletando)} a partir de hoy).
            </div>

            {tareasCompletando.length === 0 ? (
              <p style={{ fontSize: '14px', color: '#7f8c8d', textAlign: 'center', padding: '20px' }}>
                Este preventivo no tiene tareas registradas.
              </p>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: '#2c3e50', margin: 0 }}>
                    Tareas ({tareasCompletando.filter(t => t.estado !== 'pendiente').length}/{tareasCompletando.length} resueltas)
                  </p>
                  <button type="button" className="btn-icon" style={{ borderColor: '#27ae60', color: '#27ae60' }} onClick={marcarTodas}>
                    ✓ Marcar todas como Finalizado
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
                  {tareasCompletando.map(tarea => (
                    <div key={tarea.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', borderRadius: '6px', border: '1px solid',
                      borderColor: tarea.estado === 'completado' ? '#a9dfbf' : tarea.estado === 'no_necesario' ? '#d5d8dc' : '#ecf0f1',
                      backgroundColor: tarea.estado === 'completado' ? '#eafaf1' : tarea.estado === 'no_necesario' ? '#f4f7f6' : '#ffffff',
                      transition: 'all 0.2s ease',
                    }}>
                      <span style={{
                        fontSize: '13px', flex: 1,
                        color: tarea.estado === 'no_necesario' ? '#95a5a6' : '#2c3e50',
                        textDecoration: tarea.estado === 'no_necesario' ? 'line-through' : 'none',
                      }}>
                        {tarea.texto}
                      </span>
                      <div style={{ display: 'flex', gap: '6px', marginLeft: '10px' }}>
                        <button type="button" onClick={() => toggleTareaEstado(tarea.id, 'completado')} style={{
                          padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', border: '1px solid',
                          borderColor: tarea.estado === 'completado' ? '#27ae60' : '#bdc3c7',
                          backgroundColor: tarea.estado === 'completado' ? '#27ae60' : 'transparent',
                          color: tarea.estado === 'completado' ? 'white' : '#7f8c8d',
                          transition: 'all 0.15s ease',
                        }}>✓ Completado</button>
                        <button type="button" onClick={() => toggleTareaEstado(tarea.id, 'no_necesario')} style={{
                          padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', border: '1px solid',
                          borderColor: tarea.estado === 'no_necesario' ? '#95a5a6' : '#bdc3c7',
                          backgroundColor: tarea.estado === 'no_necesario' ? '#ecf0f1' : 'transparent',
                          color: tarea.estado === 'no_necesario' ? '#5d6d7e' : '#7f8c8d',
                          transition: 'all 0.15s ease',
                        }}>No Necesario</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="modal-actions">
              <button type="button" className="btn-secondary"
                onClick={() => { setMostrarCompletarModal(false); setConfigCompletando(null); setError(null); }}
                disabled={finalizando}>
                Cancelar
              </button>
              <button type="button" onClick={finalizarMantenimiento}
                disabled={finalizando || (!todasResueltas && tareasCompletando.length > 0)}
                style={{
                  backgroundColor: todasResueltas || tareasCompletando.length === 0 ? '#27ae60' : '#95a5a6',
                  color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px',
                  fontSize: '14px', fontWeight: 'bold', cursor: finalizando || (!todasResueltas && tareasCompletando.length > 0) ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s ease',
                }}>
                {finalizando ? 'Procesando...' : 'Finalizar Mantenimiento'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}