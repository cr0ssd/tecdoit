import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

function Inventario() {
  const [equipos, setEquipos] = useState([]);
  const [laboratorios, setLaboratorios] = useState([]);
  const [cargando, setCargando] = useState(true);

  // 1. NUEVOS ESTADOS PARA LOS FILTROS
  const [busqueda, setBusqueda] = useState('');
  const [filtroLab, setFiltroLab] = useState('');

  const [mostrarModal, setMostrarModal] = useState(false);
  const [nuevoEquipo, setNuevoEquipo] = useState({
    clave_activo: '',
    marca: '',
    modelo: '',
    id_laboratorio: ''
  });

  useEffect(() => {
    obtenerDatos();
  }, []);

  async function obtenerDatos() {
    setCargando(true);
    try {
      // 2. AGREGAMOS 'id_laboratorio' AL SELECT DE SUPABASE
      const { data: dataEquipos, error: errorEquipos } = await supabase
        .from('equipos')
        .select('clave_activo, marca, modelo, estatus, id_laboratorio, laboratorios (nombre)');
      if (errorEquipos) throw errorEquipos;
      if (dataEquipos) setEquipos(dataEquipos);

      const { data: dataLabs, error: errorLabs } = await supabase
        .from('laboratorios')
        .select('id_laboratorio, nombre');
      if (errorLabs) throw errorLabs;
      if (dataLabs) setLaboratorios(dataLabs);

    } catch (error) {
      console.error('Error al cargar datos:', error.message);
    } finally {
      setCargando(false);
    }
  }

  // 3. LÓGICA MÁGICA DE FILTRADO EN TIEMPO REAL
  const equiposFiltrados = equipos.filter((equipo) => {
    // Revisamos si lo escrito coincide con la clave, marca o modelo (ignorando mayúsculas)
    const textoBusqueda = busqueda.toLowerCase();
    const coincideTexto = 
      (equipo.clave_activo && equipo.clave_activo.toLowerCase().includes(textoBusqueda)) ||
      (equipo.marca && equipo.marca.toLowerCase().includes(textoBusqueda)) ||
      (equipo.modelo && equipo.modelo.toLowerCase().includes(textoBusqueda));

    // Revisamos si el laboratorio coincide (o si no hay filtro seleccionado)
    const coincideLab = filtroLab === '' || equipo.id_laboratorio?.toString() === filtroLab;

    return coincideTexto && coincideLab;
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNuevoEquipo({ ...nuevoEquipo, [name]: value });
  };

  const guardarEquipo = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('equipos')
        .insert([
          {
            clave_activo: nuevoEquipo.clave_activo,
            marca: nuevoEquipo.marca,
            modelo: nuevoEquipo.modelo,
            id_laboratorio: nuevoEquipo.id_laboratorio ? parseInt(nuevoEquipo.id_laboratorio) : null
          }
        ]);

      if (error) throw error;

      alert('¡Equipo registrado con éxito!');
      setMostrarModal(false);
      setNuevoEquipo({ clave_activo: '', marca: '', modelo: '', id_laboratorio: '' });
      obtenerDatos(); 
    } catch (error) {
      alert('Hubo un error al guardar: ' + error.message);
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Gestión de Inventarios</h1>
          <p>Catálogo centralizado de equipos por laboratorio</p>
        </div>
        <button className="btn-primary" onClick={() => setMostrarModal(true)}>+ Agregar Equipo</button>
      </header>

      {/* 4. CONECTAMOS LOS INPUTS A NUESTROS ESTADOS */}
      <section className="filters-section" style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
        <input 
          type="text" 
          placeholder="Buscar por clave, marca o modelo..." 
          className="input-search" 
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select 
          className="select-filter"
          value={filtroLab}
          onChange={(e) => setFiltroLab(e.target.value)}
        >
          <option value="">Todos los Laboratorios</option>
          {laboratorios.map(lab => (
            <option key={lab.id_laboratorio} value={lab.id_laboratorio}>{lab.nombre}</option>
          ))}
        </select>
      </section>

      <section className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Clave Activo</th>
              <th>Equipo / Marca</th>
              <th>Laboratorio</th>
              <th>Estatus</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>Cargando datos desde la nube...</td></tr>
            ) : equiposFiltrados.length === 0 ? (
              /* AHORA USAMOS equiposFiltrados en lugar de equipos */
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>No se encontraron equipos que coincidan con la búsqueda.</td></tr>
            ) : (
              equiposFiltrados.map((equipo) => (
                <tr key={equipo.clave_activo}>
                  <td><strong>{equipo.clave_activo}</strong></td>
                  <td>{equipo.marca} <br/><small>{equipo.modelo}</small></td>
                  <td>{equipo.laboratorios?.nombre || 'Sin asignar'}</td>
                  <td>
                    <span className={`badge ${equipo.estatus === 'Activo' ? 'ok' : 'warning'}`}>
                      {equipo.estatus}
                    </span>
                  </td>
                  <td><button className="btn-icon">Editar</button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* Modal para agregar equipo */}
      {mostrarModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Registrar Nuevo Equipo</h2>
            <form onSubmit={guardarEquipo}>
              <div className="form-group">
                <label>Clave Activo (Obligatorio)</label>
                <input type="text" name="clave_activo" required value={nuevoEquipo.clave_activo} onChange={handleInputChange} placeholder="Ej. TEC-COMP-002" />
              </div>
              <div className="form-group">
                <label>Marca</label>
                <input type="text" name="marca" value={nuevoEquipo.marca} onChange={handleInputChange} placeholder="Ej. Dell" />
              </div>
              <div className="form-group">
                <label>Modelo</label>
                <input type="text" name="modelo" value={nuevoEquipo.modelo} onChange={handleInputChange} placeholder="Ej. OptiPlex 7090" />
              </div>
              <div className="form-group">
                <label>Laboratorio</label>
                <select name="id_laboratorio" value={nuevoEquipo.id_laboratorio} onChange={handleInputChange} required>
                  <option value="">-- Selecciona un Laboratorio --</option>
                  {laboratorios.map(lab => (
                    <option key={lab.id_laboratorio} value={lab.id_laboratorio}>{lab.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setMostrarModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar Equipo</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Inventario;