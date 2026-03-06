import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Inventario from './pages/Inventario';
import './App.css'; // ¡Esta línea es vital para que se vea bonito!

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<div className="dashboard-container"><h1>Bienvenido a tecdoit</h1><p>Selecciona una opción del menú lateral.</p></div>} />
          <Route path="dashboard" element={<Dashboard />} /> 
          <Route path="inventario" element={<Inventario />} /> 
          <Route path="uso-equipos" element={<h1>Registro de Uso (QR)</h1>} />
          <Route path="mantenimiento" element={<h1>Módulo de Mantenimientos</h1>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;