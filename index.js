require('dotenv').config();
const express = require('express');
const cors = require('cors');
const requestIp = require('request-ip');

const app = express();

// Middleware para detectar IP real
app.use(requestIp.mw());

// Solo se permite el acceso desde la red del Instituto Continental
const allowedIPs = [
  '45.232.149.130', // <-- Cambia esto por la IP pública del instituto
  '::1' // permite localhost para pruebas
];

// Middleware de control de acceso por IP
app.use((req, res, next) => {
  const clientIP = req.clientIp?.replace('::ffff:', '') || 'desconocida';
  console.log(`🕵️ Acceso desde: ${clientIP}`);

  if (!allowedIPs.includes(clientIP)) {
    return res.status(403).json({
      error: '❌ Acceso denegado: Solo se permite desde la red del Instituto Continental.'
    });
  }

  next();
});

// Configurar CORS (solo permite peticiones desde tu frontend)
app.use(cors({
  origin: [
    'https://admirable-fudge-d69549.netlify.app', // tu front
    'http://localhost:3000' // para pruebas locales
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('✅ Servidor activo. Solo accesible desde la red del Instituto Continental.');
});

// Puerto
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
