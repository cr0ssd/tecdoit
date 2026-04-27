// server/routes/preventivoRoutes.js

const express = require('express');
const router = express.Router();
const {
  obtenerConfigs,
  obtenerFechasCalendario,
  crearConfig,
  actualizarConfig,
  eliminarConfig,
} = require('../controllers/preventivoController');

router.get('/',             obtenerConfigs);
router.get('/calendario',   obtenerFechasCalendario);   // used by Dashboard calendar
router.post('/',            crearConfig);
router.put('/:clave',       actualizarConfig);
router.delete('/:clave',    eliminarConfig);

module.exports = router;
