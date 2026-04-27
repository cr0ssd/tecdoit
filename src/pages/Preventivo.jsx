import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL;

const INTERVALOS = [
  { value: '2_semanas', label: 'Cada 2 semanas', dias: 14 },
  { value: '1_mes', label: 'Cada mes', dias: 30 },
  { value: '2_meses', label: 'Cada 2 meses', dias: 60 },
  { value: '3_meses', label: 'Cada 3 meses', dias: 90 },
  { value: '6_meses', label: 'Cada 6 meses', dias: 180 },
  { value: 'personalizado', label: 'Personalizado (días)', dias: null },
];

const TIPOS_REQUERIMIENTO = [
  'Limpieza general',
  'Calibración',
  'Cambio de baterías',
  'Revisión eléctrica',
  'Lubricación',
  'Actualización de firmware',
  'Otro',
];

function diasHastaFecha(fecha) {
  if (!fecha) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const target = new Date(fecha);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - hoy) / (1000 * 60 * 60 * 24));
}

function estadoProximaFecha(dias) {
  if (dias === null) return { clase: 'ok', texto: 'Sin fecha' };
  if (dias < 0) return { clase: 'danger', texto: `Vencido hace ${Math.abs(dias)} días` };
  if (dias === 0) return { clase: 'danger', texto: 'Vence hoy' };
  if (dias <= 7) return { clase: 'warning', texto: `En ${dias} días` };
  return { clase: 'ok', texto: `En ${dias} días` };
}

export default function Preventivo() {
  const [equipos, setEquipos] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);

  const [mostrarModal, setMostrarModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [tabActiva, setTabActiva] = useState('tiempo'); // 'tiempo' | 'horas'

  const [filtroModo, setFiltroModo] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const [form, setForm] = useState({
    clave_activo: '',
    modo: 'tiempo',
    intervalo: '',
    intervalo_dias: '',
    ultima_ejecucion: '',
    limite_horas_preventivo: '',
    tipo_requerimiento: '',
    descripcion_requerimiento: '',
  });

  useEffect(() => { cargarDatos(); }, []);

  async function cargarDatos() {
    setCargando(true);
    setError(null);
    try {
      const [resEq, resConf] = await Promise.all([
        fetch(`${API_URL}/equipos`),
        fetch(`${API_URL}/preventivo`),
      ]);
      if (!resEq.ok) throw new Error('Error al cargar equipos');
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

  function abrirModalNuevo() {
    setModoEdicion(false);
    setForm({
      clave_activo: '', modo: 'tiempo', intervalo: '', intervalo_dias: '',
      ultima_ejecucion: '', limite_horas_preventivo: '',
      tipo_requerimiento: '', descripcion_requerimiento: '',
    });
    setTabActiva('tiempo');
    setError(null);
    setMostrarModal(true);
  }

  function abrirModalEditar(config) {
    setModoEdicion(true);
    setForm({
      clave_activo: config.clave_activo,
      modo: config.modo,
      intervalo: config.intervalo || '',
      intervalo_dias: config.intervalo_dias || '',
      ultima_ejecucion: config.ultima_ejecucion ? config.ultima_ejecucion.slice(0, 10) : '',
      limite_horas_preventivo: config.limite_horas_preventivo || '',
      tipo_requerimiento: config.tipo_requerimiento || '',
      descripcion_requerimiento: config.descripcion_requerimiento || '',
    });
    setTabActiva(config.modo);
    setError(null);
    setMostrarModal(true);
  }

  function handleInput(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function handleTabCambio(tab) {
    setTabActiva(tab);
    setForm(prev => ({ ...prev, modo: tab }));
  }

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setError(null);

    const intervaloSeleccionado = INTERVALOS.find(i => i.value === form.intervalo);
    const diasCalculados = form.intervalo === 'personalizado'
      ? parseInt(form.intervalo_dias)
      : intervaloSeleccionado?.dias;

    let proxima_fecha = null;
    if (form.modo === 'tiempo' && form.ultima_ejecucion && diasCalculados) {
      const base = new Date(form.ultima_ejecucion);
      base.setDate(base.getDate() + diasCalculados);
      proxima_fecha = base.toISOString().slice(0, 10);
    }

    const payload = {
      clave_activo: form.clave_activo,
      modo: form.modo,
      intervalo: form.modo === 'tiempo' ? form.intervalo : null,
      intervalo_dias: form.modo === 'tiempo' ? diasCalculados : null,
      ultima_ejecucion: form.modo === 'tiempo' ? form.ultima_ejecucion || null : null,
      proxima_fecha,
      limite_horas_preventivo: form.modo === 'horas' ? form.limite_horas_preventivo : null,
      tipo_requerimiento: form.tipo_requerimiento,
      descripcion_requerimiento: form.tipo_requerimiento === 'Otro' ? form.descripcion_requerimiento : null,
    };

    try {
      const url = modoEdicion
        ? `${API_URL}/preventivo/${form.clave_activo}`
        : `${API_URL}/preventivo`;
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
      setMensajeExito(modoEdicion ? 'Configuración actualizada.' : 'Configuración de preventivo registrada.');
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
      cargarDatos();
    } catch (err) {
      setError(err.message);
    }
  }

  async function marcarEjecutado(config) {
    try {
      const hoy = new Date().toISOString().slice(0, 10);
      const diasCalculados = config.intervalo_dias;
      const base = new Date(hoy);
      base.setDate(base.getDate() + diasCalculados);
      const proxima_fecha = base.toISOString().slice(0, 10);

      const res = await fetch(`${API_URL}/preventivo/${config.clave_activo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, ultima_ejecucion: hoy, proxima_fecha }),
      });
      if (!res.ok) throw new Error('Error al actualizar');
      setMensajeExito(`Mantenimiento ejecutado registrado para ${config.clave_activo}.`);
      setTimeout(() => setMensajeExito(null), 3500);
      cargarDatos();
    } catch (err) {
      setError(err.message);
    }
  }

  const configsFiltradas = configs.filter(c => {
    const coincideModo = filtroModo === '' || c.modo === filtroModo;
    const coincideBusqueda = busqueda === '' || c.clave_activo.toLowerCase().includes(busqueda.toLowerCase());
    return coincideModo && coincideBusqueda;
  });

  // Separate stats
  const vencidos = configs.filter(c => c.modo === 'tiempo' && diasHastaFecha(c.proxima_fecha) < 0).length;
  const proximos7 = configs.filter(c => c.modo === 'tiempo' && diasHastaFecha(c.proxima_fecha) >= 0 && diasHastaFecha(c.proxima_fecha) <= 7).length;

  return (
    <div className="dashboard-container">
      <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Mantenimiento Preventivo</h1>
          <p>Configuración de intervalos de tiempo y umbrales de uso por equipo</p>
        </div>
        <button className="btn-primary" onClick={abrirModalNuevo}>+ Asignar Preventivo</button>
      </header>

      {error && !mostrarModal && (
        <div style={{ backgroundColor: '#fceceb', color: '#e74c3c', padding: '12px 16px', borderRadius: '6px', fontSize: '14px' }}>{error}</div>
      )}
      {mensajeExito && (
        <div style={{ backgroundColor: '#eafaf1', color: '#27ae60', padding: '12px 16px', borderRadius: '6px', fontSize: '14px' }}>{mensajeExito}</div>
      )}

      {/* KPI Row */}
      <section className="kpi-grid">
        <div className="kpi-card">
          <h3>Configuraciones Activas</h3>
          <p className="kpi-number">{configs.length}</p>
          <span className="kpi-status info">Total registradas</span>
        </div>
        <div className="kpi-card">
          <h3>Vencidas</h3>
          <p className="kpi-number danger-text">{vencidos}</p>
          <span className="kpi-status danger">Requieren atención inmediata</span>
        </div>
        <div className="kpi-card">
          <h3>Próximos 7 días</h3>
          <p className="kpi-number warning-text">{proximos7}</p>
          <span className="kpi-status warning">Programar pronto</span>
        </div>
        <div className="kpi-card">
          <h3>Basadas en Horas</h3>
          <p className="kpi-number">{configs.filter(c => c.modo === 'horas').length}</p>
          <span className="kpi-status ok">Monitoreo de uso</span>
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
        <select className="select-filter" value={filtroModo} onChange={e => setFiltroModo(e.target.value)}>
          <option value="">Todos los modos</option>
          <option value="tiempo">Por Tiempo</option>
          <option value="horas">Por Horas</option>
        </select>
      </div>

      {/* Table */}
      <section className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Equipo</th>
              <th>Modo</th>
              <th>Requerimiento</th>
              <th>Configuración</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>Procesando información...</td></tr>
            ) : configsFiltradas.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>No se localizaron registros bajo los criterios especificados.</td></tr>
            ) : (
              configsFiltradas.map(config => {
                const diasRestantes = config.modo === 'tiempo' ? diasHastaFecha(config.proxima_fecha) : null;
                const estado = config.modo === 'tiempo' ? estadoProximaFecha(diasRestantes) : null;

                // Hours mode: compare equipos horas_acumuladas vs limite
                const pctHoras = config.modo === 'horas' && config.limite_horas_preventivo
                  ? Math.min(100, Math.round(((config.equipo?.horas_acumuladas || 0) / config.limite_horas_preventivo) * 100))
                  : null;

                return (
                  <tr key={config.id}>
                    <td>
                      <strong>{config.clave_activo}</strong><br />
                      <small style={{ color: '#7f8c8d' }}>{config.equipo?.marca} {config.equipo?.modelo}</small>
                    </td>
                    <td>
                      <span style={{
                        padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '600',
                        backgroundColor: config.modo === 'tiempo' ? '#e8f4fd' : '#eafaf1',
                        color: config.modo === 'tiempo' ? '#2980b9' : '#27ae60'
                      }}>
                        {config.modo === 'tiempo' ? '🗓 Tiempo' : '⏱ Horas'}
                      </span>
                    </td>
                    <td>
                      <strong style={{ fontSize: '13px' }}>{config.tipo_requerimiento || '—'}</strong>
                      {config.descripcion_requerimiento && (
                        <><br /><small style={{ color: '#7f8c8d' }}>{config.descripcion_requerimiento}</small></>
                      )}
                    </td>
                    <td>
                      {config.modo === 'tiempo' ? (
                        <>
                          <small>Intervalo: <strong>{INTERVALOS.find(i => i.value === config.intervalo)?.label || `${config.intervalo_dias} días`}</strong></small><br />
                          <small>Última vez: {config.ultima_ejecucion ? new Date(config.ultima_ejecucion).toLocaleDateString('es-MX') : '—'}</small><br />
                          <small>Próxima: <strong>{config.proxima_fecha ? new Date(config.proxima_fecha).toLocaleDateString('es-MX') : '—'}</strong></small>
                        </>
                      ) : (
                        <>
                          <small>Límite: <strong>{config.limite_horas_preventivo} hrs</strong></small><br />
                          <small>Acumuladas: <strong>{config.equipo?.horas_acumuladas || 0} hrs</strong></small>
                          {pctHoras !== null && (
                            <div style={{ marginTop: '4px' }}>
                              <div style={{ height: '6px', backgroundColor: '#ecf0f1', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{
                                  height: '100%', borderRadius: '3px',
                                  width: `${pctHoras}%`,
                                  backgroundColor: pctHoras >= 100 ? '#e74c3c' : pctHoras >= 80 ? '#f39c12' : '#27ae60',
                                  transition: 'width 0.3s'
                                }} />
                              </div>
                              <small style={{ fontSize: '10px', color: '#7f8c8d' }}>{pctHoras}% del umbral</small>
                            </div>
                          )}
                        </>
                      )}
                    </td>
                    <td>
                      {config.modo === 'tiempo' && estado ? (
                        <span className={`badge ${estado.clase}`}>{estado.texto}</span>
                      ) : config.modo === 'horas' ? (
                        <span className={`badge ${pctHoras >= 100 ? 'danger' : pctHoras >= 80 ? 'warning' : 'ok'}`}>
                          {pctHoras >= 100 ? 'Requiere mantenimiento' : pctHoras >= 80 ? 'Próximo al límite' : 'En operación'}
                        </span>
                      ) : null}
                    </td>
                    <td style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {config.modo === 'tiempo' && (
                        <button className="btn-icon" style={{ borderColor: '#27ae60', color: '#27ae60' }}
                          onClick={() => marcarEjecutado(config)}>
                          ✓ Ejecutado
                        </button>
                      )}
                      <button className="btn-icon" onClick={() => abrirModalEditar(config)}>Editar</button>
                      <button className="btn-icon" style={{ borderColor: '#e74c3c', color: '#e74c3c' }}
                        onClick={() => eliminar(config.clave_activo)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      {/* Modal */}
      {mostrarModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
              {modoEdicion ? 'Editar Configuración Preventiva' : 'Asignar Mantenimiento Preventivo'}
            </h2>

            {error && (
              <div style={{ backgroundColor: '#fceceb', color: '#e74c3c', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '15px' }}>{error}</div>
            )}

            {/* Mode tabs */}
            <div style={{ display: 'flex', gap: '0', marginBottom: '20px', border: '1px solid #bdc3c7', borderRadius: '6px', overflow: 'hidden' }}>
              {[{ key: 'tiempo', label: '🗓 Por Tiempo / Fecha' }, { key: 'horas', label: '⏱ Por Horas de Uso' }].map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleTabCambio(tab.key)}
                  style={{
                    flex: 1, padding: '10px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                    backgroundColor: tabActiva === tab.key ? '#3498db' : 'transparent',
                    color: tabActiva === tab.key ? 'white' : '#7f8c8d',
                    transition: 'all 0.2s'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={guardar}>
              {/* Equipo selector */}
              <div className="form-group">
                <label>Equipo</label>
                <select name="clave_activo" value={form.clave_activo} onChange={handleInput} required disabled={modoEdicion}
                  style={modoEdicion ? { backgroundColor: '#f4f7f6', cursor: 'not-allowed' } : {}}>
                  <option value="">-- Seleccionar equipo --</option>
                  {equipos.map(eq => (
                    <option key={eq.clave_activo} value={eq.clave_activo}>
                      {eq.clave_activo} — {eq.marca} {eq.modelo}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipo de requerimiento */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>Tipo de Requerimiento</label>
                  <select name="tipo_requerimiento" value={form.tipo_requerimiento} onChange={handleInput} required>
                    <option value="">-- Seleccionar --</option>
                    {TIPOS_REQUERIMIENTO.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                {form.tipo_requerimiento === 'Otro' && (
                  <div className="form-group">
                    <label>Descripción del requerimiento</label>
                    <input type="text" name="descripcion_requerimiento" value={form.descripcion_requerimiento}
                      onChange={handleInput} placeholder="Describe el motivo..." required />
                  </div>
                )}
              </div>

              {/* Tiempo mode */}
              {tabActiva === 'tiempo' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div className="form-group">
                      <label>Intervalo de mantenimiento</label>
                      <select name="intervalo" value={form.intervalo} onChange={handleInput} required>
                        <option value="">-- Seleccionar --</option>
                        {INTERVALOS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                      </select>
                    </div>
                    {form.intervalo === 'personalizado' && (
                      <div className="form-group">
                        <label>Número de días</label>
                        <input type="number" name="intervalo_dias" value={form.intervalo_dias}
                          onChange={handleInput} placeholder="Ej. 45" min="1" required />
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Última fecha de ejecución</label>
                    <input type="date" name="ultima_ejecucion" value={form.ultima_ejecucion} onChange={handleInput} />
                    <small style={{ color: '#7f8c8d', fontSize: '12px' }}>
                      La próxima fecha se calculará automáticamente al guardar.
                    </small>
                  </div>
                </>
              )}

              {/* Horas mode */}
              {tabActiva === 'horas' && (
                <div className="form-group">
                  <label>Límite de horas de uso antes del mantenimiento</label>
                  <input type="number" step="0.5" name="limite_horas_preventivo" value={form.limite_horas_preventivo}
                    onChange={handleInput} placeholder="Ej. 60" min="1" required />
                  <small style={{ color: '#7f8c8d', fontSize: '12px' }}>
                    El sistema alertará cuando las horas acumuladas del equipo alcancen este valor.
                  </small>
                </div>
              )}

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
    </div>
  );
}