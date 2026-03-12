import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function Dashboard() {
  const [metricas, setMetricas] = useState({ 
    total: 0, 
    mantenimiento: 0, 
    activos: 0, 
    prestados: 0, 
    capexTotal: 0,
    presupuestoAsignado: 0 // Nuevo KPI
  });
  
  const [actividadReciente, setActividadReciente] = useState([]);
  const [prestamosActivos, setPrestamosActivos] = useState([]);
  
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
      
      // 1. Obtener Presupuesto Global
      const { data: dataPresupuesto, error: errPres } = await supabase
        .from('presupuesto_global')
        .select('monto')
        .eq('id', 1)
        .single();
      if (errPres && errPres.code !== 'PGRST116') throw errPres;

      // 2. Obtener Equipos (para totales y CAPEX)
      const { data: dataEquipos, error: errEq } = await supabase
        .from('equipos')
        .select('clave_activo, marca, modelo, estatus, costo, fecha_registro, laboratorios(nombre)')
        .order('fecha_registro', { ascending: false });
      if (errEq) throw errEq;

      // 3. Obtener Costos de Mantenimiento (para CAPEX)
      const { data: dataMant, error: errMant } = await supabase.from('mantenimientos').select('costo');
      if (errMant) throw errMant;

      // 4. Obtener Equipos en Uso (para Préstamos Activos)
      const { data: dataUso, error: errUso } = await supabase
        .from('registro_uso')
        .select('*, equipos(marca, modelo, laboratorios(nombre))')
        .eq('estatus', 'En uso');
      if (errUso) throw errUso;

      if (dataEquipos) {
        const total = dataEquipos.length;
        const mantenimiento = dataEquipos.filter(e => e.estatus === 'En Mantenimiento').length;
        const activos = dataEquipos.filter(e => e.estatus === 'Activo').length;
        const prestados = dataUso.length;

        const capexEquipos = dataEquipos.reduce((sum, item) => sum + (Number(item.costo) || 0), 0);
        const capexMantenimientos = dataMant ? dataMant.reduce((sum, item) => sum + (Number(item.costo) || 0), 0) : 0;
        const capexTotal = capexEquipos + capexMantenimientos;
        const presupuestoAsignado = dataPresupuesto ? Number(dataPresupuesto.monto) : 0;

        setMetricas({ total, mantenimiento, activos, prestados, capexTotal, presupuestoAsignado });
        setActividadReciente(dataEquipos.slice(0, 5));
        setPrestamosActivos(dataUso);

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

  // NUEVO: Función para que el director ajuste el presupuesto
  const ajustarPresupuesto = async () => {
    // Usamos un prompt nativo para hacerlo rápido y seguro
    const nuevoMonto = window.prompt(
      'Ajuste de Presupuesto Global\nIngresa el nuevo techo financiero para los laboratorios (sin comas):', 
      metricas.presupuestoAsignado
    );
    
    // Si cancela o lo deja vacío, no hacemos nada
    if (nuevoMonto === null || nuevoMonto.trim() === '') return;

    const montoNumerico = parseFloat(nuevoMonto);
    
    if (isNaN(montoNumerico) || montoNumerico < 0) {
      alert('Por favor, ingresa una cantidad numérica válida.');
      return;
    }

    try {
      // Actualizamos el registro con ID 1 en nuestra nueva tabla
      const { error } = await supabase
        .from('presupuesto_global')
        .update({ monto: montoNumerico })
        .eq('id', 1);

      if (error) throw error;
      
      alert('¡Presupuesto actualizado exitosamente!');
      obtenerDatosDashboard(); // Recargamos para ver los números reflejados
    } catch (error) {
      alert('Error al actualizar el presupuesto: ' + error.message);
    }
  };

  const formatoMoneda = (cantidad) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(cantidad);

  // Cálculos financieros rápidos para la UI
  const dineroDisponible = metricas.presupuestoAsignado - metricas.capexTotal;
  const porcentajeGastado = metricas.presupuestoAsignado > 0 ? ((metricas.capexTotal / metricas.presupuestoAsignado) * 100).toFixed(1) : 0;

  return (
    <div className="dashboard-container">
      <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Panel de Control</h1>
          <p>Resumen general de la Red de Laboratorios</p>
        </div>
        {/* Botón exclusivo para ajustar presupuesto */}
        <button className="btn-secondary" onClick={ajustarPresupuesto} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          Ajustar Presupuesto
        </button>
      </header>

      {/* Tarjetas de Métricas (KPIs) */}
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

        {/* TARJETA FINANCIERA REDISEÑADA */}
        <div className="kpi-card" style={{ borderTop: '4px solid #8e44ad' }}>
          <h3>Presupuesto Disponible</h3>
          <p className="kpi-number" style={{ color: dineroDisponible < 0 ? '#e74c3c' : '#8e44ad', fontSize: '28px' }}>
            {cargando ? '...' : formatoMoneda(dineroDisponible)}
          </p>
          
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#7f8c8d', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Asignado:</span>
              <strong>{formatoMoneda(metricas.presupuestoAsignado)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>CAPEX (Gastado):</span>
              <strong style={{ color: '#e74c3c' }}>{formatoMoneda(metricas.capexTotal)}</strong>
            </div>
            {/* Pequeña barra de progreso visual */}
            <div style={{ width: '100%', height: '6px', backgroundColor: '#ecf0f1', borderRadius: '3px', marginTop: '5px', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                backgroundColor: porcentajeGastado > 90 ? '#e74c3c' : '#8e44ad', 
                width: `${Math.min(porcentajeGastado, 100)}%` 
              }}></div>
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