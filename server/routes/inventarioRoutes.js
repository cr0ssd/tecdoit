const express = require('express');
const router = express.Router();
const {
  obtenerEquipos,
  obtenerLaboratorios,
  crearEquipo,
  actualizarEquipo,
  eliminarEquipo
} = require('../controllers/inventarioController');

router.get('/equipos', obtenerEquipos);
router.get('/laboratorios', obtenerLaboratorios);
router.post('/equipos', crearEquipo);
router.put('/equipos/:clave', actualizarEquipo);
router.delete('/equipos/:clave', eliminarEquipo);

module.exports = router;