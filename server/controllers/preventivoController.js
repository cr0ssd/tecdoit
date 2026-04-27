// server/controllers/preventivoController.js

const supabase = require('../config/supabaseClient');

// ── GET all preventivo configs ───────────────────────────────────────────────
async function obtenerConfigs(req, res) {
  const { data, error } = await supabase
    .from('preventivo_config')
    .select(`
      *,
      equipo:equipos ( marca, modelo, horas_acumuladas )
    `)
    .order('proxima_fecha', { ascending: true, nullsFirst: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}

// ── GET calendar dates (for Dashboard calendar widget) ───────────────────────
async function obtenerFechasCalendario(req, res) {
  const { data, error } = await supabase
    .from('preventivo_config')
    .select('clave_activo, proxima_fecha, tipo_requerimiento')
    .not('proxima_fecha', 'is', null)
    .order('proxima_fecha', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}

// ── POST create config ───────────────────────────────────────────────────────
async function crearConfig(req, res) {
  const {
    clave_activo, modo, intervalo, intervalo_dias,
    ultima_ejecucion, proxima_fecha, limite_horas_preventivo,
    tipo_requerimiento, descripcion_requerimiento,
  } = req.body;

  if (!clave_activo || !modo) {
    return res.status(400).json({ error: 'clave_activo y modo son requeridos.' });
  }

  const { data, error } = await supabase
    .from('preventivo_config')
    .insert([{
      clave_activo, modo, intervalo: intervalo || null,
      intervalo_dias: intervalo_dias || null,
      ultima_ejecucion: ultima_ejecucion || null,
      proxima_fecha: proxima_fecha || null,
      limite_horas_preventivo: limite_horas_preventivo || null,
      tipo_requerimiento: tipo_requerimiento || null,
      descripcion_requerimiento: descripcion_requerimiento || null,
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
}

// ── PUT update config ────────────────────────────────────────────────────────
async function actualizarConfig(req, res) {
  const { clave } = req.params;
  const {
    modo, intervalo, intervalo_dias,
    ultima_ejecucion, proxima_fecha, limite_horas_preventivo,
    tipo_requerimiento, descripcion_requerimiento,
  } = req.body;

  const { data, error } = await supabase
    .from('preventivo_config')
    .update({
      modo, intervalo: intervalo || null,
      intervalo_dias: intervalo_dias || null,
      ultima_ejecucion: ultima_ejecucion || null,
      proxima_fecha: proxima_fecha || null,
      limite_horas_preventivo: limite_horas_preventivo || null,
      tipo_requerimiento: tipo_requerimiento || null,
      descripcion_requerimiento: descripcion_requerimiento || null,
    })
    .eq('clave_activo', clave)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}

// ── DELETE config ────────────────────────────────────────────────────────────
async function eliminarConfig(req, res) {
  const { clave } = req.params;
  const { error } = await supabase
    .from('preventivo_config')
    .delete()
    .eq('clave_activo', clave);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
}

module.exports = { obtenerConfigs, obtenerFechasCalendario, crearConfig, actualizarConfig, eliminarConfig };
