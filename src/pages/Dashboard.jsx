import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
// Importamos los componentes mágicos de Recharts
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function Dashboard() {
  const [metricas, setMetricas] = useState({ total: 0, mantenimiento: 0, activos: 0 });
  const [actividadReciente, setActividadReciente] = useState([]);
  
  // Nuevos estados para la data de las gráficas
  const [datosGraficaEstatus, setDatosGraficaEstatus] = useState([]);
  const [datosGraficaLabs, setDatosGraficaLabs] = useState([]);
  
  const [cargando, setCargando] = useState(true);

  // Colores para nuestra gráfica de dona
  const COLORES_ESTATUS = ['#27ae60', '#f39c12']; 

  useEffect(() => {
    obtenerDatosDashboard();
  }, []);

  async function obtenerDatosDashboard() {
    try {
      setCargando(true);
      
      const { data, error } = await supabase
        .from('equipos')
        .select('clave_activo, marca, modelo, estatus, fecha_registro, laboratorios(nombre)')
        .order('fecha_registro', { ascending: false });

      if (error) throw error;

      if (data) {
        const total = data.length;
        const mantenimiento = data.filter(e => e.estatus === 'En Mantenimiento').length;
        const activos = data.filter(e => e.estatus === 'Activo').length;

        setMetricas({ total, mantenimiento, activos });
        setActividadReciente(data.slice(0, 5));

        // 1. Preparamos datos para la Gráfica de Dona (Estatus)
        setDatosGraficaEstatus([
          { name: 'Operativos', value: activos },
          { name: 'En Mantenimiento', value: mantenimiento }
        ]);

        // 2. Preparamos datos para la Gráfica de Barras (Equipos por Laboratorio)
        // Agrupamos y contamos los equipos por cada laboratorio
        const conteoLabs = {};
        data.forEach(equipo => {
          const nombreLab = equipo.laboratorios?.nombre || 'Sin asignar';
          conteoLabs[nombreLab] = (conteoLabs[nombreLab] || 0) + 1;
        });

        // Convertimos ese conteo en el formato que Recharts necesita
        const datosBarras = Object.keys(conteoLabs).map(llave => ({
          nombre: llave,
          Cantidad: conteoLabs[llave]
        }));
        
        setDatosGraficaLabs(datosBarras);
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

      {/* Tarjetas de Métricas (KPIs) */}
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

      {/* NUEVA SECCIÓN: Gráficas de Datos */}
      <section className="charts-grid">
        {/* Gráfica 1: Dona de Estatus */}
        <div className="chart-card">
          <h2>Distribución por Estatus</h2>
          <div className="chart-wrapper">
            {cargando ? <p>Cargando gráfica...</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={datosGraficaEstatus}
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {datosGraficaEstatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORES_ESTATUS[index % COLORES_ESTATUS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Gráfica 2: Barras por Laboratorio */}
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
                  <Bar dataKey="Cantidad" fill="#3498db" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      {/* Sección de tabla con los últimos equipos */}
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