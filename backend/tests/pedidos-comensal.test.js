const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { instalarFakeDb, tokenComensal, tokenStaff } = require('./helpers/fake-db');
const app = require('../server');

const PLATO = { precio: '28000', disponible: true };

// Responde lo mínimo que necesita crearConDetalles para llegar al COMMIT.
function responderCreacionOk(sql) {
  if (sql.includes('FROM platos')) return { rows: [PLATO] };
  if (sql.includes('INSERT INTO pedidos')) {
    return { rows: [{ id_pedido: 87, id_mesa: 5, codigo_pedido: 'PED-260922-ABC123', estado: 'recibido', total: '56000' }] };
  }
  return { rows: [] };
}

test('un comensal no puede crear un pedido para otra mesa: se usa el id_mesa del token', async () => {
  const db = instalarFakeDb(responderCreacionOk);
  try {
    const res = await request(app)
      .post('/api/pedidos')
      .set('Authorization', `Bearer ${tokenComensal(5)}`)
      .send({
        id_mesa: 9, // intento de pedir a nombre de la mesa 9
        items: [{ id_plato: 12, cantidad: 2, apodo: 'Ana' }],
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.id_mesa, 5, 'el pedido queda en la mesa del token');

    const insert = db.buscar('INSERT INTO pedidos');
    assert.ok(insert, 'debe insertarse el pedido');
    assert.strictEqual(insert.params[0], 5, 'el id_mesa del body (9) se ignora');
    assert.ok(!insert.params.includes(9));
  } finally {
    db.restaurar();
  }
});

test('el apodo del comensal se guarda en detalles_pedido.notas_especiales', async () => {
  const db = instalarFakeDb(responderCreacionOk);
  try {
    const res = await request(app)
      .post('/api/pedidos')
      .set('Authorization', `Bearer ${tokenComensal(5)}`)
      .send({ items: [{ id_plato: 12, cantidad: 2, apodo: 'Ana', notas: 'sin cebolla' }] });

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.codigo_pedido, 'el pedido trae un codigo_pedido');

    const detalle = db.buscar('INSERT INTO detalles_pedido');
    assert.ok(detalle);
    // (id_pedido, id_plato, cantidad, precio_unitario, subtotal, notas_especiales, estado_item)
    assert.strictEqual(detalle.params[4], 56000, 'subtotal = precio_unitario * cantidad');
    assert.strictEqual(detalle.params[5], 'Ana: sin cebolla');
    assert.strictEqual(detalle.params[6], 'pendiente');
  } finally {
    db.restaurar();
  }
});

test('el pedido de un comensal deja id_usuario null en historial_estados', async () => {
  const db = instalarFakeDb(responderCreacionOk);
  try {
    await request(app)
      .post('/api/pedidos')
      .set('Authorization', `Bearer ${tokenComensal(5)}`)
      .send({ items: [{ id_plato: 12, cantidad: 1, apodo: 'Ana' }] });

    const historial = db.buscar('INSERT INTO historial_estados');
    assert.ok(historial);
    assert.strictEqual(historial.params[1], null, 'un comensal no tiene id_usuario');
  } finally {
    db.restaurar();
  }
});

test('un mesero debe mandar el id_mesa en el body', async () => {
  const db = instalarFakeDb(responderCreacionOk);
  try {
    const res = await request(app)
      .post('/api/pedidos')
      .set('Authorization', `Bearer ${tokenStaff(3, 'mesero')}`)
      .send({ items: [{ id_plato: 12, cantidad: 1 }] });

    assert.strictEqual(res.status, 400);
    assert.match(res.body.error, /id_mesa/);
  } finally {
    db.restaurar();
  }
});

test('un cajero no puede crear pedidos', async () => {
  const res = await request(app)
    .post('/api/pedidos')
    .set('Authorization', `Bearer ${tokenStaff(4, 'cajero')}`)
    .send({ id_mesa: 5, items: [{ id_plato: 12, cantidad: 1 }] });

  assert.strictEqual(res.status, 403);
});

test('un comensal no puede consultar un pedido de otra mesa', async () => {
  const db = instalarFakeDb((sql) =>
    sql.includes('FROM pedidos') ? { rows: [{ id_pedido: 99, id_mesa: 9, estado: 'recibido' }] } : { rows: [] }
  );
  try {
    const res = await request(app)
      .get('/api/pedidos/99')
      .set('Authorization', `Bearer ${tokenComensal(5)}`);

    assert.strictEqual(res.status, 403);
  } finally {
    db.restaurar();
  }
});
