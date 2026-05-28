// server/controllers/preventivoController.js
// All preventivo data lives in the existing mantenimientos table
// filtered by tipo_mantenimiento = 'Preventivo'

const supabase = require('../config/supabaseClient');

// GET all preventivo records
async function obtenerPreventivos(req, res) {
  console.log("==> Intentando obtener mantenimientos preventivos...");
  try {
    const { data, error } = await supabase
      .from('mantenimientos')
      .select('*, equipos ( marca, modelo, horas_acumuladas, limite_horas, id_laboratorio, laboratorios ( id_laboratorio, nombre ) ), proveedores ( nombre )')
      .eq('tipo_mantenimiento', 'Preventivo')
      .order('fecha_programada', { ascending: true, nullsFirst: false });

    if (error) {
      console.error("Error en obtenerPreventivos (Supabase):", error);
      throw error;
    }
    console.log("==> Éxito: " + (data?.length || 0) + " preventivos cargados.");
    res.json(data);
  } catch (error) {
    console.error("Error crítico en obtenerPreventivos:", error.message);
    res.status(500).json({ error: error.message });
  }
}

// GET calendar due dates (fecha_programada) for preventivos
async function obtenerFechasCalendario(req, res) {
  try {
    const { data, error } = await supabase
      .from('mantenimientos')
      .select('clave_activo, fecha_programada, descripcion')
      .eq('tipo_mantenimiento', 'Preventivo')
      .neq('estatus', 'Completado')
      .not('fecha_programada', 'is', null)
      .order('fecha_programada', { ascending: true });

    if (error) throw error;

    // Rename to proxima_fecha so the Dashboard calendar widget works unchanged
    const mapped = data.map(r => ({
      clave_activo: r.clave_activo,
      proxima_fecha: r.fecha_programada,
      tipo_requerimiento: r.descripcion,
    }));

    res.json(mapped);
  } catch (error) {
    console.error("Error en obtenerFechasCalendario:", error.message);
    res.status(500).json({ error: error.message });
  }
}

// POST create preventivo
async function crearPreventivo(req, res) {
  console.log("==> DEBUG: Iniciando crearPreventivo");
  console.log("==> DEBUG: Payload recibido:", JSON.stringify(req.body, null, 2));

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
    console.error("==> DEBUG: Error de validación: Faltan clave_activo o descripcion");
    return res.status(400).json({ error: 'clave_activo y descripcion son requeridos.' });
  }

  try {
    console.log("==> DEBUG: Intentando insertar en Supabase...");
    const { data, error } = await supabase
      .from('mantenimientos')
      .insert([{
        clave_activo,
        tipo_mantenimiento: 'Preventivo',
        descripcion,
        descripcion_problema: descripcion_problema || null,
        solucion_esperada: solucion_esperada || null,
        prioridad: prioridad || 0,
        id_proveedor: id_proveedor || null,
        fecha_programada: fecha_programada || null,
        costo: costo || 0,
        estatus: 'Abierto',
      }])
      .select();

    if (error) {
      console.error("==> DEBUG: Error de Supabase al insertar:", error);
      throw error;
    }

    console.log("==> DEBUG: Inserción exitosa. Actualizando equipo...");
    const { error: errorUpdate } = await supabase
      .from('equipos')
      .update({ 
        estatus: 'En Mantenimiento', 
        horas_acumuladas: 0, 
        mantenimiento_urgente: false 
      })
      .eq('clave_activo', clave_activo);

    if (errorUpdate) {
      console.warn("==> DEBUG: Alerta - Falló actualizar equipo:", errorUpdate.message);
    }

    const respuestaFinal = data && data.length > 0 ? data[0] : { mensaje: 'Registro creado con éxito' };
    console.log("==> DEBUG: Enviando respuesta exitosa:", JSON.stringify(respuestaFinal, null, 2));
    return res.status(201).json(respuestaFinal);

  } catch (error) {
    console.error("==> DEBUG: CRASH DETECTADO:", error);
    return res.status(500).json({ 
      error: error.message || "Error interno del servidor",
      detalles: error
    });
  }
}

// PATCH complete a preventivo
async function completarPreventivo(req, res) {
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

    return res.json(data && data.length > 0 ? data[0] : { mensaje: 'Completado con éxito' });
  } catch (error) {
    console.error("Error en completarPreventivo:", error.message);
    res.status(500).json({ error: error.message });
  }
}

module.exports = { obtenerPreventivos, obtenerFechasCalendario, crearPreventivo, completarPreventivo };
