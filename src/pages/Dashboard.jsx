import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function Dashboard() {
  const [metricas, setMetricas] = useState({ 
    total: 0, mantenimiento: 0, activos: 0, prestados: 0, capexTotal: 0, capexEquipos: 0, capexMantenimientos: 0, presupuestoAsignado: 0 
  });
  
  const [actividadReciente, setActividadReciente] = useState([]);
  const [prestamosActivos, setPrestamosActivos] = useState([]);
  const [notificaciones, setNotificaciones] = useState([]); // NUEVO: Estado para alertas
  
  const [datosGraficaEstatus, setDatosGraficaEstatus] = useState([]);
  const [datosGraficaLabs, setDatosGraficaLabs] = useState([]);
  const [cargando, setCargando] = useState(true);

  const COLORES_ESTATUS = ['#27ae60', '#f39c12', '#3498db']; 

  useEffect(() => {
    obtenerDatosDashboard();
  }, []);

  async function obtenerDatosDashboard() {
    try {
      setCargando(true);
      
      const { data: dataPresupuesto } = await supabase.from('presupuesto_global').select('monto').eq('id', 1).single();
      
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

      // NUEVO: Consultamos el historial de notificaciones desde la tabla post1
      const { data: dataNotificaciones } = await supabase
        .from('post1')
        .select('*, author1(nombre)')
        .eq('leida', false)
        .order('fecha', { ascending: false });

      if (dataEquipos) {
        const total = dataEquipos.length;
        const mantenimiento = dataEquipos.filter(e => e.estatus === 'En Mantenimiento').length;
        const activos = dataEquipos.filter(e => e.estatus === 'Activo').length;
        const prestados = dataUso ? dataUso.length : 0;

        const capexEquipos = dataEquipos.reduce((sum, item) => sum + (Number(item.costo) || 0), 0);
        const capexMantenimientos = dataMant ? dataMant.reduce((sum, item) => sum + (Number(item.costo) || 0), 0) : 0;
        const capexTotal = capexEquipos + capexMantenimientos;
        const presupuestoAsignado = dataPresupuesto ? Number(dataPresupuesto.monto) : 0;

        // NUEVO: Generamos alertas dinámicas basadas en las horas y estatus urgente
        const alertasDinamicas = dataEquipos
          .filter(e => e.mantenimiento_urgente || (e.horas_acumuladas || 0) >= (e.limite_horas || 8))
          .map(e => ({
            id: `din-${e.clave_activo}`,
            clave_activo: e.clave_activo,
            mensaje: e.mantenimiento_urgente ? 'Requiere mantenimiento URGENTE' : `Superó el límite de ${e.limite_horas} horas de uso.`,
            tipo: e.mantenimiento_urgente ? 'URGENTE' : 'HORAS',
            fecha: new Date().toISOString(),
            author1: { nombre: 'Sistema Automático' }
          }));

        setMetricas({ total, mantenimiento, activos, prestados, capexTotal, capexEquipos, capexMantenimientos, presupuestoAsignado });
        setActividadReciente(dataEquipos.slice(0, 5));
        setPrestamosActivos(dataUso || []);
        
        // Unimos las alertas dinámicas con los registros guardados
        setNotificaciones([...alertasDinamicas, ...(dataNotificaciones || [])]);

        setDatosGraficaEstatus([
          { name: 'Disponibles', value: activos - prestados },
          { name: 'En Mantenimiento', value: mantenimiento },
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
      console.error('Error al cargar el dashboard:', error.message);
    } finally {
      setCargando(false);
    }
  }

  const ajustarPresupuesto = async () => {
    const nuevoMonto = window.prompt(
      'Ajuste de Presupuesto Global\nIngresa el nuevo techo financiero para los laboratorios (sin comas ni símbolos):', 
      metricas.presupuestoAsignado
    );
    if (nuevoMonto === null || nuevoMonto.trim() === '') return;
    const montoNumerico = parseFloat(nuevoMonto);
    if (isNaN(montoNumerico) || montoNumerico < 0) return alert('Ingresa una cantidad numérica válida.');

    try {
      await supabase.from('presupuesto_global').update({ monto: montoNumerico }).eq('id', 1);
      obtenerDatosDashboard(); 
    } catch (error) {
      alert('Error al actualizar el presupuesto: ' + error.message);
    }
  };

  const formatoMoneda = (cantidad) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(cantidad);
  const formatearFecha = (fechaIso) => new Date(fechaIso).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' });

  const dineroDisponible = metricas.presupuestoAsignado - metricas.capexTotal;
  const porcentajeGastado = metricas.presupuestoAsignado > 0 ? ((metricas.capexTotal / metricas.presupuestoAsignado) * 100).toFixed(1) : 0;

  return (
    <div className="dashboard-container">
      <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Panel de Control</h1>
          <p>Resumen general de la Red de Laboratorios</p>
        </div>
        <button className="btn-secondary" onClick={ajustarPresupuesto} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          ✏️ Ajustar Presupuesto
        </button>
      </header>

      {/* NUEVA SECCIÓN: Centro de Notificaciones */}
      {notificaciones.length > 0 && (
        <section style={{ backgroundColor: '#fff3f3', borderLeft: '4px solid #e74c3c', padding: '15px', borderRadius: '4px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ color: '#c0392b', marginTop: 0, marginBottom: '10px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Alertas de Mantenimiento ({notificaciones.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {notificaciones.map((notif, index) => (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid #fadbd8' }}>
                <div>
                  <strong style={{ color: '#e74c3c' }}>{notif.clave_activo}</strong> - {notif.mensaje}
                  <div style={{ fontSize: '11px', color: '#7f8c8d', marginTop: '4px' }}>
                    Reportado por: {notif.author1?.nombre || 'Sistema'} | {formatearFecha(notif.fecha)}
                  </div>
                </div>
                <span className={`badge ${notif.tipo === 'URGENTE' ? 'warning' : 'info'}`} style={{ backgroundColor: notif.tipo === 'URGENTE' ? '#e74c3c' : '#f39c12', color: '#fff' }}>
                  {notif.tipo}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="kpi-grid">
        <div className="kpi-card">
          <h3>Total Equipos</h3>
          <p className="kpi-number">{cargando ? '...' : metricas.total}</p>
          <span className="kpi-status ok">Registrados en el sistema</span>
        </div>
        
        <div className="kpi-card">
          <h3>Equipos en Uso</h3>
          <p className="kpi-number" style={{ color: '#3498db' }}>{cargando ? '...' : metricas.prestados}</p>
          <span className="kpi-status info">Préstamos activos</span>
        </div>

        <div className="kpi-card">
          <h3>En Mantenimiento</h3>
          <p className="kpi-number warning-text">{cargando ? '...' : metricas.mantenimiento}</p>
          <span className="kpi-status warning">Preventivo o Correctivo</span>
        </div>

        <div className="kpi-card" style={{ borderTop: '4px solid #8e44ad', minWidth: '280px' }}>
          <h3>Presupuesto Disponible</h3>
          <p className="kpi-number" style={{ color: dineroDisponible < 0 ? '#e74c3c' : '#8e44ad', fontSize: '28px' }}>
            {cargando ? '...' : formatoMoneda(dineroDisponible)}
          </p>
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#7f8c8d', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '4px' }}>
              <span>Fondo Asignado:</span>
              <strong>{formatoMoneda(metricas.presupuestoAsignado)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Inversión (Equipos):</span>
              <strong style={{ color: '#e74c3c' }}>-{formatoMoneda(metricas.capexEquipos)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Gastos (Mantenimiento):</span>
              <strong style={{ color: '#e74c3c' }}>-{formatoMoneda(metricas.capexMantenimientos)}</strong>
            </div>
            <div style={{ width: '100%', height: '6px', backgroundColor: '#ecf0f1', borderRadius: '3px', marginTop: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', backgroundColor: porcentajeGastado > 90 ? '#e74c3c' : '#8e44ad', width: `${Math.min(porcentajeGastado, 100)}%` }}></div>
            </div>
          </div>
        </div>
      </section>

      <section className="charts-grid">
        <div className="chart-card">
          <h2>Distribución por Estatus</h2>
          <div className="chart-wrapper">
            {cargando ? <p>Cargando gráfica...</p> : (
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
          <h2>Equipos por Laboratorio</h2>
          <div className="chart-wrapper">
            {cargando ? <p>Cargando gráfica...</p> : (
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '30px' }}>
        <section className="recent-activity">
          <h2>Equipos en Uso (Prestados)</h2>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Clave / Equipo</th>
                  <th>Laboratorio Origen</th>
                  <th>Usuario Actual</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px' }}>Consultando usos...</td></tr>
                ) : prestamosActivos.length === 0 ? (
                  <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px' }}>No hay equipos prestados en este momento.</td></tr>
                ) : (
                  prestamosActivos.map((uso) => (
                    <tr key={uso.id_uso}>
                      <td><strong>{uso.clave_activo}</strong><br/><small>{uso.equipos?.marca}</small></td>
                      <td>{uso.equipos?.laboratorios?.nombre || 'N/A'}</td>
                      <td>{uso.usuario_nombre}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="recent-activity">
          <h2>Últimos Equipos Registrados</h2>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Clave / Equipo</th>
                  <th>Laboratorio</th>
                  <th>Estatus</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px' }}>Cargando actividad...</td></tr>
                ) : actividadReciente.length === 0 ? (
                  <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px' }}>Aún no hay actividad.</td></tr>
                ) : (
                  actividadReciente.map((item) => (
                    <tr key={item.clave_activo}>
                      <td><strong>{item.clave_activo}</strong><br/><small>{item.marca}</small></td>
                      <td>{item.laboratorios?.nombre || 'Sin asignar'}</td>
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