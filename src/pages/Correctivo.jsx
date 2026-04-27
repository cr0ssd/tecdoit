import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL;

const ESTATUS_COLORES = {
  'Abierto':      { clase: 'warning', bg: '#fef5e7', color: '#f39c12' },
  'En progreso':  { clase: 'info',    bg: '#e8f4fd', color: '#2980b9' },
  'Resuelto':     { clase: 'ok',      bg: '#eafaf1', color: '#27ae60' },
  'Sin solución': { clase: 'danger',  bg: '#fceceb', color: '#e74c3c' },
};

function formatFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function formatFechaCorta(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatMoneda(val) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val || 0);
}

// ─── Sub-panel: History of a single ticket ────────────────────────────────────
function HistorialTicket({ ticket, onClose }) {
  const [seguimientos, setSeguimientos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [nuevaNota, setNuevaNota] = useState('');
  const [responsableNota, setResponsableNota] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { cargarSeguimientos(); }, []);

  async function cargarSeguimientos() {
    setCargando(true);
    try {
      const res = await fetch(`${API_URL}/correctivo/${ticket.id}/seguimiento`);
      if (!res.ok) throw new Error('Error al cargar historial');
      setSeguimientos(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  async function agregarNota(e) {
    e.preventDefault();
    if (!nuevaNota.trim()) return;
    setGuardando(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/correctivo/${ticket.id}/seguimiento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nota: nuevaNota, responsable: responsableNota }),
      });
      if (!res.ok) throw new Error('Error al agregar nota');
      setNuevaNota('');
      setResponsableNota('');
      cargarSeguimientos();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  const estConfig = ESTATUS_COLORES[ticket.estatus] || ESTATUS_COLORES['Abierto'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '680px', maxHeight: '85vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '14px' }}>
          <div>
            <h2 style={{ fontSize: '18px', color: '#2c3e50', marginBottom: '4px' }}>
              Ticket #{ticket.id} — {ticket.clave_activo}
            </h2>
            <p style={{ fontSize: '13px', color: '#7f8c8d' }}>{ticket.descripcion_falla}</p>
          </div>
          <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700', backgroundColor: estConfig.bg, color: estConfig.color, whiteSpace: 'nowrap' }}>
            {ticket.estatus}
          </span>
        </div>

        {/* Ticket summary */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px', backgroundColor: '#f8f9fa', borderRadius: '6px', padding: '14px' }}>
          {[
            ['Responsable', ticket.responsable || '—'],
            ['Tipo de solución', ticket.es_solucion_interna ? '🏠 Interna' : '🔧 Proveedor externo'],
            ['Fecha de reporte', formatFechaCorta(ticket.fecha_reporte)],
            ['Fecha estimada cierre', formatFechaCorta(ticket.fecha_estimada_cierre)],
            ['Costo estimado', formatMoneda(ticket.costo_estimado)],
            ['Costo real', ticket.costo_real != null ? formatMoneda(ticket.costo_real) : '—'],
          ].map(([label, val]) => (
            <div key={label}>
              <div style={{ fontSize: '11px', color: '#7f8c8d', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>{label}</div>
              <div style={{ fontSize: '13px', color: '#2c3e50', fontWeight: '600' }}>{val}</div>
            </div>
          ))}
        </div>

        {ticket.descripcion_solucion && (
          <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#eafaf1', borderRadius: '6px', borderLeft: '3px solid #27ae60' }}>
            <div style={{ fontSize: '11px', color: '#27ae60', fontWeight: '700', marginBottom: '4px' }}>RESOLUCIÓN</div>
            <p style={{ fontSize: '13px', color: '#2c3e50' }}>{ticket.descripcion_solucion}</p>
          </div>
        )}

        {/* Follow-up timeline */}
        <h3 style={{ fontSize: '14px', color: '#2c3e50', marginBottom: '12px', fontWeight: '700' }}>Historial de seguimiento</h3>

        {error && (
          <div style={{ backgroundColor: '#fceceb', color: '#e74c3c', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '12px' }}>{error}</div>
        )}

        <div style={{ marginBottom: '20px' }}>
          {cargando ? (
            <p style={{ textAlign: 'center', color: '#7f8c8d', fontSize: '13px', padding: '20px' }}>Cargando historial...</p>
          ) : seguimientos.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#7f8c8d', fontSize: '13px', padding: '20px' }}>Sin notas de seguimiento aún.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {seguimientos.map((s, i) => (
                <div key={s.id || i} style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#3498db', marginTop: '3px', flexShrink: 0 }} />
                    {i < seguimientos.length - 1 && <div style={{ width: '2px', flex: 1, backgroundColor: '#ecf0f1', marginTop: '4px' }} />}
                  </div>
                  <div style={{ flex: 1, paddingBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#2c3e50' }}>{s.responsable || 'Sistema'}</span>
                      <span style={{ fontSize: '11px', color: '#7f8c8d' }}>{formatFecha(s.fecha)}</span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#34495e', margin: 0 }}>{s.nota}</p>
                    {s.estatus_nuevo && (
                      <span style={{ fontSize: '11px', color: '#7f8c8d', marginTop: '4px', display: 'inline-block' }}>
                        Estado → <strong style={{ color: ESTATUS_COLORES[s.estatus_nuevo]?.color }}>{s.estatus_nuevo}</strong>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add note form */}
        <div style={{ borderTop: '1px solid #ecf0f1', paddingTop: '16px' }}>
          <h3 style={{ fontSize: '13px', color: '#2c3e50', fontWeight: '700', marginBottom: '10px' }}>Agregar nota de seguimiento</h3>
          <form onSubmit={agregarNota} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="text"
              placeholder="Responsable (opcional)"
              value={responsableNota}
              onChange={e => setResponsableNota(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #bdc3c7', borderRadius: '6px', fontSize: '13px' }}
            />
            <textarea
              placeholder="Escribe una nota de seguimiento..."
              value={nuevaNota}
              onChange={e => setNuevaNota(e.target.value)}
              required
              rows={3}
              style={{ padding: '8px 12px', border: '1px solid #bdc3c7', borderRadius: '6px', fontSize: '13px', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn-secondary" onClick={onClose}>Cerrar</button>
              <button type="submit" className="btn-primary" disabled={guardando}>
                {guardando ? 'Enviando...' : 'Agregar nota'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Main Correctivo component ────────────────────────────────────────────────
export default function Correctivo() {
  const [tickets, setTickets] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);

  const [filtroEstatus, setFiltroEstatus] = useState('');
  const [filtroClave, setFiltroClave] = useState('');
  const [busqueda, setBusqueda] = useState('');

  // Modals
  const [mostrarModalNuevo, setMostrarModalNuevo] = useState(false);
  const [mostrarModalCerrar, setMostrarModalCerrar] = useState(false);
  const [ticketSeleccionado, setTicketSeleccionado] = useState(null);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // New ticket form
  const [form, setForm] = useState({
    clave_activo: '',
    descripcion_falla: '',
    es_solucion_interna: true,
    responsable: '',
    id_proveedor: '',
    fecha_estimada_cierre: '',
    costo_estimado: '',
    notas_seguimiento: '',
  });

  // Close ticket form
  const [formCierre, setFormCierre] = useState({
    tuvo_solucion: '',
    descripcion_solucion: '',
    costo_real: '',
    estatus: 'Resuelto',
  });

  useEffect(() => { cargarDatos(); }, []);

  async function cargarDatos() {
    setCargando(true);
    setError(null);
    try {
      const [resTickets, resEq, resProv] = await Promise.all([
        fetch(`${API_URL}/correctivo`),
        fetch(`${API_URL}/equipos`),
        fetch(`${API_URL}/proveedores`),
      ]);
      if (!resTickets.ok) throw new Error('Error al cargar tickets');
      const [dataTickets, dataEq, dataProv] = await Promise.all([
        resTickets.json(), resEq.json(), resProv.json(),
      ]);
      setTickets(dataTickets);
      setEquipos(dataEq);
      setProveedores(dataProv);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  function handleInput(e) {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  function handleCierreInput(e) {
    const { name, value } = e.target;
    setFormCierre(prev => ({ ...prev, [name]: value }));
  }

  function abrirNuevoTicket(clavePreset = '') {
    setForm({
      clave_activo: clavePreset,
      descripcion_falla: '',
      es_solucion_interna: true,
      responsable: '',
      id_proveedor: '',
      fecha_estimada_cierre: '',
      costo_estimado: '',
      notas_seguimiento: '',
    });
    setError(null);
    setMostrarModalNuevo(true);
  }

  function abrirCierreTicket(ticket) {
    setTicketSeleccionado(ticket);
    setFormCierre({ tuvo_solucion: '', descripcion_solucion: '', costo_real: '', estatus: 'Resuelto' });
    setError(null);
    setMostrarModalCerrar(true);
  }

  function abrirHistorial(ticket) {
    setTicketSeleccionado(ticket);
    setMostrarHistorial(true);
  }

  async function crearTicket(e) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      const payload = {
        ...form,
        es_solucion_interna: form.es_solucion_interna === true || form.es_solucion_interna === 'true',
        id_proveedor: form.id_proveedor || null,
        costo_estimado: form.costo_estimado || 0,
      };
      const res = await fetch(`${API_URL}/correctivo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al crear ticket');
      }
      setMostrarModalNuevo(false);
      mostrarExito('Ticket creado correctamente.');
      cargarDatos();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function cerrarTicket(e) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      const payload = {
        ...formCierre,
        tuvo_solucion: formCierre.tuvo_solucion === 'true',
        costo_real: formCierre.costo_real || null,
        fecha_cierre: new Date().toISOString(),
      };
      const res = await fetch(`${API_URL}/correctivo/${ticketSeleccionado.id}/cerrar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al cerrar ticket');
      }
      setMostrarModalCerrar(false);
      mostrarExito('Ticket cerrado correctamente.');
      cargarDatos();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstatus(ticket, nuevoEstatus) {
    try {
      const res = await fetch(`${API_URL}/correctivo/${ticket.id}/estatus`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estatus: nuevoEstatus }),
      });
      if (!res.ok) throw new Error('Error al actualizar estatus');
      cargarDatos();
    } catch (err) {
      setError(err.message);
    }
  }

  function mostrarExito(msg) {
    setMensajeExito(msg);
    setTimeout(() => setMensajeExito(null), 3500);
  }

  // Filtered tickets
  const ticketsFiltrados = tickets.filter(t => {
    const coincideEstatus = filtroEstatus === '' || t.estatus === filtroEstatus;
    const coincideClave = filtroClave === '' || t.clave_activo === filtroClave;
    const coincideBusqueda = busqueda === ''
      || t.clave_activo?.toLowerCase().includes(busqueda.toLowerCase())
      || t.descripcion_falla?.toLowerCase().includes(busqueda.toLowerCase())
      || t.responsable?.toLowerCase().includes(busqueda.toLowerCase());
    return coincideEstatus && coincideClave && coincideBusqueda;
  });

  // KPIs
  const abiertos = tickets.filter(t => t.estatus === 'Abierto').length;
  const enProgreso = tickets.filter(t => t.estatus === 'En progreso').length;
  const resueltos = tickets.filter(t => t.estatus === 'Resuelto').length;
  const costoTotal = tickets.reduce((sum, t) => sum + (Number(t.costo_real) || Number(t.costo_estimado) || 0), 0);

  return (
    <div className="dashboard-container">
      <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Mantenimiento Correctivo</h1>
          <p>Sistema de tickets — seguimiento y resolución de fallas</p>
        </div>
        <button className="btn-primary" onClick={() => abrirNuevoTicket()}>+ Nuevo Ticket</button>
      </header>

      {error && !mostrarModalNuevo && !mostrarModalCerrar && (
        <div style={{ backgroundColor: '#fceceb', color: '#e74c3c', padding: '12px 16px', borderRadius: '6px', fontSize: '14px' }}>{error}</div>
      )}
      {mensajeExito && (
        <div style={{ backgroundColor: '#eafaf1', color: '#27ae60', padding: '12px 16px', borderRadius: '6px', fontSize: '14px' }}>{mensajeExito}</div>
      )}

      {/* KPIs */}
      <section className="kpi-grid">
        <div className="kpi-card">
          <h3>Tickets Abiertos</h3>
          <p className="kpi-number warning-text">{abiertos}</p>
          <span className="kpi-status warning">Sin asignar / pendientes</span>
        </div>
        <div className="kpi-card">
          <h3>En Progreso</h3>
          <p className="kpi-number" style={{ color: '#2980b9' }}>{enProgreso}</p>
          <span className="kpi-status info">En atención activa</span>
        </div>
        <div className="kpi-card">
          <h3>Resueltos</h3>
          <p className="kpi-number" style={{ color: '#27ae60' }}>{resueltos}</p>
          <span className="kpi-status ok">Histórico total</span>
        </div>
        <div className="kpi-card">
          <h3>Costo Acumulado</h3>
          <p className="kpi-number" style={{ fontSize: '22px', color: '#2c3e50' }}>{formatMoneda(costoTotal)}</p>
          <span className="kpi-status info">Real + estimado</span>
        </div>
      </section>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Buscar por clave, descripción o responsable..."
          className="input-search"
          style={{ minWidth: '280px' }}
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
        <select className="select-filter" value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)}>
          <option value="">Todos los estatus</option>
          <option value="Abierto">Abierto</option>
          <option value="En progreso">En progreso</option>
          <option value="Resuelto">Resuelto</option>
          <option value="Sin solución">Sin solución</option>
        </select>
        <select className="select-filter" value={filtroClave} onChange={e => setFiltroClave(e.target.value)}>
          <option value="">Todos los equipos</option>
          {[...new Set(tickets.map(t => t.clave_activo))].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Tickets table */}
      <section className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Equipo</th>
              <th>Falla / Descripción</th>
              <th>Responsable</th>
              <th>Fechas</th>
              <th>Costos</th>
              <th>Estatus</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>Procesando información...</td></tr>
            ) : ticketsFiltrados.length === 0 ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>No se localizaron registros bajo los criterios especificados.</td></tr>
            ) : (
              ticketsFiltrados.map(ticket => {
                const estConf = ESTATUS_COLORES[ticket.estatus] || ESTATUS_COLORES['Abierto'];
                const abierto = ticket.estatus === 'Abierto' || ticket.estatus === 'En progreso';
                return (
                  <tr key={ticket.id}>
                    <td>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#7f8c8d' }}>#{ticket.id}</span>
                    </td>
                    <td>
                      <strong>{ticket.clave_activo}</strong><br />
                      <small style={{ color: '#7f8c8d' }}>
                        {ticket.es_solucion_interna ? '🏠 Interna' : '🔧 Externo'}
                      </small>
                    </td>
                    <td style={{ maxWidth: '220px' }}>
                      <span style={{ fontSize: '13px', color: '#2c3e50' }}>{ticket.descripcion_falla}</span>
                      {ticket.notas_seguimiento && (
                        <><br /><small style={{ color: '#7f8c8d' }}>{ticket.notas_seguimiento}</small></>
                      )}
                    </td>
                    <td>
                      {ticket.responsable || <span style={{ color: '#bdc3c7', fontStyle: 'italic' }}>Sin asignar</span>}
                      {!ticket.es_solucion_interna && ticket.proveedores?.nombre && (
                        <><br /><small style={{ color: '#7f8c8d' }}>{ticket.proveedores.nombre}</small></>
                      )}
                    </td>
                    <td>
                      <small>Reporte: {formatFechaCorta(ticket.fecha_reporte)}</small><br />
                      <small>Cierre est.: {formatFechaCorta(ticket.fecha_estimada_cierre)}</small>
                      {ticket.fecha_cierre && (
                        <><br /><small style={{ color: '#27ae60' }}>Cerrado: {formatFechaCorta(ticket.fecha_cierre)}</small></>
                      )}
                    </td>
                    <td>
                      <small>Est.: {formatMoneda(ticket.costo_estimado)}</small><br />
                      {ticket.costo_real != null && (
                        <small style={{ color: '#27ae60' }}>Real: {formatMoneda(ticket.costo_real)}</small>
                      )}
                    </td>
                    <td>
                      <span style={{
                        padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700',
                        backgroundColor: estConf.bg, color: estConf.color,
                      }}>
                        {ticket.estatus}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {/* Quick status change for open tickets */}
                        {ticket.estatus === 'Abierto' && (
                          <button className="btn-icon" style={{ borderColor: '#2980b9', color: '#2980b9', fontSize: '11px' }}
                            onClick={() => cambiarEstatus(ticket, 'En progreso')}>
                            ▶ En progreso
                          </button>
                        )}
                        {abierto && (
                          <button className="btn-icon" style={{ borderColor: '#27ae60', color: '#27ae60', fontSize: '11px' }}
                            onClick={() => abrirCierreTicket(ticket)}>
                            ✓ Cerrar ticket
                          </button>
                        )}
                        <button className="btn-icon" style={{ fontSize: '11px' }}
                          onClick={() => abrirHistorial(ticket)}>
                          📋 Historial
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

      {/* ── Modal: Nuevo Ticket ─────────────────────────────────── */}
      {mostrarModalNuevo && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
              Registrar Nuevo Ticket Correctivo
            </h2>

            {error && (
              <div style={{ backgroundColor: '#fceceb', color: '#e74c3c', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '15px' }}>{error}</div>
            )}

            <form onSubmit={crearTicket}>
              {/* Equipo + Tipo solución */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
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
                <div className="form-group">
                  <label>Tipo de solución</label>
                  <select name="es_solucion_interna" value={form.es_solucion_interna} onChange={handleInput}>
                    <option value={true}>🏠 Resolución interna</option>
                    <option value={false}>🔧 Proveedor externo</option>
                  </select>
                </div>
              </div>

              {/* Descripción de la falla */}
              <div className="form-group">
                <label>Descripción de la falla</label>
                <textarea
                  name="descripcion_falla"
                  value={form.descripcion_falla}
                  onChange={handleInput}
                  required
                  rows={3}
                  placeholder="Describe detalladamente el problema o falla detectada..."
                  style={{ padding: '10px', border: '1px solid #bdc3c7', borderRadius: '6px', fontSize: '14px', resize: 'vertical', width: '100%' }}
                />
              </div>

              {/* Responsable + Proveedor */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>Responsable de atención</label>
                  <input type="text" name="responsable" value={form.responsable} onChange={handleInput}
                    placeholder="Nombre de quien lo resolverá" />
                </div>
                {(form.es_solucion_interna === false || form.es_solucion_interna === 'false') && (
                  <div className="form-group">
                    <label>Proveedor externo</label>
                    <select name="id_proveedor" value={form.id_proveedor} onChange={handleInput}>
                      <option value="">-- Seleccionar proveedor --</option>
                      {proveedores.map(p => (
                        <option key={p.id_proveedor} value={p.id_proveedor}>
                          {p.nombre}{p.es_preferido ? ' ⭐' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Fecha + Costo */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>Fecha estimada de cierre</label>
                  <input type="date" name="fecha_estimada_cierre" value={form.fecha_estimada_cierre} onChange={handleInput} />
                </div>
                <div className="form-group">
                  <label>Costo estimado ($)</label>
                  <input type="number" step="0.01" name="costo_estimado" value={form.costo_estimado}
                    onChange={handleInput} placeholder="0.00" min="0" />
                </div>
              </div>

              {/* Notas iniciales */}
              <div className="form-group">
                <label>Notas adicionales (opcional)</label>
                <input type="text" name="notas_seguimiento" value={form.notas_seguimiento} onChange={handleInput}
                  placeholder="Contexto adicional, prioridad, observaciones..." />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setMostrarModalNuevo(false)} disabled={guardando}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={guardando}>
                  {guardando ? 'Procesando...' : 'Crear Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Cerrar Ticket ────────────────────────────────── */}
      {mostrarModalCerrar && ticketSeleccionado && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <h2 style={{ marginBottom: '6px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
              Cerrar Ticket #{ticketSeleccionado.id}
            </h2>
            <p style={{ fontSize: '13px', color: '#7f8c8d', marginBottom: '20px' }}>
              {ticketSeleccionado.clave_activo} — {ticketSeleccionado.descripcion_falla}
            </p>

            {error && (
              <div style={{ backgroundColor: '#fceceb', color: '#e74c3c', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '15px' }}>{error}</div>
            )}

            <form onSubmit={cerrarTicket}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>¿Tuvo solución?</label>
                  <select name="tuvo_solucion" value={formCierre.tuvo_solucion} onChange={handleCierreInput} required>
                    <option value="">-- Seleccionar --</option>
                    <option value="true">✅ Sí, se resolvió</option>
                    <option value="false">❌ No tuvo solución</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Estatus final</label>
                  <select name="estatus" value={formCierre.estatus} onChange={handleCierreInput}>
                    <option value="Resuelto">Resuelto</option>
                    <option value="Sin solución">Sin solución</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Descripción de la solución aplicada</label>
                <textarea
                  name="descripcion_solucion"
                  value={formCierre.descripcion_solucion}
                  onChange={handleCierreInput}
                  rows={3}
                  placeholder="¿Qué se hizo para resolver el problema?"
                  style={{ padding: '10px', border: '1px solid #bdc3c7', borderRadius: '6px', fontSize: '14px', resize: 'vertical', width: '100%' }}
                />
              </div>

              <div className="form-group">
                <label>Costo real ($)</label>
                <input type="number" step="0.01" name="costo_real" value={formCierre.costo_real}
                  onChange={handleCierreInput} placeholder="Costo final incurrido" min="0" />
              </div>

              {/* Tiempo de cierre — auto set to now, just show info */}
              <div style={{ padding: '10px 14px', backgroundColor: '#f8f9fa', borderRadius: '6px', fontSize: '12px', color: '#7f8c8d', marginBottom: '15px' }}>
                📅 El tiempo de cierre se registrará automáticamente como: <strong>{new Date().toLocaleString('es-MX')}</strong>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setMostrarModalCerrar(false)} disabled={guardando}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={guardando}>
                  {guardando ? 'Procesando...' : 'Confirmar Cierre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Historial Panel ─────────────────────────────────────── */}
      {mostrarHistorial && ticketSeleccionado && (
        <HistorialTicket
          ticket={ticketSeleccionado}
          onClose={() => setMostrarHistorial(false)}
        />
      )}
    </div>
  );
}