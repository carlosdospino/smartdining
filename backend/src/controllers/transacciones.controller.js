const { z } = require('zod');
const transaccionesService = require('../services/transacciones.service');

const pagoSchema = z.object({
  pedido_id: z.number().int(),
  monto: z.number().positive(),
  id_transaccion_proveedor: z.string().optional(), // referencia de la pasarela de pago (módulo de Roberto)
  estado: z.enum(['aprobada', 'rechazada', 'pendiente']).optional(),
});

async function crear(req, res) {
  const parsed = pagoSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

  try {
    const transaccion = await transaccionesService.registrarPago(parsed.data);
    return res.status(201).json(transaccion);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: 'Error al registrar el pago' });
  }
}

async function obtenerPorPedido(req, res) {
  try {
    const transacciones = await transaccionesService.obtenerPorPedido(req.params.pedido_id);
    return res.json({ transacciones });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener las transacciones' });
  }
}

module.exports = { crear, obtenerPorPedido };
