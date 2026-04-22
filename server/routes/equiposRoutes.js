const express = require('express');
const router = express.Router();
const { obtenerEquipos } = require('../controllers/equiposController');

router.get('/', obtenerEquipos);

module.exports = router;