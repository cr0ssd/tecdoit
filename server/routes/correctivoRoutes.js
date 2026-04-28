// server/routes/correctivoRoutes.js

const express = require('express');
const router = express.Router();
const {
  obtenerTickets,
  obtenerTicketsPorEquipo,
  crearTicket,
  actualizarEstatus,
  completarTicket,
} = require('../controllers/correctivoController');

router.get('/',                    obtenerTickets);
router.get('/equipo/:clave',       obtenerTicketsPorEquipo);
router.post('/',                   crearTicket);
router.patch('/:id/estatus',       actualizarEstatus);
router.patch('/:id/completar',     completarTicket);

module.exports = router;