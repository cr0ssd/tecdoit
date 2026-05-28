const cron = require('node-cron');
const supabase = require('../config/supabaseClient');
const { enviarCorreoMantenimiento } = require('./mailchimpService');

const iniciarWorkerNotificaciones = () => {
  // Se ejecuta todos los días a las 8:00 AM
  // TEMPORAL: Se ejecuta cada minuto para pruebas (Luego lo regresaremos a '0 8 * * *')
  cron.schedule('* * * * *', async () => {
    console.log('Ejecutando revisión diaria de mantenimientos...');

    try {
      // 1. Calcular fechas (Mañana y en 3 días)
      const hoy = new Date();
      const en1Dia = new Date(hoy); en1Dia.setDate(hoy.getDate() + 1);
      const en3Dias = new Date(hoy); en3Dias.setDate(hoy.getDate() + 3);

      const fechasABuscar = [
        en1Dia.toISOString().split('T')[0],
        en3Dias.toISOString().split('T')[0]
      ];

      // 2. Buscar mantenimientos abiertos en esas fechas
      const { data: mantenimientos, error } = await supabase
        .from('mantenimientos')
        .select('*, equipos(marca, modelo, clave_activo)')
        .in('fecha_programada', fechasABuscar)
        .eq('estatus', 'Abierto');

      if (error) throw error;

      // 3. Enviar correos a los administradores/usuarios configurados
      const { data: usuarios, error: errUsuarios } = await supabase
        .from('usuarios')
        .select('correo')
        .eq('recibe_alertas', true);

      if (errUsuarios) throw errUsuarios;

      const listaCorreos = usuarios?.map(u => u.correo) || ['admin@tecdoit.com'];

      for (const mant of mantenimientos) {
        const diasRestantes = mant.fecha_programada === fechasABuscar[0] ? 1 : 3;
        for (const email of listaCorreos) {
          await enviarCorreoMantenimiento(email, mant.equipos, diasRestantes);
        }
      }
    } catch (error) {
      console.error('Error en el worker de notificaciones:', error);
    }
  });
};

module.exports = iniciarWorkerNotificaciones;