import React, { useState, useEffect } from 'react';
import { mantenimientosAPI, proveedoresAPI, equiposAPI } from '../services/api';

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

export default function Preventivo() {
  const [registros, setRegistros] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);

  const [mostrarModal, setMostrarModal] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('');

  const [form, setForm] = useState({
    clave_activo: '',
    descripcion: '',
    tipo_requerimiento: '',
    descripcion_custom: '',
    id_proveedor: '',
    fecha_programada: '',
    costo: '',
  });

  useEffect(() => { cargarDatos(); }, []);

  async function cargarDatos() {
    setCargando(true);
    setError(null);
    try {
      const [resPreventivo, dataEq, dataProv] = await Promise.all([
        fetch(`${API_URL}/preventivo`).then(r => r.json()),
        equiposAPI.obtenerTodos(),
        proveedoresAPI.obtenerTodos(),
      ]);
      setRegistros(resPreventivo);
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
    setForm({ clave_activo: '', descripcion: '', tipo_requerimiento: '', descripcion_custom: '', id_proveedor: '', fecha_programada: '', costo: '' });
    setError(null);
    setMostrarModal(true);
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
    return coincideTexto && coincideEstatus;
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
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <input type="text" placeholder="Buscar por equipo o descripción..." className="input-search"
          value={busqueda} onChange={e => setBusqueda(e.target.value)} />
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
              <th>Proveedor</th>
              <th>Fecha Programada</th>
              <th>Costo</th>
              <th>Estatus / Días</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>Procesando información...</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>No se localizaron registros bajo los criterios especificados.</td></tr>
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
                    <td>{r.proveedores?.nombre || 'Resolución interna'}</td>
                    <td>{formatFecha(r.fecha_programada)}</td>
                    <td>{formatMoneda(r.costo)}</td>
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

      {/* Modal */}
      {mostrarModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '580px' }}>
            <h2 style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
              Registrar Mantenimiento Preventivo
            </h2>

            {error && (
              <div style={{ backgroundColor: '#fceceb', color: '#e74c3c', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '15px' }}>{error}</div>
            )}

            <form onSubmit={guardar}>
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
                <button type="button" className="btn-secondary" onClick={() => setMostrarModal(false)} disabled={guardando}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={guardando}>
                  {guardando ? 'Procesando...' : 'Confirmar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}