// server/routes/correctivoRoutes.js

const express = require('express');
const router = express.Router();
const {
  obtenerTickets,
  obtenerTicketsPorEquipo,
  crearTicket,
  actualizarEstatus,
  cerrarTicket,
  obtenerSeguimiento,
  agregarSeguimiento,
} = require('../controllers/correctivoController');

router.get('/',                               obtenerTickets);
router.get('/equipo/:clave',                  obtenerTicketsPorEquipo);
router.post('/',                              crearTicket);
router.patch('/:id/estatus',                  actualizarEstatus);
router.patch('/:id/cerrar',                   cerrarTicket);
router.get('/:id/seguimiento',                obtenerSeguimiento);
router.post('/:id/seguimiento',               agregarSeguimiento);

module.exports = router;
