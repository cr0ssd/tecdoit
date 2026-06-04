const supabase = require('../config/supabaseClient');

// Obtener todos los equipos para el dropdown del formulario de mantenimiento
const obtenerEquipos = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('equipos')
      .select('clave_activo, marca, modelo, estatus')
      .order('clave_activo', { ascending: true });

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  obtenerEquipos
};