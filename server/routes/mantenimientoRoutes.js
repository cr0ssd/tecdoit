const express = require('express');
const router = express.Router();
const { obtenerMantenimientos, crearMantenimiento, completarMantenimiento } = require('../controllers/mantenimientoController');

router.get('/', obtenerMantenimientos);
router.post('/', crearMantenimiento);
router.patch('/:id/completar', completarMantenimiento);

module.exports = router;