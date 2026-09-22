const express = require('express');
const ctrl = require('../controllers/kds.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

// PENDIENTE DE ACORDAR CON EL EQUIPO: el plan de trabajo no define un rol
// "cocina" específico. Por ahora estas rutas exigen rol admin (el mismo que
// usaría la pantalla táctil compartida de cocina con una sola sesión). Si el
// equipo prefiere un rol propio (ej. "cocina"), es un cambio de una línea aquí.
const router = express.Router();

router.get('/comandas', requireAuth, requireRole('admin'), ctrl.comandasActivas);
router.patch('/comandas/:id/estado', requireAuth, requireRole('admin'), ctrl.cambiarEstado);

module.exports = router;
