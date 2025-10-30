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
app.use('/vendor/bootstrap-icons', express.static(path.join(__dirname, 'node_modules/bootstrap-icons/dist')));

// --- NUEVO: AÑADIR CORS ---
const cors = require('cors');
const allowedOrigins = [
  'http://localhost:5173', // Para desarrollo local
  'https://tiendita1.onrender.com' // Para tu frontend desplegado
];
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    const message = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(message), false);
  }
};
app.use(cors(corsOptions));

// 🟦 Middleware base
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'session_secret_default',
  resave: false,
  saveUninitialized: true
}));

// --- NUEVO: AÑADIR MIDDLEWARE DE AUTENTICACIÓN (JWT) ---
const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// --- NUEVO: AÑADIR MIDDLEWARE DE FILTRO DE IP ---
const ipFilter = (req, res, next) => {
  let clientIP = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
  if (clientIP && clientIP.includes(',')) {
    clientIP = clientIP.split(',')[0].trim();
  }

  const allowedIps = [
    '45.232.149.130',
    '181.176.231.194',
    '45.232.149.146'
  ];

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DEV] Modo Desarrollo. Filtro de IP desactivado.`);
    return next();
  }

  console.log(`[PROD] Verificando IP: ${clientIP}`);
  if (allowedIps.includes(clientIP)) {
    console.log(`[PROD] ACCESO PERMITIDO para la IP: ${clientIP}`);
    next();
  } else {
    console.log(`[PROD] ACCESO DENEGADO para la IP: ${clientIP}`);
    res.status(403).json({ message: 'Acceso denegado: IP no permitida' });
  }
};

// --- Rutas de prueba ---
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await query('SELECT NOW()');
    res.json({ status: '✅ Conexión exitosa a PostgreSQL', time: result.rows[0].now });
  } catch (err) {
    console.error('Error DB:', err);
    res.status(500).json({ error: '❌ Error en la conexión a la base de datos', detalle: err.message });
  }
});

// 🚀 Importar rutas
const catalogoRoutes = require('./routes/catalogo');
const loginRoutes = require('./routes/login');
const registerRoutes = require('./routes/register');
const homeRoutes = require('./routes/home');
const productosRoutes = require('./routes/productos');
const categoriasRoutes = require('./routes/categorias');
const imagenesRoutes = require('./routes/imagenes');

// 🏠 Ruta raíz
app.get('/', (req, res) => res.locals.isAuthenticated ? res.redirect('/home') : res.redirect('/catalogo'));

// 🌍 Rutas públicas (sin restricción de IP)
app.use('/catalogo', catalogoRoutes);
app.use('/login', loginRoutes);
app.use('/register', registerRoutes);

// 🔒 Rutas privadas (PROTEGIDAS POR JWT + FILTRO DE IP)
app.use('/home', requireAuth, ipFilter, homeRoutes);
app.use('/productos', requireAuth, ipFilter, productosRoutes);
app.use('/categorias', requireAuth, ipFilter, categoriasRoutes);
app.use('/imagenes', requireAuth, ipFilter, imagenesRoutes);

// 📘 Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  swaggerOptions: { persistAuthorization: true }
}));

// ❌ Error 404
app.use((req, res) => {
  const isJson = req.headers.accept?.includes('application/json');
  return isJson
    ? res.status(404).json({ mensaje: 'Ruta no encontrada' })
    : res.status(404).render('error', { title: "Error 404", mensaje: 'Página no encontrada', error: null });
});

// 🔥 Error 500
app.use((err, req, res, next) => {
  console.error('Error no controlado:', err);
  const isJson = req.headers.accept?.includes('application/json');
  return isJson
    ? res.status(500).json({ mensaje: 'Error interno del servidor', error: 'Ocurrió un error. Intente nuevamente.' })
    : res.status(500).render('error', { title: "Error del servidor", mensaje: 'Ocurrió un error. Intente nuevamente.', error: null });
});

// 🚀 Iniciar servidor
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
  console.log(`📘 Swagger Docs disponibles en /api-docs`);
  console.log(`🗄️ Base de datos: ${process.env.DATABASE_URL}`);
});

module.exports = app;
