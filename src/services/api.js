const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const mantenimientosAPI = {
  obtenerTodos: async () => {
    const response = await fetch(`${API_URL}/mantenimientos`);
    if (!response.ok) throw new Error('Error de red al obtener mantenimientos');
    return await response.json();
  },

  crear: async (datos) => {
    const response = await fetch(`${API_URL}/mantenimientos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });
    if (!response.ok) throw new Error('Error al guardar mantenimiento');
    return await response.json();
  },

  completar: async (id_mantenimiento, clave_activo) => {
    const response = await fetch(`${API_URL}/mantenimientos/${id_mantenimiento}/completar`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clave_activo })
    });
    if (!response.ok) throw new Error('Error al completar mantenimiento');
    return await response.json();
  }
};

export const proveedoresAPI = {
  obtenerTodos: async () => {
    const response = await fetch(`${API_URL}/proveedores`);
    if (!response.ok) throw new Error('Error al obtener proveedores');
    return await response.json();
  }
};

export const equiposAPI = {
  obtenerTodos: async () => {
    const response = await fetch(`${API_URL}/equipos`);
    if (!response.ok) throw new Error('Error al obtener equipos');
    return await response.json();
  }
};