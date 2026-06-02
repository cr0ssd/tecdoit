const cron = require('node-cron');
const supabase = require('../config/supabaseClient');
const { enviarRecordatorioMantenimiento } = require('./emailService');

/**
 * Inicia el programador de tareas (Cron Job).
 * Escanea la base de datos diariamente en busca de mantenimientos próximos o vencidos.
 */
const iniciarPlanificador = () => {
  // Se ejecuta todos los días a las 08:00 AM
  // Formato cron: (minuto hora día_del_mes mes día_de_la_semana)
  cron.schedule('0 8 * * *', async () => {
    console.log('--- Iniciando escaneo diario de mantenimientos ---');
    await procesarMantenimientosPendientes();
    await procesarPreventivosProximos();
    console.log('--- Escaneo diario completado ---');
  });

  console.log('Programador de alertas tecdoit activado (Escaneo diario a las 08:00 AM)');
};

/**
 * Procesa la tabla 'mantenimientos' buscando registros no completados.
 */
const procesarMantenimientosPendientes = async () => {
  try {
    const { data: mantenimientos, error } = await supabase
      .from('mantenimientos')
      .select('*')
      .neq('estatus', 'Completado');

    if (error) throw error;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    for (const mant of mantenimientos) {
      if (!mant.fecha_programada) continue;

      const fechaProg = new Date(mant.fecha_programada);
      fechaProg.setHours(0, 0, 0, 0);

      const diffTime = fechaProg - hoy;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Periodicidad: 7, 3, 2, 1, 0 o vencido (< 0)
      if ([7, 3, 2, 1, 0].includes(diffDays) || diffDays < 0) {
        console.log(`Enviando recordatorio para equipo ${mant.clave_activo} (${diffDays} días restantes)`);
        await enviarRecordatorioMantenimiento(mant, diffDays);
      }
    }
  } catch (error) {
    console.error('Error al procesar mantenimientos pendientes:', error);
  }
};

/**
 * Procesa la tabla 'preventivo' buscando fechas próximas de mantenimiento.
 */
const procesarPreventivosProximos = async () => {
  try {
    const { data: preventivos, error } = await supabase
      .from('preventivo')
      .select('*, equipos(marca, modelo)');

    if (error) throw error;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    for (const prev of preventivos) {
      if (!prev.proxima_fecha) continue;

      const fechaProg = new Date(prev.proxima_fecha);
      fechaProg.setHours(0, 0, 0, 0);

      const diffTime = fechaProg - hoy;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Solo enviamos recordatorio si NO hay ya un registro en 'mantenimientos' para este equipo
      // que esté Abierto (para evitar duplicar correos si el usuario ya registró el ticket).
      const { data: mantActivo } = await supabase
        .from('mantenimientos')
        .select('id_mantenimiento')
        .eq('clave_activo', prev.clave_activo)
        .neq('estatus', 'Completado')
        .limit(1);

      if (mantActivo && mantActivo.length > 0) {
        // Si ya hay un ticket abierto en la tabla de mantenimientos, 
        // procesarMantenimientosPendientes() ya se encargará de avisar.
        continue;
      }

      if ([7, 3, 2, 1, 0].includes(diffDays) || diffDays < 0) {
        console.log(`Enviando recordatorio preventivo para equipo ${prev.clave_activo} (${diffDays} días restantes)`);
        await enviarRecordatorioMantenimiento({
          clave_activo: prev.clave_activo,
          tipo_mantenimiento: 'Preventivo Programado',
          descripcion: `Mantenimiento preventivo cíclico (intervalo: ${prev.intervalo_dias} días)`,
          fecha_programada: prev.proxima_fecha
        }, diffDays);
      }
    }
  } catch (error) {
    console.error('Error al procesar preventivos próximos:', error);
  }
};

module.exports = { iniciarPlanificador };
