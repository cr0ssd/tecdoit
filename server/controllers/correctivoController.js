// server/controllers/correctivoController.js
// All correctivo data lives in the existing `mantenimientos` table
// filtered by tipo_mantenimiento = 'Correctivo'

const supabase = require('../config/supabaseClient');

// GET all correctivo tickets
async function obtenerTickets(req, res) {
  const { data, error } = await supabase
    .from('mantenimientos')
    .select(`
      *,
      equipos ( marca, modelo ),
      proveedores ( nombre )
    `)
    .eq('tipo_mantenimiento', 'Correctivo')
    .order('fecha_reporte', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}

// GET correctivo records for a specific machine
async function obtenerTicketsPorEquipo(req, res) {
  const { clave } = req.params;
  const { data, error } = await supabase
    .from('mantenimientos')
    .select(`*, equipos ( marca, modelo ), proveedores ( nombre )`)
    .eq('tipo_mantenimiento', 'Correctivo')
    .eq('clave_activo', clave)
    .order('fecha_reporte', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}

// POST create correctivo ticket
async function crearTicket(req, res) {
  const {
    clave_activo,
    descripcion,
    id_proveedor,
    fecha_programada,
    costo,
  } = req.body;

  if (!clave_activo || !descripcion) {
    return res.status(400).json({ error: 'clave_activo y descripcion son requeridos.' });
  }

  const { data, error } = await supabase
    .from('mantenimientos')
    .insert([{
      clave_activo,
      tipo_mantenimiento: 'Correctivo',
      descripcion,
      id_proveedor: id_proveedor || null,
      fecha_programada: fecha_programada || null,
      costo: costo || 0,
      estatus: 'Abierto',
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Mark equipo as En Mantenimiento
  await supabase
    .from('equipos')
    .update({ estatus: 'En Mantenimiento', horas_acumuladas: 0, mantenimiento_urgente: false })
    .eq('clave_activo', clave_activo);

  res.status(201).json(data);
}

// PATCH update estatus only
async function actualizarEstatus(req, res) {
  const { id } = req.params;
  const { estatus } = req.body;

  const estatusValidos = ['Abierto', 'En progreso', 'Completado'];
  if (!estatusValidos.includes(estatus)) {
    return res.status(400).json({ error: 'Estatus no válido.' });
  }

  const { data, error } = await supabase
    .from('mantenimientos')
    .update({ estatus })
    .eq('id_mantenimiento', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}

// PATCH complete/close a correctivo ticket
async function completarTicket(req, res) {
  const { id } = req.params;
  const { clave_activo } = req.body;

  const { data, error } = await supabase
    .from('mantenimientos')
    .update({ estatus: 'Completado', fecha_cierre: new Date().toISOString() })
    .eq('id_mantenimiento', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  if (clave_activo) {
    await supabase
      .from('equipos')
      .update({ estatus: 'Activo' })
      .eq('clave_activo', clave_activo);
  }

  res.json(data);
}

module.exports = {
  obtenerTickets,
  obtenerTicketsPorEquipo,
  crearTicket,
  actualizarEstatus,
  completarTicket,
};