const express = require('express');
const router = express.Router();
const { obtenerRegistros, iniciarUso, finalizarUso } = require('../controllers/usoEquiposController');

router.get('/', obtenerRegistros);
router.post('/iniciar', iniciarUso);
router.patch('/:id/finalizar', finalizarUso);

module.exports = router;