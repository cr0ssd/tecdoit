require('dotenv').config({ path: __dirname + '/.env' });

const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const mantenimientoRoutes = require('./routes/mantenimientoRoutes');

app.use('/api/mantenimientos', mantenimientoRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor Express ejecutándose en el puerto ${PORT}`);
});