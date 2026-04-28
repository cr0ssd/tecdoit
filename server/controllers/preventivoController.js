// server/controllers/preventivoController.js
// All preventivo data lives in the existing `mantenimientos` table
// filtered by tipo_mantenimiento = 'Preventivo'

const supabase = require('../config/supabaseClient');

// GET all preventivo records
async function obtenerPreventivos(req, res) {
  const { data, error } = await supabase
    .from('mantenimientos')
    .select(`
      *,
      equipos ( marca, modelo, horas_acumuladas, limite_horas ),
      proveedores ( nombre )
    `)
    .eq('tipo_mantenimiento', 'Preventivo')
    .order('fecha_programada', { ascending: true, nullsFirst: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}

// GET calendar due dates (fecha_programada) for preventivos
async function obtenerFechasCalendario(req, res) {
  const { data, error } = await supabase
    .from('mantenimientos')
    .select('clave_activo, fecha_programada, descripcion')
    .eq('tipo_mantenimiento', 'Preventivo')
    .neq('estatus', 'Completado')
    .not('fecha_programada', 'is', null)
    .order('fecha_programada', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  // Rename to proxima_fecha so the Dashboard calendar widget works unchanged
  const mapped = data.map(r => ({
    clave_activo: r.clave_activo,
    proxima_fecha: r.fecha_programada,
    tipo_requerimiento: r.descripcion,
  }));

  res.json(mapped);
}

// POST create preventivo — reuses existing mantenimientoController logic
// but hardcodes tipo_mantenimiento = 'Preventivo'
async function crearPreventivo(req, res) {
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
      tipo_mantenimiento: 'Preventivo',
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

// PATCH complete a preventivo
async function completarPreventivo(req, res) {
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

module.exports = { obtenerPreventivos, obtenerFechasCalendario, crearPreventivo, completarPreventivo };