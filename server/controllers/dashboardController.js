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

// Obtener reporte de un laboratorio específico con todos sus datos relacionados
const obtenerReporteLaboratorio = async (req, res) => {
  const { id } = req.params;
  const { periodo = 'mes' } = req.query;

  try {
    // Calcular fecha de inicio basada en periodo
    const ahora = new Date();
    let desde = new Date();
    
    switch (periodo) {
      case 'dia':
        desde.setDate(desde.getDate() - 1);
        break;
      case 'semana':
        desde.setDate(desde.getDate() - 7);
        break;
      case 'mes':
        desde.setMonth(desde.getMonth() - 1);
        break;
      case 'semestre':
        desde.setMonth(desde.getMonth() - 6);
        break;
      default:
        desde.setMonth(desde.getMonth() - 1);
    }

    const desdeISO = desde.toISOString();

    // Obtener laboratorio y departamento
    const { data: laboratorios, error: labError } = await supabase
      .from('laboratorios')
      .select('id_laboratorio, nombre, id_departamento, departamentos(nombre)')
      .eq('id_laboratorio', id)
      .single();

    if (labError) throw labError;
    if (!laboratorios) throw new Error('Laboratorio no encontrado');

    // Obtener equipos del laboratorio
    const { data: equipos, error: equipError } = await supabase
      .from('equipos')
      .select('id_equipo, clave_activo, marca, modelo, estatus, costo, fecha_registro, horas_acumuladas, limite_horas, mantenimiento_urgente, numero_serie, garantia_hasta')
      .eq('id_laboratorio', id);

    if (equipError) throw equipError;

    // Obtener claves de equipos para consultas posteriores
    const claves = equipos.map(e => e.clave_activo);

    let mantenimientos = [];
    let usos = [];
    let preventivos = [];

    if (claves.length > 0) {
      // Obtener mantenimientos de estos equipos (filtrados por período)
      const { data: mantData, error: mantError } = await supabase
        .from('mantenimientos')
        .select('id_mantenimiento, clave_activo, tipo_mantenimiento, descripcion, costo, fecha_reporte, fecha_programada, fecha_cierre, estatus, prioridad')
        .in('clave_activo', claves)
        .gte('fecha_reporte', desdeISO);

      if (mantError) throw mantError;
      mantenimientos = mantData || [];

      // Obtener registro de uso (préstamos) filtrados por período
      const { data: usosData, error: usosError } = await supabase
        .from('registro_uso')
        .select('id_uso, clave_activo, usuario_nombre, proposito, hora_inicio, hora_fin, estatus, carrera')
        .in('clave_activo', claves)
        .gte('hora_inicio', desdeISO);

      if (usosError) throw usosError;
      usos = usosData || [];

      // Obtener preventivos (no filtrados por período ya que es configuración activa)
      const { data: prevData, error: prevError } = await supabase
        .from('preventivo')
        .select('id, clave_activo, intervalo_dias, proxima_fecha, ultima_ejecucion, en_mantenimiento, proveedor, responsable')
        .in('clave_activo', claves);

      if (prevError) throw prevError;
      preventivos = prevData || [];
    }

    res.status(200).json({
      laboratorio: laboratorios,
      periodo,
      desde: desdeISO,
      equipos,
      mantenimientos,
      usos,
      preventivos
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtener lista de laboratorios
const obtenerLaboratoriosLista = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('laboratorios')
      .select('id_laboratorio, nombre');

    if (error) throw error;
    res.status(200).json(data);
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
  marcarTodasLeidas,
  obtenerReporteLaboratorio,
  obtenerLaboratoriosLista,
};