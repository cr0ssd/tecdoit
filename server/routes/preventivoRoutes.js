// server/routes/preventivoRoutes.js

const express = require('express');
const router = express.Router();
const {
  obtenerPreventivos,
  obtenerFechasCalendario,
  crearPreventivo,
  completarPreventivo,
} = require('../controllers/preventivoController');

router.get('/',              obtenerPreventivos);
router.get('/calendario',    obtenerFechasCalendario);
router.post('/',             crearPreventivo);
router.patch('/:id/completar', completarPreventivo);

module.exports = router;