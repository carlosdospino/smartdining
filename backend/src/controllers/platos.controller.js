const { z } = require('zod');
const platosService = require('../services/platos.service');

const platoSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  precio: z.number().positive(),
  imagen_url: z.string().url().optional(),
  categoria_id: z.number().int(),
  disponible: z.boolean().optional(),
  personalizaciones: z.array(z.record(z.any())).optional(),
});

async function listar(req, res) {
  try {
    const platos = await platosService.listar(req.query.categoria_id);
    return res.json({ platos });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al listar platos' });
  }
}

async function obtener(req, res) {
  try {
    const plato = await platosService.obtenerPorId(req.params.id);
    if (!plato) return res.status(404).json({ error: 'Plato no encontrado' });
    return res.json(plato);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener plato' });
  }
}

async function crear(req, res) {
  const parsed = platoSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

  try {
    const plato = await platosService.crear(parsed.data);
    return res.status(201).json(plato);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al crear plato' });
  }
}

async function actualizar(req, res) {
  const parsed = platoSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

  try {
    const actual = await platosService.obtenerPorId(req.params.id);
    if (!actual) return res.status(404).json({ error: 'Plato no encontrado' });

    const plato = await platosService.actualizar(req.params.id, { ...actual, ...parsed.data });
    return res.json(plato);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al actualizar plato' });
  }
}

async function eliminar(req, res) {
  try {
    const eliminado = await platosService.eliminar(req.params.id);
    if (!eliminado) return res.status(404).json({ error: 'Plato no encontrado' });
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al eliminar plato' });
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
