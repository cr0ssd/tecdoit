const supabase = require('../config/supabaseClient');

// ─── Carrera validation ───────────────────────────────────────────────────────
// Accepts: exactly 3 uppercase letters (e.g. ITC, IRS, BMA) OR the string PREPA
const CARRERA_REGEX = /^([A-Z]{3}|EXTERNO|PREPA)$/;

function normalizarCarrera(raw) {
  if (!raw || typeof raw !== 'string') return null;
  return raw.trim().toUpperCase();
}

function validarCarrera(carrera) {
  return CARRERA_REGEX.test(carrera);
}

// ─── Obtener toda la bitácora ─────────────────────────────────────────────────
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

// ─── Iniciar sesión de uso ────────────────────────────────────────────────────
const iniciarUso = async (req, res) => {
  const { clave_activo, usuario_nombre, proposito, carrera } = req.body;

  // Normalize and validate carrera
  const carreraNormalizada = normalizarCarrera(carrera);

  if (!carreraNormalizada) {
    return res.status(400).json({ error: 'El campo Carrera es obligatorio.' });
  }

  if (!validarCarrera(carreraNormalizada)) {
    return res.status(400).json({
      error: 'Carrera no válida. Ingresa 3 letras (Ej: ITC, IRS) o "Prepa".',
    });
  }

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

    // Validación 2: No debe haber sesión activa para este equipo
    const { data: usoActivo, error: errorUso } = await supabase
      .from('registro_uso')
      .select('id_uso')
      .eq('clave_activo', clave_activo)
      .eq('estatus', 'En uso');

    if (errorUso) throw errorUso;

    if (usoActivo && usoActivo.length > 0) {
      return res.status(409).json({ error: 'Este equipo ya está en uso. Deben finalizar la sesión anterior.' });
    }

    // Validaciones pasadas — insertar registro de uso
    const { error: errorInsert } = await supabase
      .from('registro_uso')
      .insert([{
        clave_activo,
        usuario_nombre,
        proposito: proposito || null,
        carrera: carreraNormalizada,
      }]);

    if (errorInsert) throw errorInsert;

    // Side effect: actualizar ultimo_usuario en equipos
    const { error: errorUpdate } = await supabase
      .from('equipos')
      .update({ ultimo_usuario: usuario_nombre })
      .eq('clave_activo', clave_activo);

    // Log but don't fail the request if this secondary write fails
    if (errorUpdate) {
      console.warn(`[usoEquipos] No se pudo actualizar ultimo_usuario para ${clave_activo}:`, errorUpdate.message);
    }

    res.status(201).json({ mensaje: 'Sesión de uso iniciada correctamente.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── Finalizar sesión de uso ──────────────────────────────────────────────────
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