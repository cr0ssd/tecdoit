import React, { useState } from 'react';
import { supabase } from '../services/supabase';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (error) {
      alert('Error de acceso: Verifica tu correo y contraseña.');
    } finally {
      setCargando(false);
    }
  };

  // NUEVO: Función para escuchar las teclas que presionas
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleLogin(e); // Si es Enter, mandamos a llamar el Login
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">tecdoit</h1>
        <p className="login-subtitle">Sistema Integral de Gestión de Laboratorios</p>
        
        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label>Correo Electrónico</label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="admin@tecdoit.com" 
            />
          </div>
          
          <div className="form-group">
            <label>Contraseña</label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              onKeyDown={handleKeyDown} /* <-- AQUÍ CONECTAMOS LA MAGIA DEL ENTER */
              placeholder="••••••••" 
            />
          </div>
          
          <button type="submit" className="btn-primary" disabled={cargando} style={{ width: '100%', marginTop: '10px' }}>
            {cargando ? 'Verificando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;