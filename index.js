require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const methodOverride = require('method-override');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const expressLayouts = require('express-ejs-layouts');
const isAuthenticated = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 10000;

// =======================================================
// 🧩 CONFIGURACIÓN BASE
// =======================================================
app.set('trust proxy', true); // 🔹 NECESARIO para Render o cualquier proxy

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(cookieParser());
app.use(expressLayouts);

// =======================================================
// 🎯 CONFIGURACIÓN DE CORS
// =======================================================
const allowedOrigins = [
  'http://localhost:5173',
  'https://pasteleria-1.onrender.com',
  'https://admirable-fudge-d69549.netlify.app'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS bloqueado: origen no permitido'));
  },
  credentials: true
}));

// =======================================================
// 🔒 MIDDLEWARE DE FILTRO DE IP
// =======================================================
const allowedIPs = [
  '45.232.149.130',
  '45.232.149.146',
  '45.232.149.145'
];

app.use((req, res, next) => {
  let clientIP = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;

  // Normaliza IPv6 tipo "::ffff:45.232.149.146"
  if (clientIP.includes(',')) clientIP = clientIP.split(',')[0].trim();
  if (clientIP.includes('::ffff:')) clientIP = clientIP.split('::ffff:')[1];

  console.log('Cliente intentando conectar desde IP:', clientIP);

  if (allowedIPs.includes(clientIP)) {
    next(); // ✅ IP permitida
  } else {
    console.log('🚫 Bloqueado acceso desde IP no autorizada:', clientIP);
    return res.status(403).json({ message: '❌ Acceso denegado: IP no permitida' });
  }
});

// =======================================================
// 📄 CONFIGURACIÓN DE SESIÓN
// =======================================================
app.use(session({
  secret: process.env.SESSION_SECRET || 'clave_secreta',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // true si usas HTTPS
}));

// =======================================================
// 📚 SWAGGER (Documentación API)
// =======================================================
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// =======================================================
// 🌐 RUTAS DE PRUEBA Y PRINCIPALES
// =======================================================
app.get('/test', (req, res) => {
  res.json({ message: '✅ Conexión exitosa', ip: req.ip });
});

app.get('/', (req, res) => {
  res.send('🚀 Servidor de Pastelería corriendo correctamente.');
});

// =======================================================
// 🚀 INICIAR SERVIDOR
// =======================================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
});
