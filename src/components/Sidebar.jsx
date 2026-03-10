import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';

function Sidebar() {
  const cerrarSesion = async () => {
    await supabase.auth.signOut();
  };

  return (
    <aside className="sidebar">
      <h2>tecdoit</h2>
      {/* Usamos flex: 1 en el nav para empujar el botón de salir hasta abajo */}
      <nav style={{ flex: 1 }}>
        <ul>
          <li><Link to="/dashboard">Dashboard</Link></li>
          <li><Link to="/inventario">Inventario</Link></li>
          <li><Link to="/uso-equipos">Uso de Equipos</Link></li>
          <li><Link to="/mantenimiento">Mantenimiento</Link></li>
        </ul>
      </nav>
      
      <button 
        onClick={cerrarSesion} 
        style={{ 
          backgroundColor: 'transparent', 
          color: '#e74c3c', 
          border: '1px solid #e74c3c', 
          padding: '10px', 
          borderRadius: '6px', 
          cursor: 'pointer',
          fontWeight: 'bold',
          transition: 'all 0.3s ease'
        }}
        onMouseOver={(e) => { e.target.style.backgroundColor = '#e74c3c'; e.target.style.color = 'white'; }}
        onMouseOut={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = '#e74c3c'; }}
      >
        Cerrar Sesión
      </button>
    </aside>
  );
}

export default Sidebar;