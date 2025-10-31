require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const requestIp = require('request-ip');

const app = express();

// Detectar IP real del cliente
app.use(requestIp.mw());

// ⚙️ Configurar vistas y archivos estáticos
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Lista de IPs permitidas
const allowedIPs = [
  '45.232.149.130', // IP pública del Instituto
  '::1',             // localhost IPv6
  '127.0.0.1'        // localhost IPv4
];

// 🧱 Middleware de control de acceso por IP (mejorado para Render)
app.use((req, res, next) => {
  // Render pasa la IP real en este encabezado
  const forwardedFor = req.headers['x-forwarded-for'];
  let clientIP = forwardedFor ? forwardedFor.split(',')[0] : req.clientIp;
  clientIP = clientIP?.replace('::ffff:', '') || 'desconocida';

  console.log(`🕵️ Intento de acceso desde: ${clientIP}`);

  // Verifica si coincide con alguna IP permitida
  const isAllowed = allowedIPs.some(ip => clientIP.includes(ip));

  if (!isAllowed) {
    return res.status(403).send(`
      <html>
        <head>
          <title>Acceso Restringido</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f5f5f5;
              color: #333;
              text-align: center;
              padding-top: 10%;
            }
            h1 { color: #b30000; }
          </style>
        </head>
        <body>
          <h1>❌ Acceso denegado</h1>
          <p>Este servicio solo está disponible desde la red del <b>Instituto Continental</b>.</p>
          <p>Tu IP detectada: <b>${clientIP}</b></p>
        </body>
      </html>
    `);
  }

  next();
});

// ⚙️ CORS
app.use(cors({
  origin: [
    'https://admirable-fudge-d69549.netlify.app',
    'http://localhost:3000'
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🏪 Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Puerto
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
