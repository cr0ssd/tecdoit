import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../services/api';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_URL = import.meta.env.VITE_API_URL;

// ─── Mini calendar helpers ────────────────────────────────────────────────────
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS_SEMANA = ['Do','Lu','Ma','Mi','Ju','Vi','Sa'];

function getMesesDias(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return { firstDay, daysInMonth };
}

// ─── Calendar widget ──────────────────────────────────────────────────────────
function CalendarioPanel({ fechas, onClose }) {
  const today = new Date();
  const [mes, setMes] = useState(today.getMonth());
  const [anio, setAnio] = useState(today.getFullYear());
  const ref = useRef(null);

  // Build a map: "YYYY-MM-DD" → [{ clave_activo, tipo_requerimiento }]
  const mapaFechas = {};
  fechas.forEach(f => {
    if (!f.proxima_fecha) return;
    const key = f.proxima_fecha.slice(0, 10);
    if (!mapaFechas[key]) mapaFechas[key] = [];
    mapaFechas[key].push(f);
  });

  const { firstDay, daysInMonth } = getMesesDias(anio, mes);

  const prevMes = () => {
    if (mes === 0) { setMes(11); setAnio(a => a - 1); }
    else setMes(m => m - 1);
  };
  const nextMes = () => {
    if (mes === 11) { setMes(0); setAnio(a => a + 1); }
    else setMes(m => m + 1);
  };

  // Close on outside click
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div ref={ref} style={{
      position: 'absolute', right: 0, top: '44px', width: '320px',
      backgroundColor: '#ffffff', border: '1px solid #e0e0e0',
      borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
      zIndex: 1001, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', backgroundColor: '#1a252f', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={prevMes} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}>‹</button>
        <strong style={{ fontSize: '14px' }}>{MESES[mes]} {anio}</strong>
        <button onClick={nextMes} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}>›</button>
      </div>

      {/* Day labels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '8px 8px 0', gap: '2px' }}>
        {DIAS_SEMANA.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '10px', color: '#7f8c8d', fontWeight: '700', paddingBottom: '4px' }}>{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '0 8px 10px', gap: '2px' }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;

          const key = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const eventos = mapaFechas[key] || [];
          const isToday = day === today.getDate() && mes === today.getMonth() && anio === today.getFullYear();
          const hasMaint = eventos.length > 0;

          return (
            <div
              key={key}
              title={hasMaint ? eventos.map(e => `${e.clave_activo}: ${e.tipo_requerimiento}`).join('\n') : undefined}
              style={{
                textAlign: 'center',
                padding: '5px 2px',
                borderRadius: '6px',
                fontSize: '12px',
                position: 'relative',
                backgroundColor: isToday ? '#1a252f' : hasMaint ? '#fff3cd' : 'transparent',
                color: isToday ? 'white' : '#2c3e50',
                fontWeight: isToday ? '700' : 'normal',
                cursor: hasMaint ? 'default' : 'default',
              }}
            >
              {day}
              {hasMaint && (
                <div style={{
                  position: 'absolute', bottom: '2px', left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex', gap: '2px',
                }}>
                  {eventos.slice(0, 3).map((_, idx) => (
                    <div key={idx} style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#e67e22' }} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ padding: '8px 16px 12px', borderTop: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#fff3cd', border: '1px solid #e67e22' }} />
        <span style={{ fontSize: '11px', color: '#7f8c8d' }}>Mantenimiento preventivo pendiente</span>
      </div>

      {/* Upcoming list */}
      {Object.keys(mapaFechas).length > 0 && (
        <div style={{ borderTop: '1px solid #f0f0f0', padding: '10px 14px 12px' }}>
          <div style={{ fontSize: '11px', color: '#7f8c8d', fontWeight: '700', marginBottom: '6px', textTransform: 'uppercase' }}>Próximos</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '120px', overflowY: 'auto' }}>
            {Object.entries(mapaFechas)
              .sort(([a], [b]) => a.localeCompare(b))
              .slice(0, 5)
              .map(([fecha, items]) => (
                <div key={fecha} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '11px', color: '#e67e22', fontWeight: '700', whiteSpace: 'nowrap', minWidth: '75px' }}>
                    {new Date(fecha + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                  </span>
                  <span style={{ fontSize: '11px', color: '#2c3e50' }}>
                    {items.map(i => i.clave_activo).join(', ')}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
function Dashboard() {
  const navigate = useNavigate();

  const [metricas, setMetricas] = useState({
    totalEquipos: 0, mantenimientoActivo: 0, prestados: 0,
    opexMantenimientos: 0, opexReposiciones: 0, opexTotal: 0
  });

  const [actividadReciente, setActividadReciente] = useState([]);
  const [prestamosActivos, setPrestamosActivos] = useState([]);
  const [notificaciones, setNotificaciones] = useState([]);
  const [leidasLocales, setLeidasLocales] = useState([]);
  const [mostrarMenuNotificaciones, setMostrarMenuNotificaciones] = useState(false);
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [fechasPreventivo, setFechasPreventivo] = useState([]);

  const [datosGraficaEstatus, setDatosGraficaEstatus] = useState([]);
  const [datosGraficaLabs, setDatosGraficaLabs] = useState([]);
  const [cargando, setCargando] = useState(true);

  const COLORES_ESTATUS = ['#27ae60', '#f39c12', '#3498db'];

  useEffect(() => {
    obtenerDatosDashboard();
    obtenerFechasCalendario();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leidasLocales]);

  async function obtenerFechasCalendario() {
    try {
      const res = await fetch(`${API_URL}/preventivo/calendario`);
      if (res.ok) setFechasPreventivo(await res.json());
    } catch (_) {}
  }

  async function obtenerDatosDashboard() {
    try {
      setCargando(true);

      const [dataEquipos, dataMant, dataUso, dataNotificaciones] = await Promise.all([
        dashboardAPI.obtenerEquipos(),
        dashboardAPI.obtenerCostosMantenimientos(),
        dashboardAPI.obtenerPrestamosActivos(),
        dashboardAPI.obtenerNotificaciones()
      ]);

      const totalEquipos = dataEquipos.length;
      const mantenimientoActivo = dataEquipos.filter(e => e.estatus === 'En Mantenimiento').length;
      const prestados = dataUso.length;

      const opexReposiciones = dataEquipos.reduce((sum, item) => sum + (Number(item.costo) || 0), 0);
      const opexMantenimientos = dataMant.reduce((sum, item) => sum + (Number(item.costo) || 0), 0);
      const opexTotal = opexReposiciones + opexMantenimientos;

      const alertasDinamicas = dataEquipos
        .filter(e => e.mantenimiento_urgente || (e.horas_acumuladas || 0) >= (e.limite_horas || 8))
        .map(e => ({
          id: `din-${e.clave_activo}`,
          clave_activo: e.clave_activo,
          mensaje: e.mantenimiento_urgente
            ? 'Requiere mantenimiento urgente.'
            : `Límite operativo de ${e.limite_horas} horas alcanzado.`,
          tipo: e.mantenimiento_urgente ? 'Critico' : 'Advertencia',
          fecha: new Date().toISOString(),
          author1: { nombre: 'Sistema' },
          leida: leidasLocales.includes(`din-${e.clave_activo}`)
        }));

      setMetricas({ totalEquipos, mantenimientoActivo, prestados, opexMantenimientos, opexReposiciones, opexTotal });
      setActividadReciente(dataEquipos.slice(0, 5));
      setPrestamosActivos(dataUso);

      const todasNotificaciones = [...alertasDinamicas, ...dataNotificaciones];
      todasNotificaciones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      setNotificaciones(todasNotificaciones);

      setDatosGraficaEstatus([
        { name: 'Disponibles', value: (totalEquipos - mantenimientoActivo) - prestados },
        { name: 'En Mantenimiento', value: mantenimientoActivo },
        { name: 'En Uso (Prestados)', value: prestados }
      ]);

      const conteoLabs = {};
      dataEquipos.forEach(equipo => {
        const nombreLab = equipo.laboratorios?.nombre || 'Sin asignar';
        conteoLabs[nombreLab] = (conteoLabs[nombreLab] || 0) + 1;
      });
      setDatosGraficaLabs(Object.keys(conteoLabs).map(llave => ({ nombre: llave, Cantidad: conteoLabs[llave] })));

    } catch (error) {
      console.error('Error en la carga de métricas operativas:', error.message);
    } finally {
      setCargando(false);
    }
  }

  const procesarClicNotificacion = async (notif) => {
    if (!notif.leida) {
      setNotificaciones(prev => prev.map(n => n.id === notif.id ? { ...n, leida: true } : n));
      if (String(notif.id).startsWith('din-')) {
        setLeidasLocales(prev => [...prev, notif.id]);
      } else {
        try { await dashboardAPI.marcarNotificacionLeida(notif.id); } catch (_) {}
      }
    }
    setMostrarMenuNotificaciones(false);
    navigate('/mantenimiento', { state: { autoCompletarClave: notif.clave_activo } });
  };

  const marcarTodasComoLeidas = async () => {
    try {
      const idsDinamicas = notificaciones
        .filter(n => !n.leida && String(n.id).startsWith('din-'))
        .map(n => n.id);
      if (idsDinamicas.length > 0) setLeidasLocales(prev => [...prev, ...idsDinamicas]);
      await dashboardAPI.marcarTodasLeidas();
      obtenerDatosDashboard();
    } catch (_) {}
  };

  const formatoMoneda = (cantidad) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(cantidad);

  const formatearFecha = (fechaIso) =>
    new Date(fechaIso).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  const notificacionesPendientes = notificaciones.filter(n => !n.leida).length;

  return (
    <div className="dashboard-container">
      <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Inicio</h1>
          <p>Análisis de gastos de operación y estatus de la red</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

          {/* ── Calendar icon ─────────────────────── */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setMostrarCalendario(!mostrarCalendario); setMostrarMenuNotificaciones(false); }}
              title="Calendario preventivo"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px', position: 'relative' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2c3e50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {/* Dot if there are upcoming dates this month */}
              {fechasPreventivo.length > 0 && (
                <span style={{
                  position: 'absolute', top: '2px', right: '2px',
                  width: '7px', height: '7px', borderRadius: '50%',
                  backgroundColor: '#e67e22',
                }} />
              )}
            </button>

            {mostrarCalendario && (
              <CalendarioPanel
                fechas={fechasPreventivo}
                onClose={() => setMostrarCalendario(false)}
              />
            )}
          </div>

          {/* ── Notifications icon ────────────────── */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setMostrarMenuNotificaciones(!mostrarMenuNotificaciones); setMostrarCalendario(false); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', padding: '5px' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2c3e50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {notificacionesPendientes > 0 && (
                <span style={{
                  position: 'absolute', top: '0px', right: '0px', backgroundColor: '#e74c3c', color: 'white',
                  borderRadius: '50%', minWidth: '16px', height: '16px', fontSize: '10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                }}>
                  {notificacionesPendientes}
                </span>
              )}
            </button>

            {mostrarMenuNotificaciones && (
              <div style={{
                position: 'absolute', right: 0, top: '40px', width: '380px', backgroundColor: '#ffffff',
                border: '1px solid #e0e0e0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 1000, overflow: 'hidden'
              }}>
                <div style={{ padding: '12px 15px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '14px', color: '#2c3e50' }}>Centro de Notificaciones</strong>
                  {notificacionesPendientes > 0 && (
                    <button onClick={marcarTodasComoLeidas} style={{ background: 'none', border: 'none', color: '#3498db', fontSize: '12px', cursor: 'pointer', padding: 0 }}>
                      Marcar todo leído
                    </button>
                  )}
                </div>
                <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  {notificaciones.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#7f8c8d', fontSize: '13px' }}>Bandeja vacía</div>
                  ) : (
                    notificaciones.map((notif, index) => (
                      <div
                        key={notif.id || index}
                        onClick={() => procesarClicNotificacion(notif)}
                        style={{
                          padding: '12px 15px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer',
                          backgroundColor: notif.leida ? '#ffffff' : '#f4f6f7',
                          transition: 'background-color 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <strong style={{ fontSize: '13px', color: notif.tipo === 'Critico' ? '#e74c3c' : '#2c3e50', fontWeight: notif.leida ? 'normal' : 'bold' }}>
                            {notif.clave_activo}
                          </strong>
                          <span style={{ fontSize: '10px', backgroundColor: notif.tipo === 'Critico' ? '#fadbd8' : '#fcf3cf', color: notif.tipo === 'Critico' ? '#c0392b' : '#d35400', padding: '2px 6px', borderRadius: '4px' }}>
                            {notif.tipo}
                          </span>
                        </div>
                        <span style={{ fontSize: '13px', color: '#34495e' }}>{notif.mensaje}</span>
                        <span style={{ fontSize: '11px', color: '#95a5a6', marginTop: '4px', display: 'block' }}>
                          {notif.author1?.nombre || 'Sistema'} • {formatearFecha(notif.fecha)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* KPI Cards */}
      <section className="kpi-grid">
        <div className="kpi-card">
          <h3>Volumen de Activos</h3>
          <p className="kpi-number">{cargando ? '...' : metricas.totalEquipos}</p>
          <span className="kpi-status ok">Operación General</span>
        </div>
        <div className="kpi-card">
          <h3>Asignaciones Temporales</h3>
          <p className="kpi-number" style={{ color: '#3498db' }}>{cargando ? '...' : metricas.prestados}</p>
          <span className="kpi-status info">Préstamos en curso</span>
        </div>
        <div className="kpi-card">
          <h3>Soporte Técnico</h3>
          <p className="kpi-number warning-text">{cargando ? '...' : metricas.mantenimientoActivo}</p>
          <span className="kpi-status warning">Equipos en revisión</span>
        </div>
        <div className="kpi-card" style={{ borderTop: '4px solid #27ae60', minWidth: '280px' }}>
          <h3>OpEx Acumulado</h3>
          <p className="kpi-number" style={{ color: '#27ae60', fontSize: '28px' }}>
            {cargando ? '...' : formatoMoneda(metricas.opexTotal)}
          </p>
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#7f8c8d' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Reposiciones/Equipos:</span>
              <strong>{formatoMoneda(metricas.opexReposiciones)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
              <span>Servicios/Mantenimientos:</span>
              <strong>{formatoMoneda(metricas.opexMantenimientos)}</strong>
            </div>
          </div>
        </div>
      </section>

      {/* Charts */}
      <section className="charts-grid">
        <div className="chart-card">
          <h2>Distribución Operativa</h2>
          <div className="chart-wrapper">
            {cargando ? <p>Procesando métricas...</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={datosGraficaEstatus} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                    {datosGraficaEstatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORES_ESTATUS[index % COLORES_ESTATUS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="chart-card">
          <h2>Concentración por Sector</h2>
          <div className="chart-wrapper">
            {cargando ? <p>Procesando métricas...</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datosGraficaLabs} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip cursor={{ fill: '#f4f7f6' }} />
                  <Bar dataKey="Cantidad" fill="#2c3e50" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      {/* Bottom tables */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '30px' }}>
        <section className="recent-activity">
          <h2>Registro de Asignaciones Temporales</h2>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Identificador de Activo</th>
                  <th>Sector de Origen</th>
                  <th>Responsable Actual</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px' }}>Sincronizando información...</td></tr>
                ) : prestamosActivos.length === 0 ? (
                  <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px' }}>Operación estable. Sin asignaciones pendientes.</td></tr>
                ) : (
                  prestamosActivos.map((uso) => (
                    <tr key={uso.id_uso}>
                      <td><strong>{uso.clave_activo}</strong><br /><small>{uso.equipos?.marca}</small></td>
                      <td>{uso.equipos?.laboratorios?.nombre || 'N/D'}</td>
                      <td>{uso.usuario_nombre}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="recent-activity">
          <h2>Auditoría de Registros Recientes</h2>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Identificador de Activo</th>
                  <th>Sector Asignado</th>
                  <th>Estado del Sistema</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px' }}>Sincronizando información...</td></tr>
                ) : actividadReciente.length === 0 ? (
                  <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px' }}>Sin registros documentados.</td></tr>
                ) : (
                  actividadReciente.map((item) => (
                    <tr key={item.clave_activo}>
                      <td><strong>{item.clave_activo}</strong><br /><small>{item.marca}</small></td>
                      <td>{item.laboratorios?.nombre || 'Sin asignación formal'}</td>
                      <td><span className={`badge ${item.estatus === 'Activo' ? 'ok' : 'warning'}`}>{item.estatus}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Dashboard;