// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const requestIp = require('request-ip');

const app = express();

// 🧠 Detectar IP real del cliente
app.use(requestIp.mw());

// 🔒 Lista de IPs bloqueadas
const blockedIPs = ['179.6.72.125']; // agrega aquí las IPs a bloquear

// 🛡️ Middleware de bloqueo
app.use((req, res, next) => {
  const clientIP = req.clientIp?.replace('::ffff:', '') || 'desconocida';
  console.log(`🕵️ Intento de acceso desde: ${clientIP}`);

  if (blockedIPs.includes(clientIP)) {
    return res.status(403).json({ error: 'Acceso denegado: tu IP está bloqueada.' });
  }
  next();
});

// 🌐 CORS configurado
const allowedOrigins = [
  'http://localhost:3000',
  'https://tu-dominio.com'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`❌ CORS bloqueado para: ${origin}`);
      callback(new Error('Origen no permitido por CORS'));
    }
  },
  credentials: true
}));

// 📦 Middlewares básicos
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🚀 Ruta principal
app.get('/', (req, res) => {
  res.send('✅ Servidor corriendo correctamente y con detección de IP activa.');
});

// ⚙️ Puerto
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
