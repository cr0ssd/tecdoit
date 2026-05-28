// server/controllers/correctivoController.js
// All correctivo data lives in the existing `mantenimientos` table
// filtered by tipo_mantenimiento = 'Correctivo'

const supabase = require('../config/supabaseClient');

// GET all correctivo tickets
async function obtenerTickets(req, res) {
  console.log("==> Intentando obtener tickets correctivos...");
  try {
    const { data, error } = await supabase
      .from('mantenimientos')
      .select(`*, equipos ( marca, modelo, id_laboratorio, laboratorios ( id_laboratorio, nombre ) ), proveedores ( nombre )`)
      .eq('tipo_mantenimiento', 'Correctivo')
      .order('fecha_reporte', { ascending: false });

    if (error) {
      console.error("Error en obtenerTickets (Supabase):", error);
      throw error;
    }
    console.log(`==> Éxito: ${data?.length || 0} tickets correctivos cargados.`);
    res.json(data);
  } catch (error) {
    console.error("Error crítico en obtenerTickets:", error.message);
    res.status(500).json({ error: error.message });
  }
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
    causa_falla,
    prioridad,
    id_proveedor,
    fecha_programada,
    costo,
  } = req.body;

  if (!clave_activo || !descripcion) {
    return res.status(400).json({ error: 'clave_activo y descripcion son requeridos.' });
  }

  try {
    const { data, error } = await supabase
      .from('mantenimientos')
      .insert([{
        clave_activo,
        tipo_mantenimiento: 'Correctivo',
        descripcion,
        causa_falla: causa_falla || null,
        prioridad: prioridad || 0,
        id_proveedor: id_proveedor || null,
        fecha_programada: fecha_programada || null,
        costo: costo || 0,
        estatus: 'Abierto',
      }])
      .select();

    if (error) throw error;

    // Mark equipo as En Mantenimiento
    await supabase
      .from('equipos')
      .update({ estatus: 'En Mantenimiento', horas_acumuladas: 0, mantenimiento_urgente: false })
      .eq('clave_activo', clave_activo);

    return res.status(201).json(data && data.length > 0 ? data[0] : { mensaje: 'Ticket creado con éxito' });
  } catch (error) {
    console.error("Error en crearTicket:", error.message);
    return res.status(500).json({ error: error.message });
  }
}

// PATCH update estatus only
async function actualizarEstatus(req, res) {
  const { id } = req.params;
  const { estatus } = req.body;

  const estatusValidos = ['Abierto', 'En progreso', 'Completado'];
  if (!estatusValidos.includes(estatus)) {
    return res.status(400).json({ error: 'Estatus no válido.' });
  }

  try {
    const { data, error } = await supabase
      .from('mantenimientos')
      .update({ estatus })
      .eq('id_mantenimiento', id)
      .select();

    if (error) throw error;
    return res.json(data && data.length > 0 ? data[0] : { mensaje: 'Estatus actualizado' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// PATCH complete/close a correctivo ticket
async function completarTicket(req, res) {
  const { id } = req.params;
  const { clave_activo } = req.body;

  try {
    const { data, error } = await supabase
      .from('mantenimientos')
      .update({ estatus: 'Completado', fecha_cierre: new Date().toISOString() })
      .eq('id_mantenimiento', id)
      .select();

    if (error) throw error;

    if (clave_activo) {
      await supabase
        .from('equipos')
        .update({ estatus: 'Activo' })
        .eq('clave_activo', clave_activo);
    }

    return res.json(data && data.length > 0 ? data[0] : { mensaje: 'Cerrado con éxito' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// PATCH edit an active ticket's fields
async function editarTicket(req, res) {
  const { id } = req.params;
  const { descripcion, causa_falla, prioridad, id_proveedor, fecha_programada, costo, estatus } = req.body;

  const estatusValidos = ['Abierto', 'En progreso'];
  if (estatus && !estatusValidos.includes(estatus)) {
    return res.status(400).json({ error: 'Solo se puede editar un ticket activo (Abierto o En progreso).' });
  }

  try {
    const { data, error } = await supabase
      .from('mantenimientos')
      .update({
        descripcion:      descripcion      ?? undefined,
        causa_falla:      causa_falla !== undefined ? causa_falla : undefined,
        prioridad:        prioridad !== undefined ? prioridad : undefined,
        id_proveedor:     id_proveedor     ?? null,
        fecha_programada: fecha_programada ?? null,
        costo:            costo            ?? 0,
        estatus:          estatus          ?? undefined,
      })
      .eq('id_mantenimiento', id)
      .select();

    if (error) throw error;
    return res.json(data && data.length > 0 ? data[0] : { mensaje: 'Editado con éxito' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  obtenerTickets,
  obtenerTicketsPorEquipo,
  crearTicket,
  actualizarEstatus,
  completarTicket,
  editarTicket,
};