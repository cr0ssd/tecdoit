import React, { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { usoEquiposAPI, equiposAPI } from '../services/api';

import EquipoPicker from '../components/EquipoPicker';

import { useOrdenamiento } from '../hooks/useOrdenamiento';
import Th from '../components/Th';

// ─── Carrera helpers ──────────────────────────────────────────────────────────
// Quick-select options shown as pill buttons
const CARRERAS_RAPIDAS = ['PREPA','EXTERNO'];

// Regex mirrors backend: exactly 3 uppercase letters OR "PREPA"
const CARRERA_REGEX = /^([A-Z]{3}|EXTERNO|PREPA)$/;

function normalizarCarrera(raw) {
  return raw ? raw.trim().toUpperCase() : '';
}

function carreraValida(val) {
  return CARRERA_REGEX.test(normalizarCarrera(val));
}

// ─── Component ────────────────────────────────────────────────────────────────
function UsoEquipos() {
  const [registros, setRegistros] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);

  const [mostrarCamara, setMostrarCamara] = useState(false);

  const [nuevoUso, setNuevoUso] = useState({
    clave_activo: '',
    usuario_nombre: '',
    proposito: '',
    carrera: '',
  });

  // Tracks whether the user typed a custom carrera (not a pill pick)
  const [carreraCustom, setCarreraCustom] = useState(false);
  const [carreraError, setCarreraError] = useState(null);

  useEffect(() => {
    obtenerRegistros();
    cargarEquipos();
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

  async function cargarEquipos() {
    try {
      const data = await equiposAPI.obtenerTodos();
      setEquipos(data);
    } catch (err) {
      console.error('Error al cargar equipos:', err.message);
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNuevoUso(prev => ({ ...prev, [name]: value }));
    if (name === 'carrera') setCarreraError(null);
  };

  // Pill selection — directly sets a valid value
  const seleccionarCarrera = (valor) => {
    setNuevoUso(prev => ({ ...prev, carrera: valor }));
    setCarreraCustom(false);
    setCarreraError(null);
  };

  // Toggle to free-entry mode
  const activarCarreraCustom = () => {
    setNuevoUso(prev => ({ ...prev, carrera: '' }));
    setCarreraCustom(true);
    setCarreraError(null);
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
    setCarreraError(null);

    // Client-side carrera validation before hitting the network
    const carreraFinal = normalizarCarrera(nuevoUso.carrera);
    if (!carreraFinal) {
      setCarreraError('Selecciona o ingresa una carrera.');
      return;
    }
    if (!carreraValida(carreraFinal)) {
      setCarreraError('Debe ser 3 letras (Ej: ITC) o "Prepa".');
      return;
    }

    try {
      await usoEquiposAPI.iniciarUso({
        clave_activo: nuevoUso.clave_activo,
        usuario_nombre: nuevoUso.usuario_nombre,
        proposito: nuevoUso.proposito,
        carrera: carreraFinal,
      });
      setMensajeExito('Sesión de uso iniciada correctamente.');
      setNuevoUso({ clave_activo: '', usuario_nombre: '', proposito: '', carrera: '' });
      setCarreraCustom(false);
      obtenerRegistros();
    } catch (err) {
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
      hour12: true,
    });
  };

  const { datosOrdenados, orden, ordenarPor } = useOrdenamiento(registros);

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

      {/* ── Registration form ─────────────────────────────────────────────── */}
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
            <p style={{ textAlign: 'center', fontSize: '12px', color: '#7f8c8d', marginBottom: '10px' }}>
              Apunta el código QR a tu cámara
            </p>
            <Scanner
              onScan={(resultado) => handleQRScan(resultado)}
              onResult={(resultado) => handleQRScan(resultado)}
              onError={(error) => console.log(error?.message)}
            />
          </div>
        )}

        <form onSubmit={iniciarUso}>
          {/* Row 1: equipment, user, purpose */}
          <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '15px' }}>
            <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
              <label>Clave del Equipo</label>
              <EquipoPicker
                equipos={equipos}
                value={nuevoUso.clave_activo}
                onChange={val => setNuevoUso(prev => ({ ...prev, clave_activo: val }))}
              />
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
              <label>Nombre del Usuario / Alumno</label>
              <input
                type="text"
                name="usuario_nombre"
                required
                value={nuevoUso.usuario_nombre}
                onChange={handleInputChange}
                placeholder="Nombre completo"
              />
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
              <label>Propósito (Opcional)</label>
              <input
                type="text"
                name="proposito"
                value={nuevoUso.proposito}
                onChange={handleInputChange}
                placeholder="Ej. Práctica de redes"
              />
            </div>
          </div>

          {/* Row 2: carrera selector + submit */}
          <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: '280px', marginBottom: 0 }}>
              <label>
                Carrera <span style={{ color: '#e74c3c', fontWeight: '700' }}>*</span>
              </label>

              {/* Pill quick-select */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: carreraCustom ? '8px' : '0' }}>
                {CARRERAS_RAPIDAS.map((opcion) => {
                  const selected = !carreraCustom && nuevoUso.carrera === opcion;
                  return (
                    <button
                      key={opcion}
                      type="button"
                      onClick={() => seleccionarCarrera(opcion)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        border: `2px solid ${selected ? '#3498db' : '#bdc3c7'}`,
                        backgroundColor: selected ? '#3498db' : 'transparent',
                        color: selected ? 'white' : '#7f8c8d',
                        fontSize: '13px',
                        fontWeight: selected ? '700' : '400',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {opcion}
                    </button>
                  );
                })}

                {/* "Profesional" toggle */}
                <button
                  type="button"
                  onClick={activarCarreraCustom}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: `2px solid ${carreraCustom ? '#3498db' : '#bdc3c7'}`,
                    backgroundColor: carreraCustom ? '#eaf4fb' : 'transparent',
                    color: carreraCustom ? '#2980b9' : '#7f8c8d',
                    fontSize: '13px',
                    fontWeight: carreraCustom ? '700' : '400',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Profesional…
                </button>
              </div>

              {/* Free-entry input shown only when "Profesional" is active */}
              {carreraCustom && (
                <input
                  type="text"
                  name="carrera"
                  value={nuevoUso.carrera}
                  onChange={handleInputChange}
                  placeholder="3 letras, Ej: LIN, ARQ…"
                  maxLength={5}
                  autoFocus
                  style={{
                    padding: '8px 10px',
                    border: `1px solid ${carreraError ? '#e74c3c' : '#bdc3c7'}`,
                    borderRadius: '6px',
                    fontSize: '14px',
                    width: '160px',
                    outline: 'none',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#3498db')}
                  onBlur={e => (e.target.style.borderColor = carreraError ? '#e74c3c' : '#bdc3c7')}
                />
              )}

              {/* Inline validation hint */}
              {carreraError && (
                <span style={{ fontSize: '12px', color: '#e74c3c', marginTop: '4px', display: 'block' }}>
                  {carreraError}
                </span>
              )}
              {!carreraError && (
                <span style={{ fontSize: '11px', color: '#bdc3c7', marginTop: '4px', display: 'block' }}>
                  Elige una opción o escribe 3 letras / "Prepa"
                </span>
              )}
            </div>

            <button type="submit" className="btn-primary" style={{ height: '41px', flexShrink: 0 }}>
              Iniciar Uso
            </button>
          </div>
        </form>
      </section>

      {/* ── Bitácora table ────────────────────────────────────────────────── */}
      <section className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <Th col="equipo" get={r => r.clave_activo} orden={orden} ordenarPor={ordenarPor}>Equipo</Th>
              <Th col="usuario" get={r => r.usuario_nombre || ''} orden={orden} ordenarPor={ordenarPor}>Usuario</Th>
              <Th col="carrera" get={r => r.carrera || ''} orden={orden} ordenarPor={ordenarPor}>Carrera</Th>
              <Th col="inicio" get={r => r.hora_inicio ? new Date(r.hora_inicio).getTime() : null} orden={orden} ordenarPor={ordenarPor}>Inicio</Th>
              <Th col="fin" get={r => r.hora_fin ? new Date(r.hora_fin).getTime() : null} orden={orden} ordenarPor={ordenarPor}>Fin</Th>
              <Th col="estatus" get={r => r.hora_fin ? 1 : 0} orden={orden} ordenarPor={ordenarPor}>Estatus</Th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>
                  Procesando información...
                </td>
              </tr>
            ) : registros.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>
                  No se localizaron registros bajo los criterios especificados.
                </td>
              </tr>
            ) : (
              datosOrdenados.map((reg) => (
                <tr key={reg.id_uso}>
                  <td>
                    <strong>{reg.clave_activo}</strong>
                    <br />
                    <small>{reg.equipos?.marca} {reg.equipos?.modelo}</small>
                  </td>
                  <td>
                    {reg.usuario_nombre}
                    <br />
                    <small style={{ color: '#7f8c8d' }}>{reg.proposito}</small>
                  </td>
                  <td>
                    {reg.carrera ? (
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        fontWeight: '700',
                        backgroundColor: '#e8f4fd',
                        color: '#2980b9',
                        letterSpacing: '0.5px',
                      }}>
                        {reg.carrera}
                      </span>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#bdc3c7' }}>—</span>
                    )}
                  </td>
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