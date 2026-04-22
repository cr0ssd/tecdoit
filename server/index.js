require('dotenv').config({ path: __dirname + '/.env' });

const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const mantenimientoRoutes = require('./routes/mantenimientoRoutes');
const proveedoresRoutes = require('./routes/proveedoresRoutes');
const equiposRoutes = require('./routes/equiposRoutes');

app.use('/api/mantenimientos', mantenimientoRoutes);
app.use('/api/proveedores', proveedoresRoutes);
app.use('/api/equipos', equiposRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor Express ejecutándose en el puerto ${PORT}`);
});
