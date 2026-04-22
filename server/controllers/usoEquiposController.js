const supabase = require('../config/supabaseClient');

// Obtener toda la bitácora de uso con joins de equipo y laboratorio
const obtenerRegistros = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('registro_uso')
      .select('*, equipos(marca, modelo, laboratorios(nombre))')
      .order('hora_inicio', { ascending: false });

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Iniciar sesión de uso — contiene validaciones de negocio
const iniciarUso = async (req, res) => {
  const { clave_activo, usuario_nombre, proposito } = req.body;

  try {
    // Validación 1: Verificar que el equipo existe y está Activo
    const { data: equipo, error: errorEq } = await supabase
      .from('equipos')
      .select('estatus')
      .eq('clave_activo', clave_activo)
      .single();

    if (errorEq || !equipo) {
      return res.status(404).json({ error: 'Equipo no encontrado. Verifica la clave.' });
    }

    if (equipo.estatus !== 'Activo') {
      return res.status(409).json({ error: 'El equipo no está Activo (puede estar en mantenimiento).' });
    }

    // Validación 2: Verificar que no haya una sesión activa para este equipo
    const { data: usoActivo, error: errorUso } = await supabase
      .from('registro_uso')
      .select('id_uso')
      .eq('clave_activo', clave_activo)
      .eq('estatus', 'En uso');

    if (errorUso) throw errorUso;

    if (usoActivo && usoActivo.length > 0) {
      return res.status(409).json({ error: 'Este equipo ya está en uso. Deben finalizar la sesión anterior.' });
    }

    // Validaciones pasadas — insertar registro
    const { error: errorInsert } = await supabase
      .from('registro_uso')
      .insert([{
        clave_activo,
        usuario_nombre,
        proposito: proposito || null
      }]);

    if (errorInsert) throw errorInsert;

    res.status(201).json({ mensaje: 'Sesión de uso iniciada correctamente.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Finalizar sesión de uso — libera el equipo
const finalizarUso = async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('registro_uso')
      .update({
        estatus: 'Finalizado',
        hora_fin: new Date().toISOString()
      })
      .eq('id_uso', id);

    if (error) throw error;
    res.status(200).json({ mensaje: 'Sesión finalizada. Equipo liberado.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  obtenerRegistros,
  iniciarUso,
  finalizarUso
};