import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';

function Mantenimiento() {
  const location = useLocation();
  const [mantenimientos, setMantenimientos] = useState([]);
  const [equiposDisponibles, setEquiposDisponibles] = useState([]);
  const [cargando, setCargando] = useState(true);
  
  const [mostrarModal, setMostrarModal] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Estado basado en los campos de tu captura de pantalla
  const [nuevoMantenimiento, setNuevoMantenimiento] = useState({
    clave_activo: '',
    tipo_servicio: '',
    descripcion: '',
    proveedor: '',
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
    try {
      // Se asume la existencia de estas columnas basándonos en tu interfaz
      const { data: dataMant, error: errorMant } = await supabase
        .from('mantenimientos')
        .select('*, equipos(marca, modelo)')
        .order('fecha_programada', { ascending: false });
      
      if (errorMant) throw errorMant;
      if (dataMant) setMantenimientos(dataMant);

      const { data: dataEq, error: errorEq } = await supabase
        .from('equipos')
        .select('clave_activo, marca, modelo, estatus');
      
      if (errorEq) throw errorEq;
      if (dataEq) setEquiposDisponibles(dataEq);

    } catch (error) {
      console.error('Error al cargar información de mantenimiento:', error.message);
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
      tipo_servicio: '',
      descripcion: '',
      proveedor: '',
      fecha_programada: '',
      costo_estimado: ''
    });
    setMostrarModal(true);
  };

  const guardarMantenimiento = async (e) => {
    e.preventDefault();
    setGuardando(true);

    try {
      const costoProcesado = nuevoMantenimiento.costo_estimado ? parseFloat(nuevoMantenimiento.costo_estimado) : 0;

      const { error: errorInsert } = await supabase
        .from('mantenimientos')
        .insert([{
          clave_activo: nuevoMantenimiento.clave_activo,
          tipo_servicio: nuevoMantenimiento.tipo_servicio,
          descripcion: nuevoMantenimiento.descripcion,
          proveedor: nuevoMantenimiento.proveedor,
          fecha_programada: nuevoMantenimiento.fecha_programada,
          costo: costoProcesado,
          estatus: 'Abierto' // Estado inicial del ticket
        }]);

      if (errorInsert) throw errorInsert;

      // Restablecer parámetros del equipo al abrir el ticket de mantenimiento
      const { error: errorUpdate } = await supabase
        .from('equipos')
        .update({ 
          estatus: 'En Mantenimiento', 
          horas_acumuladas: 0, 
          mantenimiento_urgente: false 
        })
        .eq('clave_activo', nuevoMantenimiento.clave_activo);

      if (errorUpdate) throw errorUpdate;

      alert('Servicio registrado exitosamente.');
      setMostrarModal(false);
      obtenerDatos();
    } catch (error) {
      alert('Error al procesar el registro: ' + error.message);
    } finally {
      setGuardando(false);
    }
  };

  const completarMantenimiento = async (id_mantenimiento, clave_activo) => {
    try {
      const { error: errMant } = await supabase
        .from('mantenimientos')
        .update({ estatus: 'Completado', fecha_cierre: new Date().toISOString() })
        .eq('id', id_mantenimiento);
        
      if (errMant) throw errMant;

      const { error: errEq } = await supabase
        .from('equipos')
        .update({ estatus: 'Activo' })
        .eq('clave_activo', clave_activo);

      if (errEq) throw errEq;

      obtenerDatos();
    } catch (error) {
      alert('Error al completar el servicio: ' + error.message);
    }
  };

  const formatearFecha = (fechaIso) => {
    if (!fechaIso) return '-';
    const fecha = new Date(fechaIso);
    return fecha.toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatoMoneda = (cantidad) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(cantidad);

  return (
    <div className="dashboard-container">
      <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Gestión de Mantenimiento</h1>
          <p>Control de servicios preventivos, correctivos y proveedores</p>
        </div>
        <button className="btn-primary" onClick={() => abrirModalNuevo('')}>+ Registrar Servicio</button>
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
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>Procesando información...</td></tr>
            ) : mantenimientos.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>No existen registros en el sistema.</td></tr>
            ) : (
              mantenimientos.map((mant) => (
                <tr key={mant.id}>
                  <td>
                    <strong>{mant.clave_activo}</strong><br/>
                    <small style={{ color: '#7f8c8d' }}>{mant.equipos?.marca} {mant.equipos?.modelo}</small>
                  </td>
                  <td>
                    <strong>{mant.tipo_servicio}</strong><br/>
                    <small>{mant.descripcion}</small>
                  </td>
                  <td>{mant.proveedor || 'Resolución Interna'}</td>
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
                        onClick={() => completarMantenimiento(mant.id, mant.clave_activo)}
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
            <form onSubmit={guardarMantenimiento}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>Equipo</label>
                  <select name="clave_activo" value={nuevoMantenimiento.clave_activo} onChange={handleInputChange} required>
                    <option value="">-- Seleccionar --</option>
                    {equiposDisponibles.map(eq => (
                      <option key={eq.clave_activo} value={eq.clave_activo}>
                        {eq.clave_activo}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Tipo de Servicio</label>
                  <select name="tipo_servicio" value={nuevoMantenimiento.tipo_servicio} onChange={handleInputChange} required>
                    <option value="">-- Seleccionar --</option>
                    <option value="Preventivo">Preventivo</option>
                    <option value="Correctivo">Correctivo</option>
                    <option value="Limpieza">Limpieza</option>
                    <option value="Calibración">Calibración</option>
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
                <select name="proveedor" value={nuevoMantenimiento.proveedor} onChange={handleInputChange}>
                  <option value="">Resolución Interna</option>
                  <option value="TechFix Solutions">TechFix Solutions</option>
                  <option value="Soporte Externo S.A.">Soporte Externo S.A.</option>
                  <option value="Garantía Fabricante">Garantía Fabricante</option>
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
                <button type="submit" className="btn-primary" disabled={guardando}>{guardando ? 'Procesando...' : 'Registrar Servicio'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Mantenimiento;