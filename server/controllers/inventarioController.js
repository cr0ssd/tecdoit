const supabase = require('../config/supabaseClient');

// Obtener todos los equipos con info de laboratorio — para tabla y formulario de edición
const obtenerEquipos = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('equipos')
      .select('clave_activo, marca, modelo, estatus, id_laboratorio, imagen_url, costo, limite_horas, laboratorios(nombre)');

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtener todos los laboratorios — para dropdown del formulario
const obtenerLaboratorios = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('laboratorios')
      .select('id_laboratorio, nombre')
      .order('nombre', { ascending: true });

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Crear nuevo equipo
const crearEquipo = async (req, res) => {
  const { clave_activo, marca, modelo, id_laboratorio, imagen_url, costo, limite_horas } = req.body;

  try {
    const { error } = await supabase
      .from('equipos')
      .insert([{
        clave_activo,
        marca,
        modelo,
        id_laboratorio: id_laboratorio ? parseInt(id_laboratorio) : null,
        imagen_url: imagen_url || null,
        costo: costo ? parseFloat(costo) : 0,
        limite_horas: limite_horas ? parseFloat(limite_horas) : null
      }]);

    if (error) throw error;
    res.status(201).json({ mensaje: 'Equipo registrado correctamente.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Actualizar equipo existente
const actualizarEquipo = async (req, res) => {
  const { clave } = req.params;
  const { marca, modelo, id_laboratorio, imagen_url, costo, limite_horas } = req.body;

  try {
    const { error } = await supabase
      .from('equipos')
      .update({
        marca,
        modelo,
        id_laboratorio: id_laboratorio ? parseInt(id_laboratorio) : null,
        imagen_url: imagen_url || null,
        costo: costo ? parseFloat(costo) : 0,
        limite_horas: limite_horas ? parseFloat(limite_horas) : null
      })
      .eq('clave_activo', clave);

    if (error) throw error;
    res.status(200).json({ mensaje: 'Equipo actualizado correctamente.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Eliminar equipo permanentemente
const eliminarEquipo = async (req, res) => {
  const { clave } = req.params;

  try {
    const { error } = await supabase
      .from('equipos')
      .delete()
      .eq('clave_activo', clave);

    if (error) throw error;
    res.status(200).json({ mensaje: 'Equipo eliminado correctamente.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  obtenerEquipos,
  obtenerLaboratorios,
  crearEquipo,
  actualizarEquipo,
  eliminarEquipo
};