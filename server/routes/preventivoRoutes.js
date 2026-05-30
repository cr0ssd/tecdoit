// server/routes/preventivoRoutes.js

const express = require('express');
const router  = express.Router();

const {
  // Legacy
  obtenerPreventivos,
  obtenerFechasCalendario,
  crearPreventivoLegacy,
  completarPreventivoLegacy,
  // New
  obtenerConfigs,
  crearConfig,
  actualizarConfig,
  eliminarConfig,
  completarConfig,
} = require('../controllers/preventivoController');

// ── Legacy routes (kept for backwards compatibility) ──────────────
router.get(   '/legacy',                   obtenerPreventivos);
router.get(   '/calendario',               obtenerFechasCalendario);
router.post(  '/legacy',                   crearPreventivoLegacy);
router.patch( '/legacy/:id/completar',     completarPreventivoLegacy);

// ── New routes (used by Preventivo.jsx) ───────────────────────────
router.get(   '/',                         obtenerConfigs);
router.post(  '/',                         crearConfig);
router.put(   '/:clave',                   actualizarConfig);
router.delete('/:clave',                   eliminarConfig);
router.patch( '/:clave/completar',         completarConfig);

module.exports = router;