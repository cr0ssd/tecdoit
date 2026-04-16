import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function Dashboard() {
  const navigate = useNavigate();
  
  const [metricas, setMetricas] = useState({ 
    totalEquipos: 0, 
    mantenimientoActivo: 0, 
    prestados: 0, 
    opexMantenimientos: 0, 
    opexReposiciones: 0, 
    opexTotal: 0 
  });
  
  const [actividadReciente, setActividadReciente] = useState([]);
  const [prestamosActivos, setPrestamosActivos] = useState([]);
  
  const [notificaciones, setNotificaciones] = useState([]); 
  const [leidasLocales, setLeidasLocales] = useState([]); 
  const [mostrarMenuNotificaciones, setMostrarMenuNotificaciones] = useState(false);

  const [datosGraficaEstatus, setDatosGraficaEstatus] = useState([]);
  const [datosGraficaLabs, setDatosGraficaLabs] = useState([]);
  const [cargando, setCargando] = useState(true);

  const COLORES_ESTATUS = ['#27ae60', '#f39c12', '#3498db']; 

  useEffect(() => {
    obtenerDatosDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leidasLocales]);

  async function obtenerDatosDashboard() {
    try {
      setCargando(true);
      
      const { data: dataEquipos, error: errEq } = await supabase
        .from('equipos')
        .select('clave_activo, marca, modelo, estatus, costo, fecha_registro, horas_acumuladas, limite_horas, mantenimiento_urgente, laboratorios(nombre)')
        .order('fecha_registro', { ascending: false });
      if (errEq) throw errEq;

      const { data: dataMant } = await supabase.from('mantenimientos').select('costo');
      
      const { data: dataUso } = await supabase
        .from('registro_uso')
        .select('*, equipos(marca, modelo, laboratorios(nombre))')
        .eq('estatus', 'En uso');

      const { data: dataNotificaciones } = await supabase
        .from('post1')
        .select('*, author1(nombre)')
        .order('fecha', { ascending: false })
        .limit(20);

      if (dataEquipos) {
        const totalEquipos = dataEquipos.length;
        const mantenimientoActivo = dataEquipos.filter(e => e.estatus === 'En Mantenimiento').length;
        const prestados = dataUso ? dataUso.length : 0;

        // Cálculo de OpEx: Sumatoria de costos de todos los equipos (Reposiciones) y Mantenimientos
        const opexReposiciones = dataEquipos.reduce((sum, item) => sum + (Number(item.costo) || 0), 0);
        const opexMantenimientos = dataMant ? dataMant.reduce((sum, item) => sum + (Number(item.costo) || 0), 0) : 0;
        const opexTotal = opexReposiciones + opexMantenimientos;

        const alertasDinamicas = dataEquipos
          .filter(e => e.mantenimiento_urgente || (e.horas_acumuladas || 0) >= (e.limite_horas || 8))
          .map(e => ({
            id: `din-${e.clave_activo}`,
            clave_activo: e.clave_activo,
            mensaje: e.mantenimiento_urgente ? 'Requiere mantenimiento urgente.' : `Límite operativo de ${e.limite_horas} horas alcanzado.`,
            tipo: e.mantenimiento_urgente ? 'Critico' : 'Advertencia',
            fecha: new Date().toISOString(),
            author1: { nombre: 'Sistema' },
            leida: leidasLocales.includes(`din-${e.clave_activo}`)
          }));

        setMetricas({ totalEquipos, mantenimientoActivo, prestados, opexMantenimientos, opexReposiciones, opexTotal });
        setActividadReciente(dataEquipos.slice(0, 5));
        setPrestamosActivos(dataUso || []);
        
        const todasNotificaciones = [...alertasDinamicas, ...(dataNotificaciones || [])];
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
        const datosBarras = Object.keys(conteoLabs).map(llave => ({ nombre: llave, Cantidad: conteoLabs[llave] }));
        setDatosGraficaLabs(datosBarras);
      }
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
        try {
          await supabase.from('post1').update({ leida: true }).eq('id', notif.id);
        } catch (error) {
          console.error('Error al actualizar estado de lectura:', error.message);
        }
      }
    }
    setMostrarMenuNotificaciones(false);
    navigate('/mantenimiento', { state: { autoCompletarClave: notif.clave_activo } });
  };

  const marcarTodasComoLeidas = async () => {
    try {
      const idsDinamicas = notificaciones.filter(n => !n.leida && String(n.id).startsWith('din-')).map(n => n.id);
      if (idsDinamicas.length > 0) setLeidasLocales(prev => [...prev, ...idsDinamicas]);
      const { error } = await supabase.from('post1').update({ leida: true }).eq('leida', false);
      if (error) throw error;
      obtenerDatosDashboard();
    } catch (error) {
      alert('Error en actualización masiva:', error.message);
    }
  };

  const formatoMoneda = (cantidad) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(cantidad);
  const formatearFecha = (fechaIso) => new Date(fechaIso).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' });

  const notificacionesPendientes = notificaciones.filter(n => !n.leida).length;

  return (
    <div className="dashboard-container">
      <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Inicio</h1>
          <p>Análisis de gastos de operación y estatus de la red</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setMostrarMenuNotificaciones(!mostrarMenuNotificaciones)} 
              style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', padding: '5px' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2c3e50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
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
                          padding: '12px 15px', 
                          borderBottom: '1px solid #f0f0f0', 
                          cursor: 'pointer', 
                          backgroundColor: notif.leida ? '#ffffff' : '#f4f6f7',
                          transition: 'background-color 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <strong style={{ fontSize: '13px', color: notif.tipo === 'Critico' ? '#e74c3c' : '#2c3e50', fontWeight: notif.leida ? 'normal' : 'bold' }}>{notif.clave_activo}</strong>
                          <span style={{ fontSize: '10px', backgroundColor: notif.tipo === 'Critico' ? '#fadbd8' : '#fcf3cf', color: notif.tipo === 'Critico' ? '#c0392b' : '#d35400', padding: '2px 6px', borderRadius: '4px' }}>{notif.tipo}</span>
                        </div>
                        <span style={{ fontSize: '13px', color: '#34495e' }}>{notif.mensaje}</span>
                        <span style={{ fontSize: '11px', color: '#95a5a6', marginTop: '4px' }}>
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

      <section className="charts-grid">
        <div className="chart-card">
          <h2>Distribución Operativa</h2>
          <div className="chart-wrapper">
            {cargando ? <p>Procesando métricas...</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={datosGraficaEstatus} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                    {datosGraficaEstatus.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORES_ESTATUS[index % COLORES_ESTATUS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
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
                  <XAxis dataKey="nombre" tick={{fontSize: 12}} />
                  <YAxis allowDecimals={false} />
                  <Tooltip cursor={{fill: '#f4f7f6'}} />
                  <Bar dataKey="Cantidad" fill="#2c3e50" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      {/* Aquí están de vuelta tus tablas inferiores */}
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
                      <td><strong>{uso.clave_activo}</strong><br/><small>{uso.equipos?.marca}</small></td>
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
                      <td><strong>{item.clave_activo}</strong><br/><small>{item.marca}</small></td>
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