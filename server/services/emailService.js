const { Resend } = require('resend');
const supabase = require('../config/supabaseClient');

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Envía un correo de alerta de mantenimiento a todos los usuarios con alertas activas.
 * @param {Object} mantenimiento - Datos del mantenimiento.
 */
const enviarAlertaMantenimiento = async (mantenimiento) => {
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY no configurada en el entorno.");
    return;
  }

  try {
    // 1. Obtener usuarios que deben recibir alertas
    const { data: usuarios, error } = await supabase
      .from('usuarios')
      .select('correo, nombre_completo')
      .eq('recibe_alertas', true);

    if (error) throw error;

    if (!usuarios || usuarios.length === 0) {
      console.log("No hay usuarios configurados para recibir alertas.");
      return;
    }

    // 2. Preparar destinatarios
    const to = usuarios.map(u => u.correo);

    // 3. Enviar correo vía Resend
    const { data, error: sendError } = await resend.emails.send({
      from: 'tecdoit Alertas <onboarding@resend.dev>',
      to: to,
      subject: `⚠️ Alerta de Mantenimiento: ${mantenimiento.tipo_mantenimiento} - ${mantenimiento.clave_activo}`,
      html: `
        <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
          <h2 style="color: #d32f2f;">Nueva Alerta de Mantenimiento</h2>
          <p>Se ha registrado un nuevo evento de mantenimiento en el sistema:</p>
          <hr />
          <p><strong>Equipo:</strong> ${mantenimiento.clave_activo}</p>
          <p><strong>Tipo:</strong> ${mantenimiento.tipo_mantenimiento}</p>
          <p><strong>Descripción:</strong> ${mantenimiento.descripcion}</p>
          <p><strong>Fecha Programada:</strong> ${mantenimiento.fecha_programada || 'N/A'}</p>
          <hr />
          <p>Por favor, ingrese al panel de control de <strong>tecdoit</strong> para gestionar este registro.</p>
          <br />
          <small style="color: #777;">Este es un mensaje automático, por favor no responda a este correo.</small>
        </div>
      `,
    });

    if (sendError) {
      console.error("Error al enviar correo con Resend:", sendError);
    } else {
      console.log("Alerta de Resend enviada exitosamente. ID:", data.id);
    }

    return data;
  } catch (error) {
    console.error("Error en enviarAlertaMantenimiento (Resend):", error);
  }
};

/**
 * Envía un correo de recordatorio de mantenimiento (7, 3, 2, 1 días antes o el mismo día).
 * @param {Object} mantenimiento - Datos del mantenimiento.
 * @param {number} diasRestantes - Días que faltan para el mantenimiento.
 */
const enviarRecordatorioMantenimiento = async (mantenimiento, diasRestantes) => {
  if (!process.env.RESEND_API_KEY) return;

  try {
    const { data: usuarios } = await supabase
      .from('usuarios')
      .select('correo')
      .eq('recibe_alertas', true);

    if (!usuarios || usuarios.length === 0) return;

    const to = usuarios.map(u => u.correo);

    let tituloAlerta = '';
    let colorTitulo = '#1976d2'; // Azul por defecto

    if (diasRestantes > 0) {
      tituloAlerta = `Recordatorio: Falta(n) ${diasRestantes} día(s)`;
    } else if (diasRestantes === 0) {
      tituloAlerta = `⚠️ ¡Hoy es el día del mantenimiento!`;
      colorTitulo = '#d32f2f'; // Rojo
    } else {
      tituloAlerta = `🚨 ¡Mantenimiento VENCIDO!`;
      colorTitulo = '#b71c1c'; // Rojo oscuro
    }

    const { data, error } = await resend.emails.send({
      from: 'tecdoit Alertas <onboarding@resend.dev>',
      to: to,
      subject: `${tituloAlerta} - ${mantenimiento.clave_activo}`,
      html: `
        <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
          <h2 style="color: ${colorTitulo};">${tituloAlerta}</h2>
          <p>Recordatorio de mantenimiento programado para el equipo:</p>
          <hr />
          <p><strong>Equipo:</strong> ${mantenimiento.clave_activo}</p>
          <p><strong>Tipo:</strong> ${mantenimiento.tipo_mantenimiento}</p>
          <p><strong>Descripción:</strong> ${mantenimiento.descripcion}</p>
          <p><strong>Fecha Programada:</strong> ${mantenimiento.fecha_programada}</p>
          <hr />
          <p>Por favor, ingrese al sistema <strong>tecdoit</strong> para completar este mantenimiento lo antes posible.</p>
          <br />
          <small style="color: #777;">Este es un mensaje automático de seguimiento.</small>
        </div>
      `,
    });

    if (error) console.error("Error al enviar recordatorio:", error);
    return data;
  } catch (error) {
    console.error("Error en enviarRecordatorioMantenimiento:", error);
  }
};

module.exports = {
  enviarAlertaMantenimiento,
  enviarRecordatorioMantenimiento
};
