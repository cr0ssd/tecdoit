// server/controllers/preventivoController.js

const supabase = require('../config/supabaseClient');
const { enviarAlertaMantenimiento } = require('../services/emailService');

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY endpoints — kept intact, still read from `mantenimientos` table.
// Do not remove; other routes or the Dashboard calendar may depend on them.
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/preventivo/legacy
async function obtenerPreventivos(req, res) {
  const { data, error } = await supabase
    .from('mantenimientos')
    .select('*, equipos ( marca, modelo, horas_acumuladas, limite_horas, id_laboratorio, laboratorios ( id_laboratorio, nombre ) ), proveedores ( nombre )')
    .eq('tipo_mantenimiento', 'Preventivo')
    .order('fecha_programada', { ascending: true, nullsFirst: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}

// GET /api/preventivo/calendario
async function obtenerFechasCalendario(req, res) {
  const { data, error } = await supabase
    .from('preventivo')
    .select('clave_activo, proxima_fecha')
    .not('proxima_fecha', 'is', null)
    .order('proxima_fecha', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  const mapped = data.map(r => ({
    clave_activo:       r.clave_activo,
    proxima_fecha:      r.proxima_fecha,
    tipo_requerimiento: 'Preventivo',
  }));

  res.json(mapped);
}
// POST /api/preventivo/legacy  (old create — mantenimientos table)
async function crearPreventivoLegacy(req, res) {
  const {
    clave_activo,
    descripcion,
    descripcion_problema,
    solucion_esperada,
    prioridad,
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
      tipo_mantenimiento:  'Preventivo',
      descripcion,
      descripcion_problema: descripcion_problema || null,
      solucion_esperada:    solucion_esperada    || null,
      prioridad:            prioridad            || 0,
      id_proveedor:         id_proveedor         || null,
      fecha_programada:     fecha_programada     || null,
      costo:                costo                || 0,
      estatus:              'Abierto',
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await supabase
    .from('equipos')
    .update({ estatus: 'En Mantenimiento', horas_acumuladas: 0, mantenimiento_urgente: false })
    .eq('clave_activo', clave_activo);

  // Enviar alerta por Mailchimp
  enviarAlertaMantenimiento({
    clave_activo,
    tipo_mantenimiento: 'Preventivo',
    descripcion,
    fecha_programada
  });

  res.status(201).json(data);
}

// PATCH /api/preventivo/legacy/:id/completar  (old complete — mantenimientos table)
async function completarPreventivoLegacy(req, res) {
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

// ─────────────────────────────────────────────────────────────────────────────
// NEW endpoints — read/write the dedicated `preventivo` table.
// These are what Preventivo.jsx calls.
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/preventivo
// Returns all preventivo configs joined with equipo data.
async function obtenerConfigs(req, res) {
  const { data, error } = await supabase
    .from('preventivo')
    .select('*, equipos ( marca, modelo, horas_acumuladas ), proveedores ( id_proveedor, nombre )')
    .order('proxima_fecha', { ascending: true, nullsFirst: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}

// POST /api/preventivo
// Creates a new preventivo config for an equipo.
// Body: { clave_activo, intervalo_dias, proxima_fecha, proveedor, responsable, tareas[] }
async function crearConfig(req, res) {
  const {
    clave_activo,
    intervalo_dias,
    proxima_fecha,
    id_proveedor,
    responsable,
    tareas,
  } = req.body;

  if (!clave_activo || !intervalo_dias) {
    return res.status(400).json({ error: 'clave_activo e intervalo_dias son requeridos.' });
  }

  const { data, error } = await supabase
    .from('preventivo')
    .insert([{
      clave_activo,
      intervalo_dias:  Number(intervalo_dias),
      proxima_fecha:   proxima_fecha  || null,
      id_proveedor:    id_proveedor   || null,
      responsable:     responsable    || null,
      tareas:          tareas         || [],
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Enviar alerta de nueva configuración/mantenimiento preventivo programado
  enviarAlertaMantenimiento({
    clave_activo,
    tipo_mantenimiento: 'Preventivo (Configuración)',
    descripcion: `Nueva configuración de mantenimiento preventivo cada ${intervalo_dias} días.`,
    fecha_programada: proxima_fecha
  });

  res.status(201).json(data);
}

// PUT /api/preventivo/:clave
// Updates an existing preventivo config (does not reset the cycle).
// Body: { intervalo_dias, proxima_fecha, proveedor, responsable, tareas[] }
async function actualizarConfig(req, res) {
  const { clave } = req.params;
  const {
    intervalo_dias,
    proxima_fecha,
    id_proveedor,
    responsable,
    tareas,
  } = req.body;

  const updates = {};
  if (intervalo_dias !== undefined) updates.intervalo_dias = Number(intervalo_dias);
  if (proxima_fecha  !== undefined) updates.proxima_fecha  = proxima_fecha;
  if (id_proveedor   !== undefined) updates.id_proveedor   = id_proveedor;
  if (responsable    !== undefined) updates.responsable    = responsable;
  if (tareas         !== undefined) updates.tareas         = tareas;

  const { data, error } = await supabase
    .from('preventivo')
    .update(updates)
    .eq('clave_activo', clave)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}

// DELETE /api/preventivo/:clave
// Removes a preventivo config. Does NOT change the equipo estatus.
async function eliminarConfig(req, res) {
  const { clave } = req.params;

  const { error } = await supabase
    .from('preventivo')
    .delete()
    .eq('clave_activo', clave);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
}

// PATCH /api/preventivo/:clave/completar
// Finalizes an active maintenance cycle via the DB RPC function.
// The RPC handles all three writes atomically:
//   1. Resets proxima_fecha + ultima_ejecucion, clears en_mantenimiento
//   2. Sets equipo estatus back to 'Activo', resets horas_acumuladas
//   3. Inserts a row into preventivo_historial
// Body: { proxima_fecha, ultima_ejecucion, tareas_resultado[] }
async function completarConfig(req, res) {
  const { clave } = req.params;
  const { ultima_ejecucion, tareas_resultado } = req.body;

  // proxima_fecha is derived inside the RPC from proxima_fecha + intervalo_dias
  // so completing late still gives the full period from the original due date.
  if (!ultima_ejecucion) {
    return res.status(400).json({ error: 'ultima_ejecucion es requerido.' });
  }

  const { error } = await supabase.rpc('completar_preventivo', {
    p_clave_activo:     clave,
    p_ultima_ejecucion: ultima_ejecucion,
    p_tareas_resultado: tareas_resultado || [],
  });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
}

// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  // Legacy — mantenimientos table
  obtenerPreventivos,
  obtenerFechasCalendario,
  crearPreventivoLegacy,
  completarPreventivoLegacy,
  // New — preventivo table
  obtenerConfigs,
  crearConfig,
  actualizarConfig,
  eliminarConfig,
  completarConfig,
};