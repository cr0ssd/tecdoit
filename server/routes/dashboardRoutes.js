const express = require('express');
const router  = express.Router();
const {
  obtenerEquiposDashboard,
  obtenerCostosMantenimientos,
  obtenerPrestamosActivos,
  obtenerNotificaciones,
  marcarNotificacionLeida,
  marcarTodasLeidas,
  obtenerReporteLaboratorio,
  obtenerLaboratoriosLista,
} = require('../controllers/dashboardController');

router.get('/equipos',                          obtenerEquiposDashboard);
router.get('/costos-mantenimientos',            obtenerCostosMantenimientos);
router.get('/prestamos-activos',                obtenerPrestamosActivos);
router.get('/notificaciones',                   obtenerNotificaciones);
router.patch('/notificaciones/:id/leer',        marcarNotificacionLeida);
router.patch('/notificaciones/leer-todas',      marcarTodasLeidas);
router.get('/laboratorios',                     obtenerLaboratoriosLista);
router.get('/reporte-laboratorio/:id',          obtenerReporteLaboratorio);

module.exports = router;