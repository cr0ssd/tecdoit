const supabase = require('../config/supabaseClient');

// Equipos completos con info de laboratorio — para KPIs, gráficas y tabla de auditoría
const obtenerEquiposDashboard = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('equipos')
      .select('clave_activo, marca, modelo, estatus, costo, fecha_registro, horas_acumuladas, limite_horas, mantenimiento_urgente, laboratorios(nombre)')
      .order('fecha_registro', { ascending: false });

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Solo costos de mantenimientos — para cálculo de OpEx en frontend
const obtenerCostosMantenimientos = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('mantenimientos')
      .select('costo');

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Préstamos activos con info de equipo y laboratorio — para tabla y KPI
const obtenerPrestamosActivos = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('registro_uso')
      .select('*, equipos(marca, modelo, laboratorios(nombre))')
      .eq('estatus', 'En uso');

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Notificaciones estáticas del sistema (post1) — se combinan con alertas dinámicas en frontend
const obtenerNotificaciones = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('post1')
      .select('*, author1(nombre)')
      .order('fecha', { ascending: false })
      .limit(20);

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Marcar una notificación individual como leída
const marcarNotificacionLeida = async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('post1')
      .update({ leida: true })
      .eq('id', id);

    if (error) throw error;
    res.status(200).json({ mensaje: 'Notificación marcada como leída.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Marcar todas las notificaciones no leídas como leídas
const marcarTodasLeidas = async (req, res) => {
  try {
    const { error } = await supabase
      .from('post1')
      .update({ leida: true })
      .eq('leida', false);

    if (error) throw error;
    res.status(200).json({ mensaje: 'Todas las notificaciones marcadas como leídas.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  obtenerEquiposDashboard,
  obtenerCostosMantenimientos,
  obtenerPrestamosActivos,
  obtenerNotificaciones,
  marcarNotificacionLeida,
  marcarTodasLeidas
};