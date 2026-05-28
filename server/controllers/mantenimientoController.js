const supabase = require('../config/supabaseClient');

// Obtener todos los mantenimientos
const obtenerMantenimientos = async (req, res) => {
  console.log("==> Intentando obtener mantenimientos...");
  try {
    const { data, error } = await supabase
      .from('mantenimientos')
      .select('*, equipos(marca, modelo, id_laboratorio, laboratorios(id_laboratorio, nombre)), proveedores(nombre)')
      .order('fecha_programada', { ascending: false });

    if (error) {
      console.error("Error en obtenerMantenimientos (Supabase):", error);
      throw error;
    }
    console.log(`==> Éxito: ${data?.length || 0} mantenimientos cargados.`);
    res.status(200).json(data);
  } catch (error) {
    console.error("Error crítico en obtenerMantenimientos:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// Registrar un nuevo mantenimiento (Lógica transaccional aislada)
const crearMantenimiento = async (req, res) => {
  const {
    clave_activo,
    tipo_mantenimiento,
    descripcion,
    id_proveedor,
    fecha_programada,
    costo_estimado
  } = req.body;

  try {
    const costoProcesado = costo_estimado ? parseFloat(costo_estimado) : 0;

    // 1. Insertar el registro de mantenimiento
    const { data, error: errorInsert } = await supabase
      .from('mantenimientos')
      .insert([{
        clave_activo,
        tipo_mantenimiento,
        descripcion,
        id_proveedor: id_proveedor || null,
        fecha_programada,
        costo: costoProcesado,
        estatus: 'Abierto'
      }])
      .select();

    if (errorInsert) throw errorInsert;

    // 2. Actualizar el estatus del equipo (side effect)
    const { error: errorUpdate } = await supabase
      .from('equipos')
      .update({
        estatus: 'En Mantenimiento',
        horas_acumuladas: 0,
        mantenimiento_urgente: false
      })
      .eq('clave_activo', clave_activo);

    if (errorUpdate) {
      console.warn("Mantenimiento creado pero falló actualizar equipo:", errorUpdate.message);
    }

    return res.status(201).json(data && data.length > 0 ? data[0] : { mensaje: 'Servicio registrado correctamente.' });
  } catch (error) {
    console.error("Error en crearMantenimiento:", error.message);
    return res.status(500).json({ error: 'Error al procesar el registro: ' + error.message });
  }
};

// Completar un mantenimiento y reactivar el equipo
const completarMantenimiento = async (req, res) => {
  const { id } = req.params;
  const { clave_activo } = req.body;

  try {
    // 1. Marcar el ticket como completado
    const { data, error: errMant } = await supabase
      .from('mantenimientos')
      .update({
        estatus: 'Completado',
        fecha_cierre: new Date().toISOString()
      })
      .eq('id_mantenimiento', id)
      .select();

    if (errMant) throw errMant;

    // 2. Reactivar el equipo
    if (clave_activo) {
      const { error: errEq } = await supabase
        .from('equipos')
        .update({ estatus: 'Activo' })
        .eq('clave_activo', clave_activo);

      if (errEq) console.warn("Mantenimiento cerrado pero falló activar equipo:", errEq.message);
    }

    return res.status(200).json(data && data.length > 0 ? data[0] : { mensaje: 'Servicio completado.' });
  } catch (error) {
    console.error("Error en completarMantenimiento:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  obtenerMantenimientos,
  crearMantenimiento,
  completarMantenimiento
};