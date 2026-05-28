const mailchimpTx = require("@mailchimp/mailchimp_transactional");

const mailchimpTransactional = mailchimpTx(process.env.MAILCHIMP_API_KEY);

const enviarCorreoMantenimiento = async (emailDestino, datosEquipo, diasRestantes) => {
  try {
    const response = await mailchimpTransactional.messages.send({
      message: {
        from_email: "notificaciones@tecdo.it", 
        subject: `Recordatorio: Mantenimiento en ${diasRestantes} día(s)`,
        to: [{ email: emailDestino, type: "to" }],
        text: `Hola, te recordamos que el equipo ${datosEquipo.marca} ${datosEquipo.modelo} (ID: ${datosEquipo.clave_activo}) tiene programado un mantenimiento en ${diasRestantes} día(s).`,
        html: `<h1>Aviso de Mantenimiento</h1>
               <p>El equipo <strong>${datosEquipo.marca} ${datosEquipo.modelo}</strong> requiere atención en ${diasRestantes} día(s).</p>
               <p>Fecha programada: ${datosEquipo.fecha_programada}</p>`,
      },
    });
    console.log(`Correo enviado a ${emailDestino}:`, response);
  } catch (error) {
    console.error("Error al enviar correo con Mailchimp:", error);
  }
};

module.exports = { enviarCorreoMantenimiento };