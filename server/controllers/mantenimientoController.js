const supabase = require('../config/supabaseClient');

// Obtener todos los mantenimientos
const obtenerMantenimientos = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('mantenimientos')
      .select('*, equipos(marca, modelo)')
      .order('fecha_programada', { ascending: false });

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Registrar un nuevo mantenimiento (Lógica transaccional aislada)
const crearMantenimiento = async (req, res) => {
  const { clave_activo, tipo_servicio, descripcion, proveedor, fecha_programada, costo_estimado } = req.body;

  try {
    const costoProcesado = costo_estimado ? parseFloat(costo_estimado) : 0;

    // 1. Insertar el registro de mantenimiento
    const { error: errorInsert } = await supabase
      .from('mantenimientos')
      .insert([{
        clave_activo, tipo_servicio, descripcion, proveedor, fecha_programada,
        costo: costoProcesado, estatus: 'Abierto'
      }]);

    if (errorInsert) throw errorInsert;

    // 2. Actualizar el estatus del equipo
    const { error: errorUpdate } = await supabase
      .from('equipos')
      .update({ 
        estatus: 'En Mantenimiento', 
        horas_acumuladas: 0, 
        mantenimiento_urgente: false 
      })
      .eq('clave_activo', clave_activo);

    if (errorUpdate) throw errorUpdate;

    res.status(201).json({ mensaje: 'Servicio registrado y estatus de equipo actualizado.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al procesar el registro: ' + error.message });
  }
};

const completarMantenimiento = async (req, res) => {
  const { id } = req.params;
  const { clave_activo } = req.body;
  try {
    const { error: errMant } = await supabase
      .from('mantenimientos')
      .update({ estatus: 'Completado', fecha_cierre: new Date().toISOString() })
      .eq('id', id);
    if (errMant) throw errMant;

    const { error: errEq } = await supabase
      .from('equipos')
      .update({ estatus: 'Activo' })
      .eq('clave_activo', clave_activo);
    if (errEq) throw errEq;

    res.status(200).json({ mensaje: 'Servicio completado y equipo reactivado.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


module.exports = {
  obtenerMantenimientos,
  crearMantenimiento,
  completarMantenimiento
};