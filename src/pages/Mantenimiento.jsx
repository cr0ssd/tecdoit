import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

function Mantenimiento() {
  const [mantenimientos, setMantenimientos] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Estados para el Modal
  const [mostrarModal, setMostrarModal] = useState(false);
  const [nuevoMantenimiento, setNuevoMantenimiento] = useState({
    clave_activo: '',
    tipo_mantenimiento: '',
    descripcion: '',
    id_proveedor: '',
    fecha_programada: '',
    costo: ''
  });

  useEffect(() => {
    obtenerDatos();
  }, []);

  async function obtenerDatos() {
    setCargando(true);
    try {
      // 1. Traer historial de mantenimientos con datos relacionados
      const { data: dataMant, error: errorMant } = await supabase
        .from('mantenimientos')
        .select('*, equipos(marca, modelo), proveedores(nombre)')
        .order('fecha_reporte', { ascending: false });
      if (errorMant) throw errorMant;
      if (dataMant) setMantenimientos(dataMant);

      // 2. Traer catálogo de equipos para el select
      const { data: dataEq, error: errorEq } = await supabase
        .from('equipos')
        .select('clave_activo, marca, modelo')
        .eq('estatus', 'Activo'); // Solo mostrar los activos para programarles servicio
      if (errorEq) throw errorEq;
      if (dataEq) setEquipos(dataEq);

      // 3. Traer proveedores
      const { data: dataProv, error: errorProv } = await supabase
        .from('proveedores')
        .select('id_proveedor, nombre, es_preferido')
        .order('es_preferido', { ascending: false }); // Los preferidos salen primero
      if (errorProv) throw errorProv;
      if (dataProv) setProveedores(dataProv);

    } catch (error) {
      console.error('Error al cargar datos:', error.message);
    } finally {
      setCargando(false);
    }
  }

  const handleInputChange = (e) => {
    setNuevoMantenimiento({ ...nuevoMantenimiento, [e.target.name]: e.target.value });
  };

  const guardarMantenimiento = async (e) => {
    e.preventDefault();
    try {
      // Insertar el reporte en la tabla mantenimientos
      const { error } = await supabase
        .from('mantenimientos')
        .insert([{
          clave_activo: nuevoMantenimiento.clave_activo,
          tipo_mantenimiento: nuevoMantenimiento.tipo_mantenimiento,
          descripcion: nuevoMantenimiento.descripcion,
          id_proveedor: nuevoMantenimiento.id_proveedor ? parseInt(nuevoMantenimiento.id_proveedor) : null,
          fecha_programada: nuevoMantenimiento.fecha_programada || null,
          costo: nuevoMantenimiento.costo ? parseFloat(nuevoMantenimiento.costo) : 0
        }]);

      if (error) throw error;

      // Opcional: Cambiar el estatus del equipo a "En Mantenimiento"
      await supabase
        .from('equipos')
        .update({ estatus: 'En Mantenimiento' })
        .eq('clave_activo', nuevoMantenimiento.clave_activo);

      alert('¡Mantenimiento registrado y equipo actualizado!');
      setMostrarModal(false);
      setNuevoMantenimiento({ clave_activo: '', tipo_mantenimiento: '', descripcion: '', id_proveedor: '', fecha_programada: '', costo: '' });
      obtenerDatos(); 
    } catch (error) {
      alert('Error al guardar: ' + error.message);
    }
  };

  const completarMantenimiento = async (id_mantenimiento, clave_activo) => {
    if(!window.confirm('¿Estás seguro de marcar este mantenimiento como completado? El equipo volverá a estar Activo.')) return;
    
    try {
      // 1. Cerrar el ticket de mantenimiento
      const { error: errorMant } = await supabase
        .from('mantenimientos')
        .update({ estatus: 'Completado', fecha_cierre: new Date().toISOString() })
        .eq('id_mantenimiento', id_mantenimiento);
      if (errorMant) throw errorMant;

      // 2. Regresar el equipo a estatus Activo
      const { error: errorEq } = await supabase
        .from('equipos')
        .update({ estatus: 'Activo' })
        .eq('clave_activo', clave_activo);
      if (errorEq) throw errorEq;

      alert('Servicio completado. Equipo listo para uso.');
      obtenerDatos();
    } catch (error) {
      alert('Error al completar: ' + error.message);
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return 'Sin fecha';
    return new Date(fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Gestión de Mantenimiento</h1>
          <p>Control de servicios preventivos, correctivos y proveedores</p>
        </div>
        <button className="btn-primary" onClick={() => setMostrarModal(true)}>+ Registrar Servicio</button>
      </header>

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
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>Cargando bitácora de servicios...</td></tr>
            ) : mantenimientos.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>No hay servicios registrados.</td></tr>
            ) : (
              mantenimientos.map((mant) => (
                <tr key={mant.id_mantenimiento}>
                  <td>
                    <strong>{mant.clave_activo}</strong><br/>
                    <small>{mant.equipos?.marca} {mant.equipos?.modelo}</small>
                  </td>
                  <td>
                    <span className={`badge ${mant.tipo_mantenimiento === 'Preventivo' ? 'info' : 'danger'}`} style={{ marginBottom: '5px', display: 'inline-block' }}>
                      {mant.tipo_mantenimiento}
                    </span><br/>
                    <small>{mant.descripcion}</small>
                  </td>
                  <td>{mant.proveedores?.nombre || 'Interno / Sin asignar'}</td>
                  <td>
                    <small><strong>Prog:</strong> {formatearFecha(mant.fecha_programada)}</small><br/>
                    <small><strong>Cierre:</strong> {mant.fecha_cierre ? formatearFecha(mant.fecha_cierre) : '-'}</small>
                  </td>
                  <td>
                    <span className={`badge ${mant.estatus === 'Completado' ? 'ok' : 'warning'}`}>
                      {mant.estatus}
                    </span><br/>
                    <small>${mant.costo || '0.00'}</small>
                  </td>
                  <td>
                    {mant.estatus !== 'Completado' && (
                      <button className="btn-icon" style={{ borderColor: '#27ae60', color: '#27ae60' }} onClick={() => completarMantenimiento(mant.id_mantenimiento, mant.clave_activo)}>
                        ✔ Completar
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
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <h2>Registrar Nuevo Mantenimiento</h2>
            <form onSubmit={guardarMantenimiento}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>Equipo</label>
                  <select name="clave_activo" required value={nuevoMantenimiento.clave_activo} onChange={handleInputChange}>
                    <option value="">-- Seleccionar --</option>
                    {equipos.map(eq => <option key={eq.clave_activo} value={eq.clave_activo}>{eq.clave_activo} ({eq.marca})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Tipo de Servicio</label>
                  <select name="tipo_mantenimiento" required value={nuevoMantenimiento.tipo_mantenimiento} onChange={handleInputChange}>
                    <option value="">-- Seleccionar --</option>
                    <option value="Preventivo">Preventivo</option>
                    <option value="Correctivo">Correctivo (Falla)</option>
                  </select>
                </div>
              </div>
              
              <div className="form-group">
                <label>Descripción del Problema / Servicio</label>
                <input type="text" name="descripcion" required value={nuevoMantenimiento.descripcion} onChange={handleInputChange} placeholder="Ej. Cambio de aceite, calibración..." />
              </div>

              <div className="form-group">
                <label>Proveedor Asignado (Opcional)</label>
                <select name="id_proveedor" value={nuevoMantenimiento.id_proveedor} onChange={handleInputChange}>
                  <option value="">Resolución Interna</option>
                  {proveedores.map(prov => (
                    <option key={prov.id_proveedor} value={prov.id_proveedor}>
                      {prov.nombre} {prov.es_preferido ? '⭐' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>Fecha Programada</label>
                  <input type="date" name="fecha_programada" value={nuevoMantenimiento.fecha_programada} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Costo Estimado ($)</label>
                  <input type="number" step="0.01" name="costo" value={nuevoMantenimiento.costo} onChange={handleInputChange} placeholder="0.00" />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setMostrarModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Registrar Servicio</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Mantenimiento;