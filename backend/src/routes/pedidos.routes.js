const express = require('express');
const ctrl = require('../controllers/pedidos.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/', requireAuth, ctrl.crear);
router.get('/activos', requireAuth, requireRole('admin', 'cajero', 'mesero'), ctrl.listarActivos);
router.get('/historial', requireAuth, ctrl.historialCliente);
router.get('/:id', requireAuth, ctrl.obtener);
router.patch('/:id/estado', requireAuth, requireRole('admin', 'cajero', 'mesero'), ctrl.actualizarEstado);
router.post('/:id/cancelar', requireAuth, requireRole('admin', 'cajero', 'mesero'), ctrl.cancelar);

module.exports = router;
