const { z } = require('zod');
const pedidosService = require('../services/pedidos.service');

const itemSchema = z.object({
  plato_id: z.number().int(),
  cantidad: z.number().int().positive(),
  personalizacion: z.record(z.any()).optional(),
});

const crearPedidoSchema = z.object({
  mesa_id: z.number().int(),
  items: z.array(itemSchema).min(1),
});

async function crear(req, res) {
  const parsed = crearPedidoSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

  try {
    const pedido = await pedidosService.crearConDetalles({
      mesa_id: parsed.data.mesa_id,
      cliente_id: req.user.id,
      items: parsed.data.items,
    });
    // NOTA para Roberto: aquí es donde se debe emitir 'order:created' hacia
    // el socket-server, para que llegue al KDS y al panel admin en vivo.
    return res.status(201).json({ pedido_id: pedido.id, estado: pedido.estado, total: pedido.total });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: 'Error al crear el pedido' });
  }
}

async function listarActivos(req, res) {
  try {
    const pedidos = await pedidosService.listarActivos();
    return res.json({ pedidos });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al listar pedidos activos' });
  }
}

async function obtener(req, res) {
  try {
    const pedido = await pedidosService.obtenerConDetalles(req.params.id);
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
    return res.json(pedido);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener el pedido' });
  }
}

async function actualizarEstado(req, res) {
  const { estado, observacion } = req.body;
  if (!pedidosService.ESTADOS_VALIDOS.includes(estado)) {
    return res.status(400).json({
      error: `Estado inválido. Usa uno de: ${pedidosService.ESTADOS_VALIDOS.join(', ')}`,
    });
  }

  try {
    const pedido = await pedidosService.actualizarEstado(req.params.id, estado, observacion);
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
    // NOTA para Roberto: aquí se dispara 'order:status' hacia cliente y KDS.
    return res.json(pedido);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al actualizar el estado del pedido' });
  }
}

async function cancelar(req, res) {
  req.body.estado = 'cancelado';
  return actualizarEstado(req, res);
}

async function historialCliente(req, res) {
  try {
    const pedidos = await pedidosService.historialPorCliente(req.user.id);
    return res.json({ pedidos });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener historial de pedidos' });
  }
}

module.exports = { crear, listarActivos, obtener, actualizarEstado, cancelar, historialCliente };
