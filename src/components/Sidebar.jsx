import React, { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';

function Sidebar() {
  const location = useLocation();

  const isMantenimientoFamily =
    location.pathname.startsWith('/mantenimiento') ||
    location.pathname.startsWith('/preventivo') ||
    location.pathname.startsWith('/correctivo');

  const [expandido, setExpandido] = useState(isMantenimientoFamily);

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
  };

  return (
    <aside className="sidebar">
      <h2>tecdoit</h2>
      <nav style={{ flex: 1 }}>
        <ul>
          <li><Link to="/dashboard">Dashboard</Link></li>
          <li><Link to="/inventario">Inventario</Link></li>
          <li><Link to="/uso-equipos">Uso de Equipos</Link></li>

          {/* Mantenimiento — NavLink + collapsible sub-links */}
          <li>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Link
                to="/mantenimiento"
                style={{
                  flex: 1,
                  color: location.pathname === '/mantenimiento' ? 'white' : '#bdc3c7',
                  textDecoration: 'none',
                  fontSize: '16px',
                  display: 'block',
                  padding: '12px 15px',
                  borderRadius: '6px',
                  backgroundColor: location.pathname === '/mantenimiento' ? '#2c3e50' : 'transparent',
                  transition: 'all 0.3s ease',
                }}
              >
                Mantenimiento
              </Link>
              <button
                onClick={() => setExpandido(!expandido)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#bdc3c7',
                  cursor: 'pointer',
                  padding: '12px 10px',
                  fontSize: '10px',
                  lineHeight: 1,
                  transition: 'transform 0.25s ease',
                  transform: expandido ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
                title={expandido ? 'Contraer' : 'Expandir'}
              >
                ▼
              </button>
            </div>

            {expandido && (
              <ul style={{ listStyle: 'none', padding: '2px 0 4px 12px', margin: 0 }}>
                <li>
                  <NavLink
                    to="/preventivo"
                    style={({ isActive }) => ({
                      color: isActive ? 'white' : '#95a5a6',
                      textDecoration: 'none',
                      fontSize: '14px',
                      display: 'block',
                      padding: '8px 15px',
                      borderRadius: '6px',
                      borderLeft: isActive ? '2px solid #3498db' : '2px solid #2c3e50',
                      backgroundColor: isActive ? '#2c3e5088' : 'transparent',
                      transition: 'all 0.2s ease',
                    })}
                  >
                    Preventivo
                  </NavLink>
                </li>
                <li style={{ marginTop: '2px' }}>
                  <NavLink
                    to="/correctivo"
                    style={({ isActive }) => ({
                      color: isActive ? 'white' : '#95a5a6',
                      textDecoration: 'none',
                      fontSize: '14px',
                      display: 'block',
                      padding: '8px 15px',
                      borderRadius: '6px',
                      borderLeft: isActive ? '2px solid #3498db' : '2px solid #2c3e50',
                      backgroundColor: isActive ? '#2c3e5088' : 'transparent',
                      transition: 'all 0.2s ease',
                    })}
                  >
                    Correctivo
                  </NavLink>
                </li>
              </ul>
            )}
          </li>
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