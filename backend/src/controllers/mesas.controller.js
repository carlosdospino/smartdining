const { z } = require('zod');
const mesasService = require('../services/mesas.service');

const mesaSchema = z.object({
  numero: z.number().int().positive(),
  estado: z.enum(['libre', 'ocupada', 'reservada']).optional(),
});

async function listar(req, res) {
  try {
    const mesas = await mesasService.listar();
    return res.json({ mesas });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al listar mesas' });
  }
}

async function obtener(req, res) {
  try {
    const mesa = await mesasService.obtenerPorId(req.params.id);
    if (!mesa) return res.status(404).json({ error: 'Mesa no encontrada' });
    return res.json(mesa);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener mesa' });
  }
}

/**
 * GET /api/mesas/qr/:token — usado por frontend-cliente al escanear el QR.
 * NOTA/pendiente de coordinar con Roberto: este endpoint solo confirma que el
 * token corresponde a una mesa en PostgreSQL. La vigencia real (TTL) del
 * token vive en Redis, del lado del socket-server — falta acordar si ese
 * chequeo se hace aquí (consultando Redis desde el backend) o si el backend
 * confía en que Roberto ya validó el token antes de que la PWA llegue aquí.
 */
async function obtenerPorToken(req, res) {
  try {
    const mesa = await mesasService.obtenerPorToken(req.params.token);
    if (!mesa) return res.status(404).json({ error: 'Token de mesa inválido' });
    return res.json(mesa);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al validar token de mesa' });
  }
}

async function crear(req, res) {
  const parsed = mesaSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

  try {
    const mesa = await mesasService.crear(parsed.data);
    return res.status(201).json(mesa);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al crear mesa' });
  }
}

async function actualizarEstado(req, res) {
  const parsed = mesaSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

  try {
    const mesa = await mesasService.actualizarEstado(req.params.id, parsed.data.estado);
    if (!mesa) return res.status(404).json({ error: 'Mesa no encontrada' });
    return res.json(mesa);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al actualizar mesa' });
  }
}

async function eliminar(req, res) {
  try {
    const eliminada = await mesasService.eliminar(req.params.id);
    if (!eliminada) return res.status(404).json({ error: 'Mesa no encontrada' });
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al eliminar mesa' });
  }
}

module.exports = { listar, obtener, obtenerPorToken, crear, actualizarEstado, eliminar };
