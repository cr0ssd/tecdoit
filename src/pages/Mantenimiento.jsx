import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { mantenimientosAPI, proveedoresAPI, equiposAPI } from '../services/api';

function Mantenimiento() {
  const location = useLocation();
  const [mantenimientos, setMantenimientos] = useState([]);
  const [equiposDisponibles, setEquiposDisponibles] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [mostrarModal, setMostrarModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  const [nuevoMantenimiento, setNuevoMantenimiento] = useState({
    clave_activo: '',
    tipo_mantenimiento: '',
    descripcion: '',
    id_proveedor: '',
    fecha_programada: '',
    costo_estimado: ''
  });

  useEffect(() => {
    obtenerDatos();
  }, []);

  // Interceptor de redirección desde el Dashboard
  useEffect(() => {
    if (location.state && location.state.autoCompletarClave) {
      abrirModalNuevo(location.state.autoCompletarClave);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  async function obtenerDatos() {
    setCargando(true);
    setError(null);
    try {
      const [dataMant, dataEq, dataProv] = await Promise.all([
        mantenimientosAPI.obtenerTodos(),
        equiposAPI.obtenerTodos(),
        proveedoresAPI.obtenerTodos()
      ]);
      setMantenimientos(dataMant);
      setEquiposDisponibles(dataEq);
      setProveedores(dataProv);
    } catch (err) {
      console.error('Error al cargar información de mantenimiento:', err.message);
      setError('No se pudo conectar con el servidor. Verifica que el backend esté corriendo.');
    } finally {
      setCargando(false);
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNuevoMantenimiento({ ...nuevoMantenimiento, [name]: value });
  };

  const abrirModalNuevo = (clavePredefinida = '') => {
    setNuevoMantenimiento({
      clave_activo: clavePredefinida,
      tipo_mantenimiento: '',
      descripcion: '',
      id_proveedor: '',
      fecha_programada: '',
      costo_estimado: ''
    });
    setError(null);
    setMostrarModal(true);
  };

  const guardarMantenimiento = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      await mantenimientosAPI.crear({
        clave_activo: nuevoMantenimiento.clave_activo,
        tipo_mantenimiento: nuevoMantenimiento.tipo_mantenimiento,
        descripcion: nuevoMantenimiento.descripcion,
        id_proveedor: nuevoMantenimiento.id_proveedor || null,
        fecha_programada: nuevoMantenimiento.fecha_programada,
        costo_estimado: nuevoMantenimiento.costo_estimado
      });
      setMostrarModal(false);
      obtenerDatos();
    } catch (err) {
      console.error('Error al registrar servicio:', err.message);
      setError('Error al registrar el servicio. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const completarMantenimiento = async (id_mantenimiento, clave_activo) => {
    try {
      await mantenimientosAPI.completar(id_mantenimiento, clave_activo);
      obtenerDatos();
    } catch (err) {
      console.error('Error al completar el servicio:', err.message);
      setError('Error al completar el servicio. Intenta de nuevo.');
    }
  };

  const formatearFecha = (fechaIso) => {
    if (!fechaIso) return '-';
    return new Date(fechaIso).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatoMoneda = (cantidad) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(cantidad);

  return (
    <div className="dashboard-container">
      <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Gestión de Mantenimiento</h1>
          <p>Control de servicios preventivos, correctivos y proveedores</p>
        </div>
        <button className="btn-primary" onClick={() => abrirModalNuevo('')}>+ Registrar Servicio</button>
      </header>

      {error && (
        <div style={{ backgroundColor: '#fceceb', color: '#e74c3c', padding: '12px 16px', borderRadius: '6px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      <section className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Equipo / Clave</th>
              <th>Tipo y Descripción</th>
              <th>Proveedor</th>
              <th>Fechas</th>
              <th>Estatus / Costo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>Procesando información...</td></tr>
            ) : mantenimientos.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>No existen registros en el sistema.</td></tr>
            ) : (
              mantenimientos.map((mant) => (
                <tr key={mant.id_mantenimiento}>
                  <td>
                    <strong>{mant.clave_activo}</strong><br/>
                    <small style={{ color: '#7f8c8d' }}>{mant.equipos?.marca} {mant.equipos?.modelo}</small>
                  </td>
                  <td>
                    <strong>{mant.tipo_mantenimiento}</strong><br/>
                    <small>{mant.descripcion}</small>
                  </td>
                  <td>{mant.proveedores?.nombre || 'Resolución Interna'}</td>
                  <td>
                    <small>Prog: {formatearFecha(mant.fecha_programada)}</small><br/>
                    <small>Cierre: {mant.fecha_cierre ? formatearFecha(mant.fecha_cierre) : '-'}</small>
                  </td>
                  <td>
                    <span className={`badge ${mant.estatus === 'Abierto' ? 'warning' : 'ok'}`} style={{ marginBottom: '4px', display: 'inline-block' }}>
                      {mant.estatus || 'Abierto'}
                    </span><br/>
                    <strong>{formatoMoneda(mant.costo)}</strong>
                  </td>
                  <td>
                    {mant.estatus !== 'Completado' && (
                      <button
                        className="btn-icon"
                        style={{ color: '#27ae60', borderColor: '#27ae60' }}
                        onClick={() => completarMantenimiento(mant.id_mantenimiento, mant.clave_activo)}
                      >
                        ✓ Completar
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {mostrarModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <h2 style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
              Registrar Nuevo Mantenimiento
            </h2>

            {error && (
              <div style={{ backgroundColor: '#fceceb', color: '#e74c3c', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '15px' }}>
                {error}
              </div>
            )}

            <form onSubmit={guardarMantenimiento}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>Equipo</label>
                  <select name="clave_activo" value={nuevoMantenimiento.clave_activo} onChange={handleInputChange} required>
                    <option value="">-- Seleccionar --</option>
                    {equiposDisponibles.map(eq => (
                      <option key={eq.clave_activo} value={eq.clave_activo}>
                        {eq.clave_activo} — {eq.marca} {eq.modelo}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Tipo de Servicio</label>
                  <select name="tipo_mantenimiento" value={nuevoMantenimiento.tipo_mantenimiento} onChange={handleInputChange} required>
                    <option value="">-- Seleccionar --</option>
                    <option value="Preventivo">Preventivo</option>
                    <option value="Correctivo">Correctivo</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Descripción del Problema / Servicio</label>
                <input
                  type="text"
                  name="descripcion"
                  value={nuevoMantenimiento.descripcion}
                  onChange={handleInputChange}
                  required
                  placeholder="Ej. Cambio de aceite, calibración..."
                  style={{ width: '100%', padding: '8px', border: '1px solid #bdc3c7', borderRadius: '4px' }}
                />
              </div>

              <div className="form-group">
                <label>Proveedor Asignado (Opcional)</label>
                <select name="id_proveedor" value={nuevoMantenimiento.id_proveedor} onChange={handleInputChange}>
                  <option value="">Resolución Interna</option>
                  {proveedores.map(prov => (
                    <option key={prov.id_proveedor} value={prov.id_proveedor}>
                      {prov.nombre}{prov.es_preferido ? ' ⭐' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>Fecha Programada</label>
                  <input type="date" name="fecha_programada" value={nuevoMantenimiento.fecha_programada} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label>Costo Estimado ($)</label>
                  <input type="number" step="0.01" name="costo_estimado" value={nuevoMantenimiento.costo_estimado} onChange={handleInputChange} placeholder="0.00" />
                </div>
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn-secondary" onClick={() => setMostrarModal(false)} disabled={guardando}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={guardando}>
                  {guardando ? 'Procesando...' : 'Registrar Servicio'}
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