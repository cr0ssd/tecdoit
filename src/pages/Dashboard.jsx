import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

function Dashboard() {
  // Estados para guardar nuestras métricas reales
  const [metricas, setMetricas] = useState({
    total: 0,
    mantenimiento: 0,
    activos: 0
  });
  const [actividadReciente, setActividadReciente] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Hook para cargar los datos en cuanto se abre el Dashboard
  useEffect(() => {
    obtenerDatosDashboard();
  }, []);

  async function obtenerDatosDashboard() {
    try {
      setCargando(true);
      
      // Traemos todos los equipos ordenados por fecha (los más nuevos primero)
      const { data, error } = await supabase
        .from('equipos')
        .select('clave_activo, marca, modelo, estatus, fecha_registro, laboratorios(nombre)')
        .order('fecha_registro', { ascending: false });

      if (error) throw error;

      if (data) {
        // Calculamos las métricas leyendo los datos
        const total = data.length;
        const mantenimiento = data.filter(equipo => equipo.estatus === 'En Mantenimiento').length;
        const activos = data.filter(equipo => equipo.estatus === 'Activo').length;

        setMetricas({ total, mantenimiento, activos });
        
        // Tomamos solo los primeros 5 para la tabla de actividad reciente
        setActividadReciente(data.slice(0, 5));
      }
    } catch (error) {
      console.error('Error al cargar el dashboard:', error.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Panel de Control</h1>
        <p>Resumen general de la Red de Laboratorios</p>
      </header>

      {/* Tarjetas de Métricas (KPIs) Reales */}
      <section className="kpi-grid">
        <div className="kpi-card">
          <h3>Total Equipos</h3>
          <p className="kpi-number">{cargando ? '...' : metricas.total}</p>
          <span className="kpi-status ok">Registrados en el sistema</span>
        </div>
        
        <div className="kpi-card">
          <h3>En Mantenimiento</h3>
          <p className="kpi-number warning-text">{cargando ? '...' : metricas.mantenimiento}</p>
          <span className="kpi-status warning">Preventivo o Correctivo</span>
        </div>

        <div className="kpi-card">
          <h3>Equipos Operativos</h3>
          <p className="kpi-number" style={{ color: '#27ae60' }}>{cargando ? '...' : metricas.activos}</p>
          <span className="kpi-status ok">Listos para uso</span>
        </div>

        <div className="kpi-card">
          <h3>Horas de Uso (Mes)</h3>
          <p className="kpi-number">0</p>
          <span className="kpi-status info">Módulo QR pendiente</span>
        </div>
      </section>

      {/* Sección de tabla con los últimos equipos registrados */}
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
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center', padding: '20px' }}>Calculando métricas...</td>
                </tr>
              ) : actividadReciente.length === 0 ? (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center', padding: '20px' }}>Aún no hay actividad reciente.</td>
                </tr>
              ) : (
                actividadReciente.map((item) => (
                  <tr key={item.clave_activo}>
                    <td>
                      <strong>{item.clave_activo}</strong><br/>
                      <small>{item.marca} {item.modelo}</small>
                    </td>
                    <td>{item.laboratorios?.nombre || 'Sin asignar'}</td>
                    <td>
                      <span className={`badge ${item.estatus === 'Activo' ? 'ok' : 'warning'}`}>
                        {item.estatus}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;