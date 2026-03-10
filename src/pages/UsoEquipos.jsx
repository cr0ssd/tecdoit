import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

function UsoEquipos() {
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  
  // Estado para el formulario de nuevo uso
  const [nuevoUso, setNuevoUso] = useState({
    clave_activo: '',
    usuario_nombre: '',
    proposito: ''
  });

  useEffect(() => {
    obtenerRegistros();
  }, []);

  async function obtenerRegistros() {
    setCargando(true);
    try {
      // Traemos el historial de uso y los datos del equipo asociado
      const { data, error } = await supabase
        .from('registro_uso')
        .select('*, equipos(marca, modelo, laboratorios(nombre))')
        .order('hora_inicio', { ascending: false });
      
      if (error) throw error;
      if (data) setRegistros(data);
    } catch (error) {
      console.error('Error al cargar registros:', error.message);
    } finally {
      setCargando(false);
    }
  }

  const handleInputChange = (e) => {
    setNuevoUso({ ...nuevoUso, [e.target.name]: e.target.value });
  };

  const iniciarUso = async (e) => {
    e.preventDefault();
    try {
      // 1. Verificar si el equipo existe en el inventario y está activo
      const { data: equipo, error: errorEq } = await supabase
        .from('equipos')
        .select('estatus')
        .eq('clave_activo', nuevoUso.clave_activo)
        .single();

      if (errorEq || !equipo) throw new Error('Equipo no encontrado. Verifica la clave.');
      if (equipo.estatus !== 'Activo') throw new Error('El equipo no está Activo (puede estar en mantenimiento).');

      // 2. Verificar si el equipo ya está siendo usado por alguien más
      const { data: usoActivo } = await supabase
        .from('registro_uso')
        .select('id_uso')
        .eq('clave_activo', nuevoUso.clave_activo)
        .eq('estatus', 'En uso');
      
      if (usoActivo && usoActivo.length > 0) throw new Error('Este equipo ya está en uso actualmente. Deben finalizar la sesión anterior.');

      // 3. Registrar el inicio de uso
      const { error } = await supabase
        .from('registro_uso')
        .insert([{
          clave_activo: nuevoUso.clave_activo,
          usuario_nombre: nuevoUso.usuario_nombre,
          proposito: nuevoUso.proposito
        }]);

      if (error) throw error;
      
      alert('¡Sesión de uso iniciada correctamente!');
      setNuevoUso({ clave_activo: '', usuario_nombre: '', proposito: '' });
      obtenerRegistros(); // Recargar la tabla
    } catch (error) {
      alert(error.message);
    }
  };

  const finalizarUso = async (id_uso) => {
    try {
      // Actualizamos el registro poniendo la hora actual y cambiando el estatus
      const { error } = await supabase
        .from('registro_uso')
        .update({ 
          estatus: 'Finalizado', 
          hora_fin: new Date().toISOString() 
        })
        .eq('id_uso', id_uso);

      if (error) throw error;
      alert('Sesión finalizada. Equipo liberado.');
      obtenerRegistros();
    } catch (error) {
      alert('Error al finalizar: ' + error.message);
    }
  };

  // Función para formatear fechas de manera amigable
  const formatearFecha = (fechaIso) => {
    if (!fechaIso) return '-';
    const fecha = new Date(fechaIso);
    return fecha.toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' });
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Registro de Uso de Equipos</h1>
        <p>Control de bitácora y asignación temporal de activos</p>
      </header>

      {/* Formulario rápido para simular lectura QR */}
      <section className="kpi-card" style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '16px', marginBottom: '15px', color: '#2c3e50' }}>Registrar Nueva Sesión</h2>
        <form onSubmit={iniciarUso} style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
            <label>Clave del Equipo (Simula QR)</label>
            <input type="text" name="clave_activo" required value={nuevoUso.clave_activo} onChange={handleInputChange} placeholder="Ej. TEC-COMP-001" />
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
            <label>Nombre del Usuario / Alumno</label>
            <input type="text" name="usuario_nombre" required value={nuevoUso.usuario_nombre} onChange={handleInputChange} placeholder="Nombre completo" />
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
            <label>Propósito (Opcional)</label>
            <input type="text" name="proposito" value={nuevoUso.proposito} onChange={handleInputChange} placeholder="Ej. Práctica de redes" />
          </div>
          <button type="submit" className="btn-primary" style={{ height: '41px' }}>Iniciar Uso</button>
        </form>
      </section>

      {/* Tabla de Bitácora */}
      <section className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Equipo</th>
              <th>Usuario</th>
              <th>Inicio</th>
              <th>Fin</th>
              <th>Estatus</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>Cargando bitácora...</td></tr>
            ) : registros.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>No hay registros de uso aún.</td></tr>
            ) : (
              registros.map((reg) => (
                <tr key={reg.id_uso}>
                  <td>
                    <strong>{reg.clave_activo}</strong><br/>
                    <small>{reg.equipos?.marca} {reg.equipos?.modelo}</small>
                  </td>
                  <td>{reg.usuario_nombre}<br/><small>{reg.proposito}</small></td>
                  <td>{formatearFecha(reg.hora_inicio)}</td>
                  <td>{formatearFecha(reg.hora_fin)}</td>
                  <td>
                    <span className={`badge ${reg.estatus === 'En uso' ? 'warning' : 'ok'}`}>
                      {reg.estatus}
                    </span>
                  </td>
                  <td>
                    {reg.estatus === 'En uso' ? (
                      <button className="btn-icon" style={{ borderColor: '#e74c3c', color: '#e74c3c' }} onClick={() => finalizarUso(reg.id_uso)}>
                        Finalizar
                      </button>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#7f8c8d' }}>Completado</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default UsoEquipos;