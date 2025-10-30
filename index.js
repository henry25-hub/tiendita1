require('dotenv').config();
const express = require('express');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const methodOverride = require('method-override');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const expressLayouts = require('express-ejs-layouts');
const isAuthenticated = require('./middleware/auth');
const { query } = require('./db');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;
const SECRET_KEY = process.env.JWT_SECRET;

if (!SECRET_KEY) {
  console.error("❌ JWT_SECRET no definido en .env");
  process.exit(1);
}

// 🧩 Configuración EJS + layouts
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// 🗂️ Archivos estáticos
app.use(express.static('public'));
app.use('/vendor/bootstrap', express.static(path.join(__dirname, 'node_modules/bootstrap/dist')));
app.use('/vendor/bootstrap-icons', express.static(path.join(__dirname, 'node_modules/bootstrap-icons')));

// 🌐 CORS
const allowedOrigins = [
  'http://localhost:5173',
  'https://tiendita1.onrender.com'
];
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS no permitido para esta URL'));
    }
  },
  credentials: true
};
app.use(cors(corsOptions));

// 🟦 Middlewares base
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'session_secret_default',
  resave: false,
  saveUninitialized: true
}));

// 🔐 Middleware JWT
const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    req.user = user;
    next();
  });
};

// 🔒 Filtro de IP
const ipChecker = (req, res, next) => {
  let clientIP = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
  if (clientIP && clientIP.includes(',')) clientIP = clientIP.split(',')[0].trim();

  const allowedIps = [
    '45.232.149.130',
    '181.176.231.194',
    '45.232.149.146',
    '127.0.0.1',
    '::1'
  ];

  console.log(`[IP CHECK] Intento desde ${clientIP}`);

  if (process.env.NODE_ENV !== 'production') return next();
  if (allowedIps.includes(clientIP)) next();
  else res.status(403).json({ message: 'Acceso denegado: IP no permitida' });
};

// 🧪 Test DB
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await query('SELECT NOW()');
    res.json({ status: '✅ Conexión exitosa a PostgreSQL', time: result.rows[0].now });
  } catch (err) {
    console.error('Error DB:', err);
    res.status(500).json({ error: '❌ Error en la conexión a la base de datos', detalle: err.message });
  }
});

// 📦 Importar rutas
const catalogoRoutes = require('./routes/catalogo');
const loginRoutes = require('./routes/login');
const registerRoutes = require('./routes/register');
const homeRoutes = require('./routes/home');
const productosRoutes = require('./routes/productos');
const categoriasRoutes = require('./routes/categorias');
const imagenesRoutes = require('./routes/imagenes');

// 🏠 Rutas
app.get('/', (req, res) => res.locals.isAuthenticated ? res.redirect('/home') : res.redirect('/catalogo'));
app.use('/catalogo', catalogoRoutes);
app.use('/login', loginRoutes);
app.use('/register', registerRoutes);
app.use('/home', requireAuth, ipChecker, homeRoutes);
app.use('/productos', requireAuth, ipChecker, productosRoutes);
app.use('/categorias', requireAuth, ipChecker, categoriasRoutes);
app.use('/imagenes', requireAuth, ipChecker, imagenesRoutes);

// 📘 Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true, swaggerOptions: { persistAuthorization: true } }));

// ❌ 404
app.use((req, res) => res.status(404).json({ mensaje: 'Ruta no encontrada' }));

// 🔥 500
app.use((err, req, res, next) => {
  console.error('Error no controlado:', err);
  res.status(500).json({ mensaje: 'Error interno del servidor' });
});

// 🚀 Servidor
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
  console.log(`📘 Swagger Docs disponibles en /api-docs`);
  console.log(`🗄️ Base de datos: ${process.env.DATABASE_URL}`);
});

module.exports = app;
