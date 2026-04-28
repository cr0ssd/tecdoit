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

function formatMoneda(val) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val || 0);
}

export default function Correctivo() {
  const [tickets, setTickets]     = useState([]);
  const [equipos, setEquipos]     = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [cargando, setCargando]   = useState(true);
  const [error, setError]         = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);

  const [filtroEstatus, setFiltroEstatus] = useState('');
  const [filtroClave, setFiltroClave]     = useState('');
  const [busqueda, setBusqueda]           = useState('');

  const [mostrarModal, setMostrarModal]   = useState(false);
  const [guardando, setGuardando]         = useState(false);

  const [form, setForm] = useState({
    clave_activo: '',
    descripcion: '',
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
    setForm({ clave_activo: '', descripcion: '', id_proveedor: '', fecha_programada: '', costo: '' });
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
      cargarDatos();
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
      cargarDatos();
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
    const coincideBusqueda = busqueda      === '' ||
      t.clave_activo?.toLowerCase().includes(busqueda.toLowerCase()) ||
      t.descripcion?.toLowerCase().includes(busqueda.toLowerCase());
    return coincideEstatus && coincideClave && coincideBusqueda;
  });

  // KPIs
  const abiertos   = tickets.filter(t => t.estatus === 'Abierto').length;
  const enProgreso = tickets.filter(t => t.estatus === 'En progreso').length;
  const completados = tickets.filter(t => t.estatus === 'Completado').length;
  const costoTotal = tickets.reduce((sum, t) => sum + (Number(t.costo) || 0), 0);

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
                    <td style={{ maxWidth: '220px' }}>{t.descripcion}</td>
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

      {/* Modal */}
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
    </div>
  );
}