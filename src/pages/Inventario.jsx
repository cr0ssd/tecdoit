import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

function Inventario() {
  const [equipos, setEquipos] = useState([]);
  const [laboratorios, setLaboratorios] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [busqueda, setBusqueda] = useState('');
  const [filtroLab, setFiltroLab] = useState('');

  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);

  const [nuevoEquipo, setNuevoEquipo] = useState({
    clave_activo: '',
    marca: '',
    modelo: '',
    id_laboratorio: '',
    imagen_url: '' 
  });
  
  const [imagenArchivo, setImagenArchivo] = useState(null);
  const [subiendo, setSubiendo] = useState(false);

  useEffect(() => {
    obtenerDatos();
  }, []);

  async function obtenerDatos() {
    setCargando(true);
    try {
      const { data: dataEquipos, error: errorEquipos } = await supabase
        .from('equipos')
        .select('clave_activo, marca, modelo, estatus, id_laboratorio, imagen_url, laboratorios (nombre)');
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

  const equiposFiltrados = equipos.filter((equipo) => {
    const textoBusqueda = busqueda.toLowerCase();
    const coincideTexto = 
      (equipo.clave_activo && equipo.clave_activo.toLowerCase().includes(textoBusqueda)) ||
      (equipo.marca && equipo.marca.toLowerCase().includes(textoBusqueda)) ||
      (equipo.modelo && equipo.modelo.toLowerCase().includes(textoBusqueda));

    const coincideLab = filtroLab === '' || equipo.id_laboratorio?.toString() === filtroLab;

    return coincideTexto && coincideLab;
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNuevoEquipo({ ...nuevoEquipo, [name]: value });
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImagenArchivo(e.target.files[0]);
    }
  };

  const abrirModalNuevo = () => {
    setModoEdicion(false);
    setNuevoEquipo({ clave_activo: '', marca: '', modelo: '', id_laboratorio: '', imagen_url: '' });
    setImagenArchivo(null);
    setMostrarModal(true);
  };

  const abrirModalEditar = (equipo) => {
    setModoEdicion(true);
    setNuevoEquipo({
      clave_activo: equipo.clave_activo,
      marca: equipo.marca || '',
      modelo: equipo.modelo || '',
      id_laboratorio: equipo.id_laboratorio || '',
      imagen_url: equipo.imagen_url || ''
    });
    setImagenArchivo(null); 
    setMostrarModal(true);
  };

  // NUEVO: Función para eliminar un equipo de la base de datos
  const eliminarEquipo = async (clave_activo) => {
    // 1. Lanzamos una alerta de confirmación nativa del navegador
    const confirmacion = window.confirm(`¿Estás seguro de que deseas eliminar el equipo ${clave_activo}? Esta acción es permanente.`);
    
    // Si el usuario le da a "Cancelar", detenemos la función aquí mismo
    if (!confirmacion) return;

    try {
      // 2. Ejecutamos el Delete en Supabase
      const { error } = await supabase
        .from('equipos')
        .delete()
        .eq('clave_activo', clave_activo);

      if (error) throw error;

      alert('Equipo eliminado correctamente.');
      obtenerDatos(); // 3. Recargamos la tabla para que desaparezca
    } catch (error) {
      alert('Error al eliminar: ' + error.message);
    }
  };

  const guardarEquipo = async (e) => {
    e.preventDefault();
    setSubiendo(true);
    
    try {
      let url_imagen_final = nuevoEquipo.imagen_url;

      if (imagenArchivo) {
        const extension = imagenArchivo.name.split('.').pop();
        const nombreArchivo = `${nuevoEquipo.clave_activo}-${Date.now()}.${extension}`;

        const { error: errorUpload } = await supabase.storage
          .from('imagenes_equipos')
          .upload(nombreArchivo, imagenArchivo);

        if (errorUpload) throw errorUpload;

        const { data: urlData } = supabase.storage
          .from('imagenes_equipos')
          .getPublicUrl(nombreArchivo);

        url_imagen_final = urlData.publicUrl;
      }

      const datosGuardar = {
        marca: nuevoEquipo.marca,
        modelo: nuevoEquipo.modelo,
        id_laboratorio: nuevoEquipo.id_laboratorio ? parseInt(nuevoEquipo.id_laboratorio) : null,
        imagen_url: url_imagen_final
      };

      if (modoEdicion) {
        const { error } = await supabase
          .from('equipos')
          .update(datosGuardar)
          .eq('clave_activo', nuevoEquipo.clave_activo); 

        if (error) throw error;
        alert('¡Equipo actualizado con éxito!');

      } else {
        datosGuardar.clave_activo = nuevoEquipo.clave_activo; 
        const { error } = await supabase
          .from('equipos')
          .insert([datosGuardar]);

        if (error) throw error;
        alert('¡Equipo registrado con éxito!');
      }

      setMostrarModal(false);
      obtenerDatos(); 
    } catch (error) {
      alert('Hubo un error al guardar: ' + error.message);
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Gestión de Inventarios</h1>
          <p>Catálogo centralizado de equipos por laboratorio</p>
        </div>
        <button className="btn-primary" onClick={abrirModalNuevo}>+ Agregar Equipo</button>
      </header>

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
              <th>Foto</th>
              <th>Clave Activo</th>
              <th>Equipo / Marca</th>
              <th>Laboratorio</th>
              <th>Estatus</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>Cargando datos desde la nube...</td></tr>
            ) : equiposFiltrados.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>No se encontraron equipos que coincidan.</td></tr>
            ) : (
              equiposFiltrados.map((equipo) => (
                <tr key={equipo.clave_activo}>
                  <td>
                    {equipo.imagen_url ? (
                      <img 
                        src={equipo.imagen_url} 
                        alt={equipo.modelo} 
                        style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #ecf0f1' }} 
                      />
                    ) : (
                      <div style={{ width: '50px', height: '50px', backgroundColor: '#ecf0f1', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#95a5a6' }}>
                        Sin foto
                      </div>
                    )}
                  </td>
                  <td><strong>{equipo.clave_activo}</strong></td>
                  <td>{equipo.marca} <br/><small>{equipo.modelo}</small></td>
                  <td>{equipo.laboratorios?.nombre || 'Sin asignar'}</td>
                  <td>
                    <span className={`badge ${equipo.estatus === 'Activo' ? 'ok' : 'warning'}`}>
                      {equipo.estatus}
                    </span>
                  </td>
                  <td>
                    <button className="btn-icon" onClick={() => abrirModalEditar(equipo)}>Editar</button>
                    {/* NUEVO: Botón de Eliminar en color rojo */}
                    <button 
                      className="btn-icon" 
                      style={{ borderColor: '#e74c3c', color: '#e74c3c', marginLeft: '8px' }} 
                      onClick={() => eliminarEquipo(equipo.clave_activo)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {mostrarModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{modoEdicion ? 'Editar Equipo' : 'Registrar Nuevo Equipo'}</h2>
            <form onSubmit={guardarEquipo}>
              <div className="form-group">
                <label>Clave Activo (Identificador Único)</label>
                <input 
                  type="text" 
                  name="clave_activo" 
                  required 
                  value={nuevoEquipo.clave_activo} 
                  onChange={handleInputChange} 
                  placeholder="Ej. TEC-COMP-002" 
                  disabled={modoEdicion} 
                  style={modoEdicion ? { backgroundColor: '#f4f7f6', cursor: 'not-allowed' } : {}}
                />
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
              
              <div className="form-group">
                <label>{modoEdicion ? 'Actualizar Fotografía (Opcional)' : 'Fotografía del Equipo'}</label>
                <input type="file" accept="image/*" onChange={handleFileChange} />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setMostrarModal(false)} disabled={subiendo}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={subiendo}>
                  {subiendo ? 'Guardando...' : modoEdicion ? 'Actualizar Equipo' : 'Guardar Equipo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Inventario;