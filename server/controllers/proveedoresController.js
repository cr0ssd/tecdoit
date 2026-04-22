const supabase = require('../config/supabaseClient');

// Obtener todos los proveedores para el dropdown del formulario
const obtenerProveedores = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('proveedores')
      .select('id_proveedor, nombre, es_preferido')
      .order('nombre', { ascending: true });

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  obtenerProveedores
};