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

export const dashboardAPI = {
  obtenerEquipos: async () => {
    const response = await fetch(`${API_URL}/dashboard/equipos`);
    if (!response.ok) throw new Error('Error al obtener equipos del dashboard');
    return await response.json();
  },

  obtenerCostosMantenimientos: async () => {
    const response = await fetch(`${API_URL}/dashboard/costos-mantenimientos`);
    if (!response.ok) throw new Error('Error al obtener costos de mantenimientos');
    return await response.json();
  },

  obtenerPrestamosActivos: async () => {
    const response = await fetch(`${API_URL}/dashboard/prestamos-activos`);
    if (!response.ok) throw new Error('Error al obtener préstamos activos');
    return await response.json();
  },

  obtenerNotificaciones: async () => {
    const response = await fetch(`${API_URL}/dashboard/notificaciones`);
    if (!response.ok) throw new Error('Error al obtener notificaciones');
    return await response.json();
  },

  marcarNotificacionLeida: async (id) => {
    const response = await fetch(`${API_URL}/dashboard/notificaciones/${id}/leer`, {
      method: 'PATCH'
    });
    if (!response.ok) throw new Error('Error al marcar notificación como leída');
    return await response.json();
  },

  marcarTodasLeidas: async () => {
    const response = await fetch(`${API_URL}/dashboard/notificaciones/leer-todas`, {
      method: 'PATCH'
    });
    if (!response.ok) throw new Error('Error al marcar todas las notificaciones como leídas');
    return await response.json();
  }
};

export const usoEquiposAPI = {
  obtenerRegistros: async () => {
    const response = await fetch(`${API_URL}/uso-equipos`);
    if (!response.ok) throw new Error('Error al obtener registros de uso');
    return await response.json();
  },

  iniciarUso: async (datos) => {
    const response = await fetch(`${API_URL}/uso-equipos/iniciar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error || 'Error al iniciar sesión de uso');
    return json;
  },

  finalizarUso: async (id_uso) => {
    const response = await fetch(`${API_URL}/uso-equipos/${id_uso}/finalizar`, {
      method: 'PATCH'
    });
    if (!response.ok) throw new Error('Error al finalizar sesión de uso');
    return await response.json();
  }
};

export const inventarioAPI = {
  obtenerEquipos: async () => {
    const response = await fetch(`${API_URL}/inventario/equipos`);
    if (!response.ok) throw new Error('Error al obtener equipos');
    return await response.json();
  },

  obtenerLaboratorios: async () => {
    const response = await fetch(`${API_URL}/inventario/laboratorios`);
    if (!response.ok) throw new Error('Error al obtener laboratorios');
    return await response.json();
  },

  crearEquipo: async (datos) => {
    const response = await fetch(`${API_URL}/inventario/equipos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error || 'Error al crear equipo');
    return json;
  },

  actualizarEquipo: async (clave, datos) => {
    const response = await fetch(`${API_URL}/inventario/equipos/${clave}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error || 'Error al actualizar equipo');
    return json;
  },

  eliminarEquipo: async (clave) => {
    const response = await fetch(`${API_URL}/inventario/equipos/${clave}`, {
      method: 'DELETE'
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error || 'Error al eliminar equipo');
    return json;
  }
};