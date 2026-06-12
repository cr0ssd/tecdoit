import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { inventarioAPI } from '../services/api';

import { useOrdenamiento } from '../hooks/useOrdenamiento';
import Th from '../components/Th';

function Inventario() {
  const [equipos, setEquipos] = useState([]);
  const [laboratorios, setLaboratorios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [busqueda, setBusqueda] = useState('');
  const [filtroLab, setFiltroLab] = useState('');

  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);

  const [nuevoEquipo, setNuevoEquipo] = useState({
    clave_activo: '',
    marca: '',
    modelo: '',
    id_laboratorio: '',
    imagen_url: '',
    costo: '',
    limite_horas: ''
  });

  const [imagenArchivo, setImagenArchivo] = useState(null);
  const [subiendo, setSubiendo] = useState(false);

  // URL de la imagen mostrada en el visor ampliado (null = cerrado)
  const [imagenPreview, setImagenPreview] = useState(null);

  useEffect(() => {
    obtenerDatos();
  }, []);

  // Cerrar el visor de imagen con la tecla Escape
  useEffect(() => {
    if (!imagenPreview) return;
    const handleKey = (e) => { if (e.key === 'Escape') setImagenPreview(null); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [imagenPreview]);

  async function obtenerDatos() {
    setCargando(true);
    setError(null);
    try {
      const [dataEquipos, dataLabs] = await Promise.all([
        inventarioAPI.obtenerEquipos(),
        inventarioAPI.obtenerLaboratorios()
      ]);
      setEquipos(dataEquipos);
      setLaboratorios(dataLabs);
    } catch (err) {
      console.error('Error al cargar datos:', err.message);
      setError('No se pudo cargar el inventario. Verifica que el backend esté corriendo.');
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

  const { datosOrdenados, orden, ordenarPor } = useOrdenamiento(equiposFiltrados);

  const claveDuplicada = !modoEdicion && nuevoEquipo.clave_activo.trim() !== ''
    ? equipos.find(e => e.clave_activo.toLowerCase() === nuevoEquipo.clave_activo.trim().toLowerCase())
    : null;
  const claveDisponible = !modoEdicion && nuevoEquipo.clave_activo.trim() !== '' && !claveDuplicada;

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
    setNuevoEquipo({ clave_activo: '', marca: '', modelo: '', id_laboratorio: '', imagen_url: '', costo: '', limite_horas: '' });
    setImagenArchivo(null);
    setError(null);
    setMostrarModal(true);
  };

  const abrirModalEditar = (equipo) => {
    setModoEdicion(true);
    setNuevoEquipo({
      clave_activo: equipo.clave_activo,
      marca: equipo.marca || '',
      modelo: equipo.modelo || '',
      id_laboratorio: equipo.id_laboratorio || '',
      imagen_url: equipo.imagen_url || '',
      costo: equipo.costo || '',
      limite_horas: equipo.limite_horas || ''
    });
    setImagenArchivo(null);
    setError(null);
    setMostrarModal(true);
  };

  const eliminarEquipo = async (clave_activo) => {
    const confirmacion = window.confirm(`¿Está seguro de que desea eliminar el equipo ${clave_activo}? Esta acción es permanente.`);
    if (!confirmacion) return;
    setError(null);
    try {
      await inventarioAPI.eliminarEquipo(clave_activo);
      obtenerDatos();
    } catch (err) {
      setError('Error al eliminar: ' + err.message);
    }
  };

  const guardarEquipo = async (e) => {
    e.preventDefault();
    setSubiendo(true);
    setError(null);

    try {
      // Image upload stays in frontend per Rule 6 — Supabase Storage with Anon Key
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

      const datos = {
        marca: nuevoEquipo.marca,
        modelo: nuevoEquipo.modelo,
        id_laboratorio: nuevoEquipo.id_laboratorio,
        imagen_url: url_imagen_final,
        costo: nuevoEquipo.costo,
        limite_horas: nuevoEquipo.limite_horas
      };

      if (modoEdicion) {
        await inventarioAPI.actualizarEquipo(nuevoEquipo.clave_activo, datos);
      } else {
        await inventarioAPI.crearEquipo({ ...datos, clave_activo: nuevoEquipo.clave_activo });
      }

      setMostrarModal(false);
      obtenerDatos();
    } catch (err) {
      setError('Error al guardar: ' + err.message);
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Gestión de Inventarios</h1>
          <p>Catálogo centralizado de activos corporativos</p>
        </div>
        <button className="btn-primary" onClick={abrirModalNuevo}>Agregar Activo</button>
      </header>

      {error && !mostrarModal && (
        <div style={{ backgroundColor: '#fceceb', color: '#e74c3c', padding: '12px 16px', borderRadius: '6px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      <section className="filters-section" style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Buscar por clave, marca o modelo..."
          className="input-search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select className="select-filter" value={filtroLab} onChange={(e) => setFiltroLab(e.target.value)}>
          <option value="">Todos los Sectores</option>
          {laboratorios.map(lab => (
            <option key={lab.id_laboratorio} value={lab.id_laboratorio}>{lab.nombre}</option>
          ))}
        </select>
      </section>

      <section className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Fotografía</th>
              <Th col="clave" get={e => e.clave_activo} orden={orden} ordenarPor={ordenarPor}>Clave de Activo</Th>
              <Th col="marca" get={e => `${e.marca || ''} ${e.modelo || ''}`} orden={orden} ordenarPor={ordenarPor}>Marca y Modelo</Th>
              <Th col="lab" get={e => e.laboratorios?.nombre || ''} orden={orden} ordenarPor={ordenarPor}>Asignación</Th>
              <Th col="costo" get={e => Number(e.costo) || 0} orden={orden} ordenarPor={ordenarPor}>Parámetros Financieros / Uso</Th>
              <Th col="estatus" get={e => e.estatus || ''} orden={orden} ordenarPor={ordenarPor}>Estatus Operativo</Th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>Consultando base de datos...</td></tr>
            ) : equiposFiltrados.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>No se localizaron registros bajo los criterios especificados.</td></tr>
            ) : (
              datosOrdenados.map((equipo) => (
                <tr key={equipo.clave_activo}>
                  <td>
                    {equipo.imagen_url ? (
                      <img
                        src={equipo.imagen_url}
                        alt={equipo.modelo}
                        onClick={() => setImagenPreview(equipo.imagen_url)}
                        title="Clic para ampliar"
                        style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #ecf0f1', cursor: 'zoom-in' }}
                      />
                    ) : (
                      <div style={{ width: '50px', height: '50px', backgroundColor: '#ecf0f1', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#95a5a6', textAlign: 'center' }}>Sin archivo</div>
                    )}
                  </td>
                  <td><strong>{equipo.clave_activo}</strong></td>
                  <td>{equipo.marca}<br /><small>{equipo.modelo}</small></td>
                  <td>{equipo.laboratorios?.nombre || 'Pendiente de asignación'}</td>
                  <td>
                    Valor: ${equipo.costo || '0.00'}<br />
                    <small style={{ color: '#7f8c8d' }}>
                      {equipo.limite_horas ? `Umbral de servicio: ${equipo.limite_horas} hrs` : 'Umbral no definido'}
                    </small>
                  </td>
                  <td><span className={`badge ${equipo.estatus === 'Activo' ? 'ok' : 'warning'}`}>{equipo.estatus}</span></td>
                  <td>
                    <button className="btn-icon" onClick={() => abrirModalEditar(equipo)}>Modificar</button>
                    <button className="btn-icon" style={{ borderColor: '#e74c3c', color: '#e74c3c', marginLeft: '8px' }} onClick={() => eliminarEquipo(equipo.clave_activo)}>Eliminar</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {mostrarModal && (
        <div className="modal-overlay" onClick={() => !subiendo && setMostrarModal(false)}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
              {modoEdicion ? 'Modificación de Registro de Activo' : 'Alta de Nuevo Activo'}
            </h2>

            {error && (
              <div style={{ backgroundColor: '#fceceb', color: '#e74c3c', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '15px' }}>
                {error}
              </div>
            )}

            <form onSubmit={guardarEquipo}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div className="form-group" style={{ marginBottom: '0' }}>
                  <label>Clave de Activo</label>
                  <input
                    type="text"
                    name="clave_activo"
                    required
                    value={nuevoEquipo.clave_activo}
                    onChange={handleInputChange}
                    disabled={modoEdicion}
                    style={modoEdicion ? { backgroundColor: '#f4f7f6', cursor: 'not-allowed' } : {}}
                  />
                  {claveDuplicada && (
                    <small style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                      ⚠️ Ya registrada en: {claveDuplicada.marca} {claveDuplicada.modelo}
                    </small>
                  )}
                  {claveDisponible && (
                    <small style={{ color: '#27ae60', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                      ✓ Clave disponible
                    </small>
                  )}
                </div>
                <div className="form-group" style={{ marginBottom: '0' }}>
                  <label>Asignación de Área</label>
                  <select name="id_laboratorio" value={nuevoEquipo.id_laboratorio} onChange={handleInputChange} required>
                    <option value="">-- Seleccione una opción --</option>
                    {laboratorios.map(lab => (
                      <option key={lab.id_laboratorio} value={lab.id_laboratorio}>{lab.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div className="form-group" style={{ marginBottom: '0' }}>
                  <label>Marca Fabricante</label>
                  <input type="text" name="marca" value={nuevoEquipo.marca} onChange={handleInputChange} />
                </div>
                <div className="form-group" style={{ marginBottom: '0' }}>
                  <label>Modelo</label>
                  <input type="text" name="modelo" value={nuevoEquipo.modelo} onChange={handleInputChange} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div className="form-group" style={{ marginBottom: '0' }}>
                  <label>Inversión Inicial ($)</label>
                  <input type="number" step="0.01" name="costo" value={nuevoEquipo.costo} onChange={handleInputChange} placeholder="0.00" />
                </div>
                <div className="form-group" style={{ marginBottom: '0' }}>
                  <label>Límite de Operación (Horas)</label>
                  <input type="number" step="0.1" name="limite_horas" value={nuevoEquipo.limite_horas} onChange={handleInputChange} placeholder="Parámetro opcional" />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '25px' }}>
                <label>{modoEdicion ? 'Actualización de Documento Gráfico' : 'Documento Gráfico (Fotografía)'}</label>
                <input type="file" accept="image/*" onChange={handleFileChange} />
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setMostrarModal(false)} disabled={subiendo}>
                  Cancelar Operación
                </button>
                <button type="submit" className="btn-primary" disabled={subiendo || !!claveDuplicada}>
                  {subiendo ? 'Procesando...' : modoEdicion ? 'Aplicar Modificaciones' : 'Confirmar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Visor de imagen ampliada — clic afuera o Esc para cerrar */}
      {imagenPreview && (
        <div
          onClick={() => setImagenPreview(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '40px', cursor: 'zoom-out',
          }}
        >
          <button
            onClick={() => setImagenPreview(null)}
            title="Cerrar"
            style={{
              position: 'absolute', top: '20px', right: '24px',
              background: 'none', border: 'none', color: 'white',
              fontSize: '32px', lineHeight: 1, cursor: 'pointer',
            }}
          >
            ×
          </button>
          <img
            src={imagenPreview}
            alt="Vista ampliada del equipo"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '90vw', maxHeight: '85vh',
              objectFit: 'contain', borderRadius: '8px',
              boxShadow: '0 8px 40px rgba(0,0,0,0.5)', cursor: 'default',
            }}
          />
        </div>
      )}
    </div>
  );
}

export default Inventario;