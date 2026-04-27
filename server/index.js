require('dotenv').config({ path: __dirname + '/.env' });

const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const mantenimientoRoutes = require('./routes/mantenimientoRoutes');
const proveedoresRoutes = require('./routes/proveedoresRoutes');
const equiposRoutes = require('./routes/equiposRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const usoEquiposRoutes = require('./routes/usoEquiposRoutes');
const inventarioRoutes = require('./routes/inventarioRoutes');
const preventivoRoutes   = require('./routes/preventivoRoutes');
const correctivoRoutes   = require('./routes/correctivoRoutes');
 
app.use('/api/mantenimientos', mantenimientoRoutes);
app.use('/api/proveedores', proveedoresRoutes);
app.use('/api/equipos', equiposRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/uso-equipos', usoEquiposRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/preventivo',  preventivoRoutes);
app.use('/api/correctivo',  correctivoRoutes);
  
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor Express ejecutándose en el puerto ${PORT}`);
});
