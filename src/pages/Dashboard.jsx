import React from 'react';

function Dashboard() {
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
          <p className="kpi-number">1,245</p>
          <span className="kpi-status ok">Operativos</span>
        </div>
        
        <div className="kpi-card">
          <h3>En Mantenimiento</h3>
          <p className="kpi-number warning-text">18</p>
          <span className="kpi-status warning">Preventivo en curso</span>
        </div>

        <div className="kpi-card">
          <h3>Fallas Reportadas</h3>
          <p className="kpi-number danger-text">3</p>
          <span className="kpi-status danger">Requieren atención</span>
        </div>

        <div className="kpi-card">
          <h3>Horas de Uso (Mes)</h3>
          <p className="kpi-number">850</p>
          <span className="kpi-status info">Métrica por códigos QR</span>
        </div>
      </section>

      {/* Sección de tabla rápida simulada */}
      <section className="recent-activity">
        <h2>Últimos Reportes de Falla</h2>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Equipo</th>
                <th>Laboratorio</th>
                <th>Fecha</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Osciloscopio Tektronix</td>
                <td>Electrónica A</td>
                <td>05 Mar 2026</td>
                <td><span className="badge danger">Abierto</span></td>
              </tr>
              <tr>
                <td>Torno CNC</td>
                <td>Procesos de Manufactura</td>
                <td>04 Mar 2026</td>
                <td><span className="badge warning">En revisión</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;