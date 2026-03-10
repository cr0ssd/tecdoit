import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './services/supabase';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Inventario from './pages/Inventario';
import UsoEquipos from './pages/UsoEquipos';
import Mantenimiento from './pages/Mantenimiento';
import Login from './pages/Login'; // <-- Importamos el Login
import './App.css'; 

function App() {
  const [sesion, setSesion] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // 1. Revisar si el usuario ya había iniciado sesión antes
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSesion(session);
      setCargando(false);
    });

    // 2. Quedarnos escuchando si el usuario entra (Login) o sale (Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSesion(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (cargando) {
    return <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>Cargando sistema tecdoit...</div>;
  }

  // SI NO HAY SESIÓN: Mostrar únicamente la pantalla de Login
  if (!sesion) {
    return <Login />;
  }

  // SI SÍ HAY SESIÓN: Mostrar el sistema completo
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* Redirigimos la raíz al dashboard automáticamente */}
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} /> 
          <Route path="inventario" element={<Inventario />} /> 
          <Route path="uso-equipos" element={<UsoEquipos />} />
          <Route path="mantenimiento" element={<Mantenimiento />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;