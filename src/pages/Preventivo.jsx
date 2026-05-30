import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL;

// Periodicidad options — replaces old intervalo/tabs system
const PERIODICIDADES = [
  { value: '7',   label: '7 Días',   dias: 7   },
  { value: '15',  label: '15 Días',  dias: 15  },
  { value: '30',  label: '1 Mes',    dias: 30  },
  { value: '60',  label: '2 Meses',  dias: 60  },
  { value: '90',  label: '3 Meses',  dias: 90  },
  { value: '120', label: '4 Meses',  dias: 120 },
  { value: '150', label: '5 Meses',  dias: 150 },
  { value: '180', label: '6 Meses',  dias: 180 },
  { value: 'otro', label: 'Otro',    dias: null },
];

// --- Helpers ---

function diasHasta(fecha) {
  if (!fecha) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const target = new Date(fecha);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - hoy) / (1000 * 60 * 60 * 24));
}

// Returns { clase, texto, esVencido, esEnMantenimiento }
function calcularEstado(config) {
  // "En Mantenimiento" flag set by backend when maintenance window is active
  if (config.en_mantenimiento) {
    return { clase: 'warning', texto: 'En Mantenimiento', esEnMantenimiento: true, esVencido: false };
  }

  const dias = diasHasta(config.proxima_fecha);

  if (dias === null) {
    return { clase: 'ok', texto: 'Sin fecha', esVencido: false, esEnMantenimiento: false };
  }
  if (dias < 0) {
    return {
      clase: 'danger',
      texto: `Vencido hace ${Math.abs(dias)} día${Math.abs(dias) !== 1 ? 's' : ''}`,
      esVencido: true,
      esEnMantenimiento: false,
    };
  }
  if (dias === 0) {
    return { clase: 'danger', texto: 'Vence hoy', esVencido: false, esEnMantenimiento: false };
  }
  if (dias <= 7) {
    return { clase: 'warning', texto: `En ${dias} días`, esVencido: false, esEnMantenimiento: false };
  }
  return { clase: 'ok', texto: `En ${dias} días`, esVencido: false, esEnMantenimiento: false };
}

function addDays(dateStr, days) {
  const d = dateStr ? new Date(dateStr) : new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ============================================================
export default function Preventivo() {
  const [equipos,       setEquipos]       = useState([]);
  const [configs,       setConfigs]       = useState([]);
  const [cargando,      setCargando]      = useState(true);
  const [error,         setError]         = useState(null);
  const [mensajeExito,  setMensajeExito]  = useState(null);

  // --- Registro/Edición modal ---
  const [mostrarModal,  setMostrarModal]  = useState(false);
  const [guardando,     setGuardando]     = useState(false);
  const [modoEdicion,   setModoEdicion]   = useState(false);

  // --- Completar mantenimiento modal ---
  const [mostrarCompletarModal, setMostrarCompletarModal] = useState(false);
  const [configCompletando,     setConfigCompletando]     = useState(null);
  const [tareasCompletando,     setTareasCompletando]     = useState([]); // { texto, estado: 'pendiente'|'completado'|'no_necesario' }
  const [finalizando,           setFinalizando]           = useState(false);

  // --- Filters ---
  const [busqueda,    setBusqueda]    = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  // --- Form state ---
  const [form, setForm] = useState({
    clave_activo:     '',
    periodicidad:     '',
    periodicidad_dias: '',
    proveedor:        '',
    responsable:      '',
    tareas:           [], // [{ id, texto }]
  });

  useEffect(() => { cargarDatos(); }, []);

  // ── Data ──────────────────────────────────────────────────

  async function cargarDatos() {
    setCargando(true);
    setError(null);
    try {
      const [resEq, resConf] = await Promise.all([
        fetch(`${API_URL}/equipos`),
        fetch(`${API_URL}/preventivo`),
      ]);
      if (!resEq.ok)   throw new Error('Error al cargar equipos');
      if (!resConf.ok) throw new Error('Error al cargar configuraciones');
      const [dataEq, dataConf] = await Promise.all([resEq.json(), resConf.json()]);
      setEquipos(dataEq);
      setConfigs(dataConf);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  // ── Registro / Edición ────────────────────────────────────

  function abrirModalNuevo() {
    setModoEdicion(false);
    setForm({
      clave_activo: '', periodicidad: '', periodicidad_dias: '',
      proveedor: '', responsable: '', tareas: [],
    });
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
      proveedor:         config.proveedor || '',
      responsable:       config.responsable || '',
      tareas:            (config.tareas || []).map((t, i) => ({ id: Date.now() + i, texto: typeof t === 'string' ? t : t.texto })),
    });
    setError(null);
    setMostrarModal(true);
  }

  function handleInput(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  // Tareas management
  function agregarTarea() {
    setForm(prev => ({
      ...prev,
      tareas: [...prev.tareas, { id: Date.now(), texto: '' }],
    }));
  }

  function actualizarTarea(id, texto) {
    setForm(prev => ({
      ...prev,
      tareas: prev.tareas.map(t => t.id === id ? { ...t, texto } : t),
    }));
  }

  function eliminarTarea(id) {
    setForm(prev => ({
      ...prev,
      tareas: prev.tareas.filter(t => t.id !== id),
    }));
  }

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setError(null);

    const periObjeto = PERIODICIDADES.find(p => p.value === form.periodicidad);
    const diasCalculados = form.periodicidad === 'otro'
      ? parseInt(form.periodicidad_dias, 10)
      : periObjeto?.dias;

    if (!diasCalculados || diasCalculados < 1) {
      setError('Selecciona una periodicidad válida.');
      setGuardando(false);
      return;
    }

    // proxima_fecha = today + diasCalculados
    const proxima_fecha = addDays(null, diasCalculados);

    const tareasLimpias = form.tareas
      .map(t => t.texto.trim())
      .filter(Boolean);

    const payload = {
      clave_activo:   form.clave_activo,
      intervalo_dias: diasCalculados,
      proxima_fecha,
      proveedor:      form.proveedor,
      responsable:    form.responsable,
      tareas:         tareasLimpias,
    };

    try {
      const url    = modoEdicion ? `${API_URL}/preventivo/${form.clave_activo}` : `${API_URL}/preventivo`;
      const method = modoEdicion ? 'PUT' : 'POST';
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
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

  // ── Completar mantenimiento ───────────────────────────────

  function abrirCompletarModal(config) {
    setConfigCompletando(config);
    // Initialize each tarea with estado 'pendiente'
    const tareas = (config.tareas || []).map((t, i) => ({
      id:     i,
      texto:  typeof t === 'string' ? t : t.texto,
      estado: 'pendiente', // 'pendiente' | 'completado' | 'no_necesario'
    }));
    setTareasCompletando(tareas);
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

  const todasResueltas = tareasCompletando.every(t => t.estado === 'completado' || t.estado === 'no_necesario');

  async function finalizarMantenimiento() {
    if (!todasResueltas && tareasCompletando.length > 0) {
      setError('Debes marcar todas las tareas como Completado o No Necesario antes de finalizar.');
      return;
    }
    setFinalizando(true);
    setError(null);

    // Calculate next proxima_fecha from today + intervalo_dias
    const nuevaProxima = addDays(null, configCompletando.intervalo_dias);

    const payload = {
      proxima_fecha:  nuevaProxima,
      ultima_ejecucion: new Date().toISOString().slice(0, 10),
      en_mantenimiento: false,
      tareas_resultado: tareasCompletando.map(t => ({ texto: t.texto, estado: t.estado })),
    };

    try {
      const res = await fetch(`${API_URL}/preventivo/${configCompletando.clave_activo}/completar`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al completar mantenimiento');
      }
      setMostrarCompletarModal(false);
      setConfigCompletando(null);
      setMensajeExito(`Mantenimiento completado. Próximo ciclo: ${new Date(nuevaProxima).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}`);
      setTimeout(() => setMensajeExito(null), 5000);
      cargarDatos();
    } catch (err) {
      setError(err.message);
    } finally {
      setFinalizando(false);
    }
  }

  // ── Computed ──────────────────────────────────────────────

  const configsFiltradas = configs.filter(c => {
    const coincideBusqueda = busqueda === '' || c.clave_activo.toLowerCase().includes(busqueda.toLowerCase());
    if (!coincideBusqueda) return false;

    if (filtroEstado === '') return true;
    const est = calcularEstado(c);
    if (filtroEstado === 'vencido')       return est.esVencido;
    if (filtroEstado === 'mantenimiento') return est.esEnMantenimiento;
    if (filtroEstado === 'proximo')       return !est.esVencido && !est.esEnMantenimiento && diasHasta(c.proxima_fecha) !== null && diasHasta(c.proxima_fecha) <= 7 && diasHasta(c.proxima_fecha) >= 0;
    if (filtroEstado === 'ok')            return est.clase === 'ok' && !est.esVencido && !est.esEnMantenimiento;
    return true;
  });

  const kpiVencidos       = configs.filter(c => calcularEstado(c).esVencido).length;
  const kpiMantenimiento  = configs.filter(c => calcularEstado(c).esEnMantenimiento).length;
  const kpiProximos7      = configs.filter(c => {
    const d = diasHasta(c.proxima_fecha);
    return d !== null && d >= 0 && d <= 7 && !calcularEstado(c).esEnMantenimiento;
  }).length;

  const labelPeriodicidad = (config) => {
    const p = PERIODICIDADES.find(p => p.dias === config.intervalo_dias);
    return p ? p.label : `${config.intervalo_dias} días`;
  };

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="dashboard-container">

      {/* Header */}
      <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Mantenimiento Preventivo</h1>
          <p>Configuración de periodicidades, tareas y responsables por equipo</p>
        </div>
        <button className="btn-primary" onClick={abrirModalNuevo}>+ Asignar Preventivo</button>
      </header>

      {/* Banners */}
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
          <h3>Vencidas</h3>
          <p className="kpi-number danger-text">{kpiVencidos}</p>
          <span className="kpi-status danger">Requieren atención inmediata</span>
        </div>
        <div className="kpi-card">
          <h3>En Mantenimiento</h3>
          <p className="kpi-number warning-text">{kpiMantenimiento}</p>
          <span className="kpi-status warning">Ciclo activo en curso</span>
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
          <option value="vencido">Vencidos</option>
          <option value="mantenimiento">En Mantenimiento</option>
          <option value="proximo">Próximos 7 días</option>
          <option value="ok">Al corriente</option>
        </select>
      </div>

      {/* Table */}
      <section className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Equipo</th>
              <th>Periodicidad</th>
              <th>Proveedor / Responsable</th>
              <th>Tareas</th>
              <th>Próxima fecha</th>
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
              configsFiltradas.map(config => {
                const est = calcularEstado(config);

                return (
                  <tr key={config.id || config.clave_activo}>
                    {/* Equipo */}
                    <td>
                      <strong>{config.clave_activo}</strong><br />
                      <small style={{ color: '#7f8c8d' }}>{config.equipo?.marca} {config.equipo?.modelo}</small>
                    </td>

                    {/* Periodicidad */}
                    <td>
                      <span style={{
                        padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: '600',
                        backgroundColor: '#e8f4fd', color: '#2980b9',
                      }}>
                        {labelPeriodicidad(config)}
                      </span>
                      <br />
                      <small style={{ color: '#7f8c8d', fontSize: '11px' }}>
                        Última: {config.ultima_ejecucion ? new Date(config.ultima_ejecucion).toLocaleDateString('es-MX') : '—'}
                      </small>
                    </td>

                    {/* Proveedor / Responsable */}
                    <td>
                      <span style={{ fontSize: '13px' }}>{config.proveedor || '—'}</span>
                      {config.responsable && (
                        <>
                          <br />
                          <small style={{ color: '#7f8c8d' }}>Resp: {config.responsable}</small>
                        </>
                      )}
                    </td>

                    {/* Tareas */}
                    <td>
                      {(config.tareas && config.tareas.length > 0) ? (
                        <span style={{ fontSize: '13px', color: '#2c3e50' }}>
                          {config.tareas.length} tarea{config.tareas.length !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#bdc3c7' }}>Sin tareas</span>
                      )}
                    </td>

                    {/* Próxima fecha */}
                    <td>
                      <strong style={{ fontSize: '13px' }}>
                        {config.proxima_fecha
                          ? new Date(config.proxima_fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      </strong>
                    </td>

                    {/* Estado */}
                    <td>
                      <span className={`badge ${est.clase}`}>{est.texto}</span>
                    </td>

                    {/* Acciones */}
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {(est.esEnMantenimiento || est.esVencido) && (
                          <button
                            className="btn-icon"
                            style={{ borderColor: '#27ae60', color: '#27ae60' }}
                            onClick={() => abrirCompletarModal(config)}
                          >
                            ✓ Completar
                          </button>
                        )}
                        <button className="btn-icon" onClick={() => abrirModalEditar(config)}>
                          Editar
                        </button>
                        <button
                          className="btn-icon"
                          style={{ borderColor: '#e74c3c', color: '#e74c3c' }}
                          onClick={() => eliminar(config.clave_activo)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      {/* ─── Modal: Registro / Edición ─────────────────────── */}
      {mostrarModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
              {modoEdicion ? 'Editar Configuración Preventiva' : 'Asignar Mantenimiento Preventivo'}
            </h2>

            {error && (
              <div style={{ backgroundColor: '#fceceb', color: '#e74c3c', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '15px' }}>
                {error}
              </div>
            )}

            <form onSubmit={guardar}>

              {/* Equipo */}
              <div className="form-group">
                <label>Equipo</label>
                <select
                  name="clave_activo"
                  value={form.clave_activo}
                  onChange={handleInput}
                  required
                  disabled={modoEdicion}
                  style={modoEdicion ? { backgroundColor: '#f4f7f6', cursor: 'not-allowed' } : {}}
                >
                  <option value="">-- Seleccionar equipo --</option>
                  {equipos.map(eq => (
                    <option key={eq.clave_activo} value={eq.clave_activo}>
                      {eq.clave_activo} — {eq.marca} {eq.modelo}
                    </option>
                  ))}
                </select>
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
                    <input
                      type="number"
                      name="periodicidad_dias"
                      value={form.periodicidad_dias}
                      onChange={handleInput}
                      placeholder="Ej. 45"
                      min="1"
                      required
                    />
                  </div>
                )}
              </div>

              {/* Proveedor + Responsable */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>Proveedor Asignado (Opcional)</label>
                  <input
                    type="text"
                    name="proveedor"
                    value={form.proveedor}
                    onChange={handleInput}
                    placeholder="Nombre del proveedor"
                  />
                </div>
                <div className="form-group">
                  <label>Responsable</label>
                  <input
                    type="text"
                    name="responsable"
                    value={form.responsable}
                    onChange={handleInput}
                    placeholder="Nombre del responsable"
                  />
                </div>
              </div>

              {/* Tareas */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '600', color: '#7f8c8d' }}>
                    Lista de Tareas
                  </label>
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={agregarTarea}
                    style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
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
                      <span style={{ fontSize: '12px', color: '#bdc3c7', minWidth: '18px', textAlign: 'right' }}>
                        {idx + 1}.
                      </span>
                      <input
                        type="text"
                        value={tarea.texto}
                        onChange={e => actualizarTarea(tarea.id, e.target.value)}
                        placeholder="Descripción de la tarea..."
                        style={{ flex: 1, padding: '8px 10px', border: '1px solid #bdc3c7', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
                        onFocus={e => e.target.style.borderColor = '#3498db'}
                        onBlur={e => e.target.style.borderColor = '#bdc3c7'}
                      />
                      <button
                        type="button"
                        onClick={() => eliminarTarea(tarea.id)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer', color: '#e74c3c',
                          fontSize: '16px', padding: '4px', lineHeight: 1, borderRadius: '4px',
                        }}
                        title="Eliminar tarea"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setMostrarModal(false)} disabled={guardando}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={guardando}>
                  {guardando ? 'Procesando...' : modoEdicion ? 'Aplicar Modificaciones' : 'Confirmar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal: Completar Mantenimiento ────────────────── */}
      {mostrarCompletarModal && configCompletando && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto' }}>

            {/* Header */}
            <div style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
              <h2 style={{ marginBottom: '4px' }}>Completar Mantenimiento</h2>
              <p style={{ fontSize: '13px', color: '#7f8c8d', margin: 0 }}>
                {configCompletando.clave_activo}
                {configCompletando.equipo && ` — ${configCompletando.equipo.marca} ${configCompletando.equipo.modelo}`}
              </p>
            </div>

            {error && (
              <div style={{ backgroundColor: '#fceceb', color: '#e74c3c', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '15px' }}>
                {error}
              </div>
            )}

            {/* Next cycle info */}
            <div style={{ backgroundColor: '#eafaf1', border: '1px solid #a9dfbf', borderRadius: '6px', padding: '10px 14px', marginBottom: '20px', fontSize: '13px', color: '#1e8449' }}>
              Al finalizar, el próximo mantenimiento se programará para{' '}
              <strong>{new Date(addDays(null, configCompletando.intervalo_dias)).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>
              {' '}({labelPeriodicidad(configCompletando)} a partir de hoy).
            </div>

            {/* Tareas checklist */}
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
                  <button
                    type="button"
                    className="btn-icon"
                    style={{ borderColor: '#27ae60', color: '#27ae60' }}
                    onClick={marcarTodas}
                  >
                    ✓ Marcar todas como Finalizado
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
                  {tareasCompletando.map(tarea => (
                    <div
                      key={tarea.id}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '1px solid',
                        borderColor: tarea.estado === 'completado'  ? '#a9dfbf'
                                   : tarea.estado === 'no_necesario' ? '#d5d8dc'
                                   : '#ecf0f1',
                        backgroundColor: tarea.estado === 'completado'  ? '#eafaf1'
                                        : tarea.estado === 'no_necesario' ? '#f4f7f6'
                                        : '#ffffff',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <span style={{
                        fontSize: '13px',
                        color: tarea.estado === 'no_necesario' ? '#95a5a6' : '#2c3e50',
                        textDecoration: tarea.estado === 'no_necesario' ? 'line-through' : 'none',
                        flex: 1,
                      }}>
                        {tarea.texto}
                      </span>
                      <div style={{ display: 'flex', gap: '6px', marginLeft: '10px' }}>
                        <button
                          type="button"
                          onClick={() => toggleTareaEstado(tarea.id, 'completado')}
                          style={{
                            padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px',
                            fontWeight: '600', border: '1px solid',
                            borderColor: tarea.estado === 'completado' ? '#27ae60' : '#bdc3c7',
                            backgroundColor: tarea.estado === 'completado' ? '#27ae60' : 'transparent',
                            color: tarea.estado === 'completado' ? 'white' : '#7f8c8d',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          ✓ Completado
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleTareaEstado(tarea.id, 'no_necesario')}
                          style={{
                            padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px',
                            fontWeight: '600', border: '1px solid',
                            borderColor: tarea.estado === 'no_necesario' ? '#95a5a6' : '#bdc3c7',
                            backgroundColor: tarea.estado === 'no_necesario' ? '#ecf0f1' : 'transparent',
                            color: tarea.estado === 'no_necesario' ? '#5d6d7e' : '#7f8c8d',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          No Necesario
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Actions */}
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => { setMostrarCompletarModal(false); setConfigCompletando(null); setError(null); }}
                disabled={finalizando}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={finalizarMantenimiento}
                disabled={finalizando || (!todasResueltas && tareasCompletando.length > 0)}
                style={{
                  backgroundColor: todasResueltas || tareasCompletando.length === 0 ? '#27ae60' : '#95a5a6',
                  transition: 'background-color 0.2s ease',
                }}
              >
                {finalizando ? 'Procesando...' : 'Finalizar Mantenimiento'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}