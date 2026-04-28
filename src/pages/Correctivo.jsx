import React, { useState, useEffect } from 'react';
import { proveedoresAPI, equiposAPI } from '../services/api';

const API_URL = import.meta.env.VITE_API_URL;

const ESTATUS_CONFIG = {
  'Abierto':     { clase: 'warning', bg: '#fef5e7', color: '#f39c12' },
  'En progreso': { clase: 'info',    bg: '#e8f4fd', color: '#2980b9' },
  'Completado':  { clase: 'ok',      bg: '#eafaf1', color: '#27ae60' },
};

function formatFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatFechaHora(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function formatMoneda(val) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val || 0);
}

// ── Ticket inspect modal ───────────────────────────────────────────────────────
function TicketDetalle({ ticket, onClose }) {
  const estConf = ESTATUS_CONFIG[ticket.estatus] || ESTATUS_CONFIG['Abierto'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '560px', maxHeight: '85vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '14px' }}>
          <div>
            <h2 style={{ fontSize: '18px', color: '#2c3e50', marginBottom: '4px' }}>
              Ticket #{ticket.id_mantenimiento}
            </h2>
            <span style={{ fontSize: '13px', color: '#7f8c8d' }}>{ticket.clave_activo} — {ticket.equipos?.marca} {ticket.equipos?.modelo}</span>
          </div>
          <span style={{
            padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '700',
            backgroundColor: estConf.bg, color: estConf.color, whiteSpace: 'nowrap', marginLeft: '12px',
          }}>
            {ticket.estatus}
          </span>
        </div>

        {/* Detail grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
          {[
            ['Proveedor', ticket.proveedores?.nombre || 'Resolución interna'],
            ['Costo', formatMoneda(ticket.costo)],
            ['Fecha de reporte', formatFechaHora(ticket.fecha_reporte)],
            ['Fecha programada', formatFecha(ticket.fecha_programada)],
            ['Fecha de cierre', ticket.fecha_cierre ? formatFechaHora(ticket.fecha_cierre) : '—'],
          ].map(([label, val]) => (
            <div key={label}>
              <div style={{ fontSize: '11px', color: '#7f8c8d', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>{label}</div>
              <div style={{ fontSize: '13px', color: '#2c3e50', fontWeight: '600' }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Causa de falla */}
        {ticket.causa_falla && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: '#7f8c8d', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Causa de la falla</div>
            <div style={{ padding: '12px 14px', backgroundColor: '#fef5e7', borderRadius: '6px', fontSize: '14px', color: '#2c3e50', lineHeight: '1.5', borderLeft: '3px solid #f39c12' }}>
              {ticket.causa_falla}
            </div>
          </div>
        )}

        {/* Descripción */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', color: '#7f8c8d', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Descripción de la falla</div>
          <div style={{ padding: '12px 14px', backgroundColor: '#f8f9fa', borderRadius: '6px', fontSize: '14px', color: '#2c3e50', lineHeight: '1.5' }}>
            {ticket.descripcion}
          </div>
        </div>

        {/* Timeline visual */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', color: '#7f8c8d', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Línea de tiempo</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
            {[
              { label: 'Reportado', fecha: ticket.fecha_reporte, activo: true },
              { label: 'En progreso', fecha: ticket.estatus !== 'Abierto' ? ticket.fecha_reporte : null, activo: ticket.estatus !== 'Abierto' },
              { label: 'Completado', fecha: ticket.fecha_cierre, activo: ticket.estatus === 'Completado' },
            ].map((step, i, arr) => (
              <React.Fragment key={step.label}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: i === arr.length - 1 ? 0 : 'none' }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: step.activo ? '#3498db' : '#ecf0f1',
                    color: step.activo ? 'white' : '#bdc3c7',
                    fontSize: '12px', fontWeight: '700',
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ fontSize: '10px', color: step.activo ? '#2c3e50' : '#bdc3c7', marginTop: '4px', textAlign: 'center', fontWeight: step.activo ? '600' : 'normal' }}>
                    {step.label}
                  </div>
                </div>
                {i < arr.length - 1 && (
                  <div style={{ flex: 1, height: '2px', backgroundColor: step.activo && arr[i+1].activo ? '#3498db' : '#ecf0f1', margin: '0 4px', marginBottom: '18px' }} />
                )}
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

// ── Ticket edit modal ─────────────────────────────────────────────────────────
function TicketEditar({ ticket, proveedores, onClose, onGuardado }) {
  const [form, setForm] = useState({
    descripcion:       ticket.descripcion       || '',
    causa_falla:       ticket.causa_falla        || '',
    id_proveedor:      ticket.id_proveedor      || '',
    fecha_programada:  ticket.fecha_programada  ? ticket.fecha_programada.slice(0, 10) : '',
    costo:             ticket.costo             || '',
    estatus:           ticket.estatus           || 'Abierto',
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError]         = useState(null);

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
          descripcion:      form.descripcion,
          causa_falla:      form.causa_falla      || null,
          id_proveedor:     form.id_proveedor     || null,
          fecha_programada: form.fecha_programada || null,
          costo:            form.costo            || 0,
          estatus:          form.estatus,
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
      <div
        className="modal-content"
        style={{ maxWidth: '520px' }}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ marginBottom: '6px', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
          Editar Ticket #{ticket.id_mantenimiento}
        </h2>
        <p style={{ fontSize: '13px', color: '#7f8c8d', marginBottom: '20px' }}>
          {ticket.clave_activo} — {ticket.equipos?.marca} {ticket.equipos?.modelo}
        </p>

        {error && (
          <div style={{ backgroundColor: '#fceceb', color: '#e74c3c', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '15px' }}>{error}</div>
        )}

        <form onSubmit={guardar}>
          <div className="form-group">
            <label>Descripción de la falla</label>
            <textarea
              name="descripcion"
              value={form.descripcion}
              onChange={handleInput}
              required
              rows={3}
              style={{ padding: '10px', border: '1px solid #bdc3c7', borderRadius: '6px', fontSize: '14px', resize: 'vertical', width: '100%' }}
            />
          </div>

          <div className="form-group">
            <label>Causa de la falla</label>
            <input
              type="text"
              name="causa_falla"
              value={form.causa_falla}
              onChange={handleInput}
              placeholder="Ej. Sobrecalentamiento, cortocircuito, desgaste..."
            />
          </div>

          <div className="form-group">
            <label>Estatus</label>
            <select name="estatus" value={form.estatus} onChange={handleInput}>
              <option value="Abierto">Abierto</option>
              <option value="En progreso">En progreso</option>
            </select>
          </div>

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
              <input type="date" name="fecha_programada" value={form.fecha_programada} onChange={handleInput} />
            </div>
            <div className="form-group">
              <label>Costo estimado ($)</label>
              <input type="number" step="0.01" name="costo" value={form.costo}
                onChange={handleInput} placeholder="0.00" min="0" />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={guardando}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={guardando}>
              {guardando ? 'Procesando...' : 'Aplicar Modificaciones'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Machine view panel (slide-in from right) ───────────────────────────────────
function EquipoPanel({ clave, tickets, proveedores, onClose, onCompletar, onCambiarEstatus, onRefresh }) {
  const [ticketInspectado, setTicketInspectado] = useState(null);
  const [ticketEditado, setTicketEditado]       = useState(null);

  const activos    = tickets.filter(t => t.clave_activo === clave && t.estatus !== 'Completado');
  const historial  = tickets.filter(t => t.clave_activo === clave && t.estatus === 'Completado');
  const equipo     = tickets.find(t => t.clave_activo === clave)?.equipos;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)',
          zIndex: 900,
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, width: '520px', height: '100vh',
        backgroundColor: '#ffffff', boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
        zIndex: 901, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Panel header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #ecf0f1', backgroundColor: '#1a252f', color: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: '18px', margin: 0, marginBottom: '4px' }}>{clave}</h2>
              {equipo && <p style={{ fontSize: '13px', color: '#bdc3c7', margin: 0 }}>{equipo.marca} {equipo.modelo}</p>}
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#bdc3c7', cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '0' }}
            >
              ✕
            </button>
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '14px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: '700', color: '#f39c12' }}>{activos.length}</div>
              <div style={{ fontSize: '11px', color: '#bdc3c7' }}>Activos</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: '700', color: '#27ae60' }}>{historial.length}</div>
              <div style={{ fontSize: '11px', color: '#bdc3c7' }}>Completados</div>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* Active tickets */}
          <div style={{ marginBottom: '28px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#7f8c8d', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
              Tickets activos
            </h3>

            {activos.length === 0 ? (
              <div style={{ padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px', textAlign: 'center', fontSize: '13px', color: '#7f8c8d' }}>
                Sin tickets activos
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {activos.map(t => {
                  const estConf = ESTATUS_CONFIG[t.estatus] || ESTATUS_CONFIG['Abierto'];
                  return (
                    <div key={t.id_mantenimiento} style={{
                      padding: '14px 16px', border: '1px solid #ecf0f1', borderRadius: '8px',
                      borderLeft: `3px solid ${estConf.color}`, backgroundColor: '#fafafa',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#7f8c8d' }}>#{t.id_mantenimiento}</span>
                        <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700', backgroundColor: estConf.bg, color: estConf.color }}>
                          {t.estatus}
                        </span>
                      </div>
                      <p style={{ fontSize: '13px', color: '#2c3e50', margin: '0 0 4px 0', lineHeight: '1.4' }}>{t.descripcion}</p>
                      {t.causa_falla && (
                        <p style={{ fontSize: '12px', color: '#e67e22', margin: '0 0 8px 0' }}>⚠ {t.causa_falla}</p>
                      )}
                      <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '10px' }}>
                        {t.proveedores?.nombre || 'Resolución interna'} · {formatFecha(t.fecha_programada)} · {formatMoneda(t.costo)}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button className="btn-icon" style={{ fontSize: '11px' }}
                          onClick={() => setTicketInspectado(t)}>
                          🔍 Inspeccionar
                        </button>
                        <button className="btn-icon" style={{ borderColor: '#f39c12', color: '#f39c12', fontSize: '11px' }}
                          onClick={() => setTicketEditado(t)}>
                          ✏️ Editar
                        </button>
                        {t.estatus === 'Abierto' && (
                          <button className="btn-icon" style={{ borderColor: '#2980b9', color: '#2980b9', fontSize: '11px' }}
                            onClick={() => onCambiarEstatus(t.id_mantenimiento, 'En progreso')}>
                            ▶ En progreso
                          </button>
                        )}
                        <button className="btn-icon" style={{ borderColor: '#27ae60', color: '#27ae60', fontSize: '11px' }}
                          onClick={() => onCompletar(t.id_mantenimiento, t.clave_activo)}>
                          ✓ Completar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* History */}
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#7f8c8d', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
              Historial completados
            </h3>

            {historial.length === 0 ? (
              <div style={{ padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px', textAlign: 'center', fontSize: '13px', color: '#7f8c8d' }}>
                Sin historial de tickets completados
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {historial.map(t => (
                  <div key={t.id_mantenimiento} style={{
                    padding: '12px 16px', border: '1px solid #ecf0f1', borderRadius: '8px',
                    borderLeft: '3px solid #27ae60', backgroundColor: '#fafafa',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#7f8c8d' }}>#{t.id_mantenimiento}</span>
                        <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '700', backgroundColor: '#eafaf1', color: '#27ae60' }}>Completado</span>
                      </div>
                      <p style={{ fontSize: '13px', color: '#2c3e50', margin: '0 0 3px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.descripcion}
                      </p>
                      <span style={{ fontSize: '11px', color: '#7f8c8d' }}>
                        Cerrado: {formatFecha(t.fecha_cierre)} · {formatMoneda(t.costo)}
                      </span>
                    </div>
                    <button className="btn-icon" style={{ fontSize: '11px', whiteSpace: 'nowrap', flexShrink: 0 }}
                      onClick={() => setTicketInspectado(t)}>
                      🔍 Inspeccionar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ticket detail modal on top of panel */}
      {ticketInspectado && (
        <TicketDetalle
          ticket={ticketInspectado}
          onClose={() => setTicketInspectado(null)}
        />
      )}

      {/* Ticket edit modal on top of panel */}
      {ticketEditado && (
        <TicketEditar
          ticket={ticketEditado}
          proveedores={proveedores}
          onClose={() => setTicketEditado(null)}
          onGuardado={() => { setTicketEditado(null); onRefresh(); }}
        />
      )}
    </>
  );
}

// ── Main Correctivo page ───────────────────────────────────────────────────────
export default function Correctivo() {
  const [tickets, setTickets]         = useState([]);
  const [equipos, setEquipos]         = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [cargando, setCargando]       = useState(true);
  const [error, setError]             = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);

  const [filtroEstatus, setFiltroEstatus] = useState('');
  const [filtroClave, setFiltroClave]     = useState('');
  const [busqueda, setBusqueda]           = useState('');

  const [mostrarModal, setMostrarModal] = useState(false);
  const [guardando, setGuardando]       = useState(false);

  // Panel state — which machine's panel is open
  const [panelClave, setPanelClave] = useState(null);

  const [form, setForm] = useState({
    clave_activo: '',
    descripcion: '',
    causa_falla: '',
    id_proveedor: '',
    fecha_programada: '',
    costo: '',
  });

  useEffect(() => { cargarDatos(); }, []);

  async function cargarDatos() {
    setCargando(true);
    setError(null);
    try {
      const [dataTickets, dataEq, dataProv] = await Promise.all([
        fetch(`${API_URL}/correctivo`).then(r => r.json()),
        equiposAPI.obtenerTodos(),
        proveedoresAPI.obtenerTodos(),
      ]);
      setTickets(dataTickets);
      setEquipos(dataEq);
      setProveedores(dataProv);
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
    setForm({ clave_activo: '', descripcion: '', causa_falla: '', id_proveedor: '', fecha_programada: '', costo: '' });
    setError(null);
    setMostrarModal(true);
  }

  async function crearTicket(e) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/correctivo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clave_activo: form.clave_activo,
          descripcion: form.descripcion,
          causa_falla: form.causa_falla || null,
          id_proveedor: form.id_proveedor || null,
          fecha_programada: form.fecha_programada || null,
          costo: form.costo || 0,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al crear ticket');
      }
      setMostrarModal(false);
      mostrarExitoMsg('Ticket correctivo registrado correctamente.');
      cargarDatos();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstatus(id, estatus) {
    try {
      const res = await fetch(`${API_URL}/correctivo/${id}/estatus`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estatus }),
      });
      if (!res.ok) throw new Error('Error al actualizar estatus');
      await cargarDatos();
    } catch (err) {
      setError(err.message);
    }
  }

  async function completar(id, clave_activo) {
    try {
      const res = await fetch(`${API_URL}/correctivo/${id}/completar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clave_activo }),
      });
      if (!res.ok) throw new Error('Error al completar');
      mostrarExitoMsg('Ticket cerrado correctamente.');
      await cargarDatos();
    } catch (err) {
      setError(err.message);
    }
  }

  function mostrarExitoMsg(msg) {
    setMensajeExito(msg);
    setTimeout(() => setMensajeExito(null), 3500);
  }

  const filtrados = tickets.filter(t => {
    const coincideEstatus  = filtroEstatus === '' || t.estatus === filtroEstatus;
    const coincideClave    = filtroClave   === '' || t.clave_activo === filtroClave;
    const coincideBusqueda = busqueda === '' ||
      t.clave_activo?.toLowerCase().includes(busqueda.toLowerCase()) ||
      t.descripcion?.toLowerCase().includes(busqueda.toLowerCase());
    return coincideEstatus && coincideClave && coincideBusqueda;
  });

  const abiertos    = tickets.filter(t => t.estatus === 'Abierto').length;
  const enProgreso  = tickets.filter(t => t.estatus === 'En progreso').length;
  const completados = tickets.filter(t => t.estatus === 'Completado').length;
  const costoTotal  = tickets.reduce((sum, t) => sum + (Number(t.costo) || 0), 0);

  return (
    <div className="dashboard-container">
      <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Mantenimiento Correctivo</h1>
          <p>Registro y seguimiento de fallas y tickets de reparación</p>
        </div>
        <button className="btn-primary" onClick={abrirModal}>+ Nuevo Ticket</button>
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
          <h3>Tickets Abiertos</h3>
          <p className="kpi-number warning-text">{abiertos}</p>
          <span className="kpi-status warning">Pendientes de atención</span>
        </div>
        <div className="kpi-card">
          <h3>En Progreso</h3>
          <p className="kpi-number" style={{ color: '#2980b9' }}>{enProgreso}</p>
          <span className="kpi-status info">En atención activa</span>
        </div>
        <div className="kpi-card">
          <h3>Completados</h3>
          <p className="kpi-number" style={{ color: '#27ae60' }}>{completados}</p>
          <span className="kpi-status ok">Histórico total</span>
        </div>
        <div className="kpi-card">
          <h3>Costo Acumulado</h3>
          <p className="kpi-number" style={{ fontSize: '22px' }}>{formatMoneda(costoTotal)}</p>
          <span className="kpi-status info">Servicios correctivos</span>
        </div>
      </section>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <input type="text" placeholder="Buscar por clave o descripción..." className="input-search"
          style={{ minWidth: '260px' }} value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        <select className="select-filter" value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)}>
          <option value="">Todos los estatus</option>
          <option value="Abierto">Abierto</option>
          <option value="En progreso">En progreso</option>
          <option value="Completado">Completado</option>
        </select>
        <select className="select-filter" value={filtroClave} onChange={e => setFiltroClave(e.target.value)}>
          <option value="">Todos los equipos</option>
          {[...new Set(tickets.map(t => t.clave_activo))].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <section className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Equipo</th>
              <th>Descripción de la falla</th>
              <th>Proveedor</th>
              <th>Fecha programada</th>
              <th>Costo</th>
              <th>Estatus</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>Procesando información...</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>No se localizaron registros bajo los criterios especificados.</td></tr>
            ) : (
              filtrados.map(t => {
                const estConf = ESTATUS_CONFIG[t.estatus] || ESTATUS_CONFIG['Abierto'];
                const abierto = t.estatus !== 'Completado';
                return (
                  <tr key={t.id_mantenimiento}>
                    <td><span style={{ fontSize: '12px', fontWeight: '700', color: '#7f8c8d' }}>#{t.id_mantenimiento}</span></td>
                    <td>
                      <strong>{t.clave_activo}</strong><br />
                      <small style={{ color: '#7f8c8d' }}>{t.equipos?.marca} {t.equipos?.modelo}</small>
                    </td>
                    <td style={{ maxWidth: '200px' }}>
                      <span style={{ fontSize: '13px' }}>{t.descripcion}</span>
                    </td>
                    <td>{t.proveedores?.nombre || 'Resolución interna'}</td>
                    <td>{formatFecha(t.fecha_programada)}</td>
                    <td>{formatMoneda(t.costo)}</td>
                    <td>
                      <span style={{
                        padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700',
                        backgroundColor: estConf.bg, color: estConf.color,
                      }}>
                        {t.estatus}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {/* View button — always visible */}
                        <button
                          className="btn-icon"
                          style={{ fontSize: '11px' }}
                          onClick={() => setPanelClave(t.clave_activo)}
                        >
                          👁 Ver equipo
                        </button>

                        {t.estatus === 'Abierto' && (
                          <button className="btn-icon" style={{ borderColor: '#2980b9', color: '#2980b9', fontSize: '11px' }}
                            onClick={() => cambiarEstatus(t.id_mantenimiento, 'En progreso')}>
                            ▶ En progreso
                          </button>
                        )}
                        {abierto && (
                          <button className="btn-icon" style={{ borderColor: '#27ae60', color: '#27ae60', fontSize: '11px' }}
                            onClick={() => completar(t.id_mantenimiento, t.clave_activo)}>
                            ✓ Completar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      {/* Nuevo ticket modal */}
      {mostrarModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '580px' }}>
            <h2 style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
              Registrar Ticket Correctivo
            </h2>

            {error && (
              <div style={{ backgroundColor: '#fceceb', color: '#e74c3c', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '15px' }}>{error}</div>
            )}

            <form onSubmit={crearTicket}>
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
                <label>Descripción de la falla</label>
                <textarea
                  name="descripcion"
                  value={form.descripcion}
                  onChange={handleInput}
                  required
                  rows={3}
                  placeholder="Describe detalladamente el problema detectado..."
                  style={{ padding: '10px', border: '1px solid #bdc3c7', borderRadius: '6px', fontSize: '14px', resize: 'vertical', width: '100%' }}
                />
              </div>

              <div className="form-group">
                <label>Causa de la falla</label>
                <input
                  type="text"
                  name="causa_falla"
                  value={form.causa_falla}
                  onChange={handleInput}
                  placeholder="Ej. Sobrecalentamiento, cortocircuito, desgaste..."
                />
              </div>

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
                  <input type="date" name="fecha_programada" value={form.fecha_programada} onChange={handleInput} />
                </div>
                <div className="form-group">
                  <label>Costo estimado ($)</label>
                  <input type="number" step="0.01" name="costo" value={form.costo}
                    onChange={handleInput} placeholder="0.00" min="0" />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setMostrarModal(false)} disabled={guardando}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={guardando}>
                  {guardando ? 'Procesando...' : 'Crear Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Machine panel */}
      {panelClave && (
        <EquipoPanel
          clave={panelClave}
          tickets={tickets}
          proveedores={proveedores}
          onClose={() => setPanelClave(null)}
          onCompletar={async (id, clave) => { await completar(id, clave); }}
          onCambiarEstatus={async (id, estatus) => { await cambiarEstatus(id, estatus); }}
          onRefresh={() => { cargarDatos(); mostrarExitoMsg('Ticket actualizado correctamente.'); }}
        />
      )}
    </div>
  );
}