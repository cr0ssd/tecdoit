// server/controllers/correctivoController.js

const supabase = require('../config/supabaseClient');

// ── GET all tickets ──────────────────────────────────────────────────────────
async function obtenerTickets(req, res) {
  const { data, error } = await supabase
    .from('correctivo_tickets')
    .select(`
      *,
      proveedores ( nombre )
    `)
    .order('fecha_reporte', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}

// ── GET tickets by machine ───────────────────────────────────────────────────
async function obtenerTicketsPorEquipo(req, res) {
  const { clave } = req.params;
  const { data, error } = await supabase
    .from('correctivo_tickets')
    .select(`*, proveedores ( nombre )`)
    .eq('clave_activo', clave)
    .order('fecha_reporte', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}

// ── POST create ticket ───────────────────────────────────────────────────────
async function crearTicket(req, res) {
  const {
    clave_activo,
    descripcion_falla,
    es_solucion_interna,
    responsable,
    id_proveedor,
    fecha_estimada_cierre,
    costo_estimado,
    notas_seguimiento,
  } = req.body;

  if (!clave_activo || !descripcion_falla) {
    return res.status(400).json({ error: 'clave_activo y descripcion_falla son requeridos.' });
  }

  const { data, error } = await supabase
    .from('correctivo_tickets')
    .insert([{
      clave_activo,
      descripcion_falla,
      es_solucion_interna: es_solucion_interna !== false && es_solucion_interna !== 'false',
      responsable: responsable || null,
      id_proveedor: id_proveedor || null,
      fecha_estimada_cierre: fecha_estimada_cierre || null,
      costo_estimado: costo_estimado || 0,
      notas_seguimiento: notas_seguimiento || null,
      estatus: 'Abierto',
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Auto-update equipo status to En Mantenimiento
  await supabase
    .from('equipos')
    .update({ estatus: 'En Mantenimiento' })
    .eq('clave_activo', clave_activo);

  res.status(201).json(data);
}

// ── PATCH update estatus only ────────────────────────────────────────────────
async function actualizarEstatus(req, res) {
  const { id } = req.params;
  const { estatus } = req.body;

  const estatusValidos = ['Abierto', 'En progreso', 'Resuelto', 'Sin solución'];
  if (!estatusValidos.includes(estatus)) {
    return res.status(400).json({ error: 'Estatus no válido.' });
  }

  const { data, error } = await supabase
    .from('correctivo_tickets')
    .update({ estatus })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}

// ── PATCH close ticket ───────────────────────────────────────────────────────
async function cerrarTicket(req, res) {
  const { id } = req.params;
  const { tuvo_solucion, descripcion_solucion, costo_real, estatus, fecha_cierre } = req.body;

  // Fetch ticket to get clave_activo
  const { data: ticket, error: fetchErr } = await supabase
    .from('correctivo_tickets')
    .select('clave_activo')
    .eq('id', id)
    .single();

  if (fetchErr) return res.status(404).json({ error: 'Ticket no encontrado.' });

  const { data, error } = await supabase
    .from('correctivo_tickets')
    .update({
      tuvo_solucion,
      descripcion_solucion: descripcion_solucion || null,
      costo_real: costo_real || null,
      estatus: estatus || (tuvo_solucion ? 'Resuelto' : 'Sin solución'),
      fecha_cierre: fecha_cierre || new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Restore equipo to Activo when ticket is closed
  await supabase
    .from('equipos')
    .update({ estatus: 'Activo' })
    .eq('clave_activo', ticket.clave_activo);

  res.json(data);
}

// ── GET seguimiento for a ticket ─────────────────────────────────────────────
async function obtenerSeguimiento(req, res) {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('correctivo_seguimiento')
    .select('*')
    .eq('id_ticket', id)
    .order('fecha', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}

// ── POST add seguimiento note ────────────────────────────────────────────────
async function agregarSeguimiento(req, res) {
  const { id } = req.params;
  const { nota, responsable, estatus_anterior, estatus_nuevo } = req.body;

  if (!nota) return res.status(400).json({ error: 'La nota es requerida.' });

  const { data, error } = await supabase
    .from('correctivo_seguimiento')
    .insert([{
      id_ticket: id,
      nota,
      responsable: responsable || null,
      estatus_anterior: estatus_anterior || null,
      estatus_nuevo: estatus_nuevo || null,
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
}

module.exports = {
  obtenerTickets,
  obtenerTicketsPorEquipo,
  crearTicket,
  actualizarEstatus,
  cerrarTicket,
  obtenerSeguimiento,
  agregarSeguimiento,
};
