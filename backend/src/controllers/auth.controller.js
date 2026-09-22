const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const usuariosService = require('../services/usuarios.service');

// Roles del sistema, según el plan de trabajo: cliente (comensal) y personal
// del restaurante (mesero, cajero, admin).
const registerSchema = z.object({
  nombre: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  telefono: z.string().optional(),
  rol: z.enum(['cliente', 'mesero', 'cajero', 'admin']).default('cliente'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

function firmarToken(usuario) {
  return jwt.sign({ id: usuario.id, rol: usuario.rol }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
}

async function register(req, res) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }
  const { nombre, email, password, telefono, rol } = parsed.data;

  try {
    const existente = await usuariosService.buscarPorEmail(email);
    if (existente) {
      return res.status(400).json({ error: 'Ese email ya está registrado' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const usuario = await usuariosService.crear({ nombre, email, password_hash, rol, telefono });

    return res.status(201).json({ usuario, token: firmarToken(usuario) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al registrar usuario' });
  }
}

async function login(req, res) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }
  const { email, password } = parsed.data;

  try {
    const usuario = await usuariosService.buscarPorEmail(email);
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const passwordOk = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordOk) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    return res.json({
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
      token: firmarToken(usuario),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al iniciar sesión' });
  }
}

module.exports = { register, login };
