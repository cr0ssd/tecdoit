import React from 'react';

function Inventario() {
  return (
    <div className="dashboard-container">
      <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Gestión de Inventarios</h1>
          <p>Catálogo centralizado de equipos por laboratorio</p>
        </div>
        <button className="btn-primary">+ Agregar Equipo</button>
      </header>

      <section className="filters-section" style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
        <input type="text" placeholder="Buscar por clave o nombre..." className="input-search" />
        <select className="select-filter">
          <option>Todos los Laboratorios</option>
          <option>Electrónica A</option>
          <option>Procesos de Manufactura</option>
        </select>
      </section>

      <section className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Clave Activo</th>
              <th>Equipo / Marca</th>
              <th>Laboratorio</th>
              <th>Estatus</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>TEC-ELEC-001</strong></td>
              <td>Osciloscopio <br/><small>Tektronix TBS1052B</small></td>
              <td>Electrónica A</td>
              <td><span className="badge ok">Activo</span></td>
              <td>
                <button className="btn-icon">Editar</button>
              </td>
            </tr>
            <tr>
              <td><strong>TEC-MAN-042</strong></td>
              <td>Torno CNC <br/><small>Haas ST-10</small></td>
              <td>Procesos de Manufactura</td>
              <td><span className="badge warning">Mantenimiento</span></td>
              <td>
                <button className="btn-icon">Editar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default Inventario;