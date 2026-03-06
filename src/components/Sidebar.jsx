import { Link } from 'react-router-dom';

function Sidebar() {
  return (
    <aside className="sidebar">
      <h2>tecdoit</h2>
      <nav>
        <ul>
          <li><Link to="/dashboard">Dashboard</Link></li>
          <li><Link to="/inventario">Inventario</Link></li>
          <li><Link to="/uso-equipos">Uso de Equipos</Link></li>
          <li><Link to="/mantenimiento">Mantenimiento</Link></li>
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;