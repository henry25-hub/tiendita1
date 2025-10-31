require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

// ===== CONFIGURACIÓN BASE =====
const PORT = process.env.PORT || 10000;
app.set('trust proxy', true); // Importante para Render o proxy inverso

// ===== CORS (seguro) =====
const allowedOrigins = [
  'http://localhost:5173',
  'https://admirable-fudge-d69549.netlify.app' // Tu frontend
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS bloqueado: origen no permitido'));
  },
  credentials: true,
}));

app.use(express.json());

// ===== LISTA DE IPs PERMITIDAS =====
const allowedIPs = [
  '45.232.149.130',
  '45.232.149.145',
  '45.232.149.146',
  '179.6.72.125' // 👈 Tu IP actual
];

// ===== MIDDLEWARE DE FILTRO DE IP =====
app.use((req, res, next) => {
  let clientIP =
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.socket.remoteAddress ||
    req.ip;

  // Limpieza de formato "::ffff:179.6.72.125"
  if (clientIP.includes('::ffff:')) {
    clientIP = clientIP.replace('::ffff:', '');
  }

  console.log('🛰 IP detectada:', clientIP);

  // Detecta IPs internas (Render, VPN o localhost)
  const isInternalIP =
    clientIP.startsWith('10.') ||
    clientIP.startsWith('172.') ||
    clientIP.startsWith('192.') ||
    clientIP === '127.0.0.1' ||
    clientIP === '::1';

  if (isInternalIP) {
    console.log('⚠️ IP interna detectada — acceso permitido automáticamente.');
    return next();
  }

  if (allowedIPs.includes(clientIP)) {
    console.log('✅ IP permitida:', clientIP);
    next();
  } else {
    console.log('🚫 Acceso bloqueado desde IP no permitida:', clientIP);
    return res.status(403).json({
      message: '❌ Acceso denegado: IP no permitida',
      ipDetectada: clientIP
    });
  }
});

// ===== RUTAS DE PRUEBA =====

// Ruta simple de prueba
app.get('/test', (req, res) => {
  res.json({
    message: 'Servidor activo y protegido 🔒',
    ipDetectada: req.headers['x-forwarded-for'] || req.ip,
    fecha: new Date()
  });
});

// Ruta de depuración (para ver todo lo que Render envía)
app.get('/debug/ip', (req, res) => {
  res.json({
    headers: {
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-real-ip': req.headers['x-real-ip'],
    },
    remoteAddress: req.socket.remoteAddress,
    ip: req.ip,
    mensaje: 'Ruta de depuración IP: muestra todas las formas de IP detectadas por Render/VPN'
  });
});

// ===== INICIO SERVIDOR =====
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`🧠 Revisa /test o /debug/ip para verificar IP detectada`);
});
