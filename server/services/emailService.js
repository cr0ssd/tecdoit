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
    // Nota: Si usas el dominio gratuito de Resend, solo puedes enviar a tu propio correo verificado.
    // Una vez verifiques tu dominio, podrás enviar a cualquier correo.
    const { data, error: sendError } = await resend.emails.send({
      from: 'TecDoIt Alertas <onboarding@resend.dev>', // Cambiar por tu correo verificado cuando lo tengas
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
          <p>Por favor, ingrese al panel de control de <strong>TecDoIt</strong> para gestionar este registro.</p>
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

module.exports = {
  enviarAlertaMantenimiento
};
