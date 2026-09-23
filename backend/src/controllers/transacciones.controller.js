const { z } = require('zod');
const transaccionesService = require('../services/transacciones.service');

// Columnas segun docs/modelo-er.md: metodo_pago, estado_transaccion y
// referencia_externa (la referencia de la pasarela de pago de Roberto).
// Los metodos son los de database/README.md de Jarrison.
const METODOS_PAGO = ['efectivo', 'tarjeta', 'transferencia'];

const pagoSchema = z.object({
  id_pedido: z.number().int(),
  monto: z.number().positive(),
  metodo_pago: z.enum(METODOS_PAGO),
  referencia_externa: z.string().optional(),
  estado_transaccion: z.enum(['aprobada', 'rechazada', 'pendiente']).optional(),
});

async function crear(req, res) {
  const parsed = pagoSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

  try {
    const transaccion = await transaccionesService.registrarPago({
      ...parsed.data,
      id_usuario: req.user.id_usuario,
    });
    return res.status(201).json(transaccion);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: 'Error al registrar el pago' });
  }
}

async function obtenerPorPedido(req, res) {
  try {
    const transacciones = await transaccionesService.obtenerPorPedido(req.params.id_pedido);
    return res.json({ transacciones });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener las transacciones' });
  }
}

module.exports = { crear, obtenerPorPedido, METODOS_PAGO };
