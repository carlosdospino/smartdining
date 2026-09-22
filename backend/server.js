require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./src/routes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', routes);

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

const PORT = process.env.PORT || 4000;

if (require.main === module) {
  app.listen(PORT, () => console.log(`SmartDining backend corriendo en http://localhost:${PORT}`));
}

module.exports = app; // exportado para las pruebas con supertest
