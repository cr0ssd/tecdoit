import React, { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { usoEquiposAPI } from '../services/api';

function UsoEquipos() {
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);

  const [mostrarCamara, setMostrarCamara] = useState(false);

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
      const data = await usoEquiposAPI.obtenerRegistros();
      setRegistros(data);
    } catch (err) {
      console.error('Error al cargar registros:', err.message);
      setError('No se pudo cargar la bitácora. Verifica que el backend esté corriendo.');
    } finally {
      setCargando(false);
    }
  }

  const handleInputChange = (e) => {
    setNuevoUso({ ...nuevoUso, [e.target.name]: e.target.value });
  };

  const handleQRScan = (resultado) => {
    if (!resultado) return;

    let textoDetectado = '';
    if (Array.isArray(resultado) && resultado.length > 0) {
      textoDetectado = resultado[0].rawValue;
    } else if (typeof resultado === 'string') {
      textoDetectado = resultado;
    }

    if (textoDetectado) {
      setNuevoUso(prev => ({ ...prev, clave_activo: textoDetectado }));
      setMostrarCamara(false);
      setMensajeExito(`Código escaneado: ${textoDetectado}`);
      setTimeout(() => setMensajeExito(null), 3000);
    }
  };

  const iniciarUso = async (e) => {
    e.preventDefault();
    setError(null);
    setMensajeExito(null);
    try {
      await usoEquiposAPI.iniciarUso({
        clave_activo: nuevoUso.clave_activo,
        usuario_nombre: nuevoUso.usuario_nombre,
        proposito: nuevoUso.proposito
      });
      setMensajeExito('Sesión de uso iniciada correctamente.');
      setNuevoUso({ clave_activo: '', usuario_nombre: '', proposito: '' });
      obtenerRegistros();
    } catch (err) {
      // Error message comes directly from backend validation
      setError(err.message);
    }
  };

  const finalizarUso = async (id_uso) => {
    setError(null);
    try {
      await usoEquiposAPI.finalizarUso(id_uso);
      setMensajeExito('Sesión finalizada. Equipo liberado.');
      obtenerRegistros();
    } catch (err) {
      setError('Error al finalizar: ' + err.message);
    }
  };

  const formatearFecha = (fechaIso) => {
    if (!fechaIso) return '-';
    const fechaUtc = fechaIso.includes('Z') ? fechaIso : `${fechaIso}Z`;
    return new Date(fechaUtc).toLocaleString('es-MX', {
      timeZone: 'America/Mexico_City',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Registro de Uso de Equipos</h1>
        <p>Control de bitácora y asignación temporal mediante QR</p>
      </header>

      {error && (
        <div style={{ backgroundColor: '#fceceb', color: '#e74c3c', padding: '12px 16px', borderRadius: '6px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {mensajeExito && (
        <div style={{ backgroundColor: '#eafaf1', color: '#27ae60', padding: '12px 16px', borderRadius: '6px', fontSize: '14px' }}>
          {mensajeExito}
        </div>
      )}

      <section className="kpi-card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={{ fontSize: '16px', color: '#2c3e50' }}>Registrar Nueva Sesión</h2>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setMostrarCamara(!mostrarCamara)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {mostrarCamara ? 'Cerrar Cámara' : 'Escanear QR'}
          </button>
        </div>

        {mostrarCamara && (
          <div style={{ maxWidth: '300px', margin: '0 auto 20px auto', border: '2px dashed #3498db', padding: '10px', borderRadius: '8px' }}>
            <p style={{ textAlign: 'center', fontSize: '12px', color: '#7f8c8d', marginBottom: '10px' }}>Apunta el código QR a tu cámara</p>
            <Scanner
              onScan={(resultado) => handleQRScan(resultado)}
              onResult={(resultado) => handleQRScan(resultado)}
              onError={(error) => console.log(error?.message)}
            />
          </div>
        )}

        <form onSubmit={iniciarUso} style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
            <label>Clave del Equipo</label>
            <input
              type="text"
              name="clave_activo"
              required
              value={nuevoUso.clave_activo}
              onChange={handleInputChange}
              placeholder="Ej. TEC-COMP-001 (Escríbelo o usa la cámara)"
            />
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
                    <strong>{reg.clave_activo}</strong><br />
                    <small>{reg.equipos?.marca} {reg.equipos?.modelo}</small>
                  </td>
                  <td>{reg.usuario_nombre}<br /><small>{reg.proposito}</small></td>
                  <td>{formatearFecha(reg.hora_inicio)}</td>
                  <td>{formatearFecha(reg.hora_fin)}</td>
                  <td>
                    <span className={`badge ${reg.estatus === 'En uso' ? 'warning' : 'ok'}`}>
                      {reg.estatus}
                    </span>
                  </td>
                  <td>
                    {reg.estatus === 'En uso' ? (
                      <button
                        className="btn-icon"
                        style={{ borderColor: '#e74c3c', color: '#e74c3c' }}
                        onClick={() => finalizarUso(reg.id_uso)}
                      >
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