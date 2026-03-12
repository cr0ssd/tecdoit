import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function Dashboard() {
  const [metricas, setMetricas] = useState({ total: 0, mantenimiento: 0, activos: 0, prestados: 0, capexTotal: 0 });
  const [actividadReciente, setActividadReciente] = useState([]);
  const [prestamosActivos, setPrestamosActivos] = useState([]); // Nueva tabla
  
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
      
      // 1. Obtener Equipos (para totales y CAPEX)
      const { data: dataEquipos, error: errEq } = await supabase
        .from('equipos')
        .select('clave_activo, marca, modelo, estatus, costo, fecha_registro, laboratorios(nombre)')
        .order('fecha_registro', { ascending: false });
      if (errEq) throw errEq;

      // 2. Obtener Costos de Mantenimiento (para CAPEX)
      const { data: dataMant, error: errMant } = await supabase.from('mantenimientos').select('costo');
      if (errMant) throw errMant;

      // 3. Obtener Equipos en Uso (para Préstamos Activos)
      const { data: dataUso, error: errUso } = await supabase
        .from('registro_uso')
        .select('*, equipos(marca, modelo, laboratorios(nombre))')
        .eq('estatus', 'En uso');
      if (errUso) throw errUso;

      if (dataEquipos) {
        // Cálculos de KPI
        const total = dataEquipos.length;
        const mantenimiento = dataEquipos.filter(e => e.estatus === 'En Mantenimiento').length;
        const activos = dataEquipos.filter(e => e.estatus === 'Activo').length;
        const prestados = dataUso.length;

        // Cálculo de CAPEX (Suma de Equipos + Mantenimientos)
        const capexEquipos = dataEquipos.reduce((sum, item) => sum + (Number(item.costo) || 0), 0);
        const capexMantenimientos = dataMant ? dataMant.reduce((sum, item) => sum + (Number(item.costo) || 0), 0) : 0;
        const capexTotal = capexEquipos + capexMantenimientos;

        setMetricas({ total, mantenimiento, activos, prestados, capexTotal });
        setActividadReciente(dataEquipos.slice(0, 5));
        setPrestamosActivos(dataUso);

        // Gráfica de Dona (incluyendo prestados para saber dónde están los "Activos")
        setDatosGraficaEstatus([
          { name: 'Disponibles', value: activos - prestados },
          { name: 'En Mantenimiento', value: mantenimiento },
          { name: 'En Uso (Prestados)', value: prestados }
        ]);

        // Gráfica de Barras (Equipos por Lab)
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

  // Formateador de moneda
  const formatoMoneda = (cantidad) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(cantidad);

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Panel de Control</h1>
        <p>Resumen general de la Red de Laboratorios</p>
      </header>

      {/* Tarjetas de Métricas (KPIs) - Secciones Reorganizadas */}
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

        <div className="kpi-card">
          <h3>Inversión (CAPEX)</h3>
          <p className="kpi-number" style={{ color: '#8e44ad', fontSize: '28px' }}>
            {cargando ? '...' : formatoMoneda(metricas.capexTotal)}
          </p>
          <span className="kpi-status" style={{ backgroundColor: '#f5eef8', color: '#8e44ad' }}>Equipos + Mantenimiento</span>
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

      {/* Tablas de Información Rápida (Lado a Lado) */}
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