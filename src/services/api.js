const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const mantenimientosAPI = {
  obtenerTodos: async () => {
    const response = await fetch(`${API_URL}/mantenimientos`);
    if (!response.ok) throw new Error('Error de red al obtener mantenimientos');
    return await response.json();
  },

  crear: async (datosMantenimiento) => {
    const response = await fetch(`${API_URL}/mantenimientos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datosMantenimiento)
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