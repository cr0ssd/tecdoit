const express = require('express');
const router = express.Router();
const { obtenerProveedores } = require('../controllers/proveedoresController');

router.get('/', obtenerProveedores);

module.exports = router;