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
const ipFilter = require('./middleware/ipFilter');
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

// 🌍 CORS (Render + Netlify + localhost)
const allowedOrigins = [
  'http://localhost:5173',
  'https://pasteleria-1.onrender.com',
  'https://admirable-fudge-d69549.netlify.app' // ✅ tu frontend Netlify
];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS bloqueado para esta URL'));
    }
  },
  credentials: true
}));

// 🔒 Bloqueo de IPs externas
app.use((req, res, next) => {
  let clientIP = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;

  // Si viene en formato "ip, ip", toma solo la primera
  if (clientIP && clientIP.includes(',')) {
    clientIP = clientIP.split(',')[0].trim();
  }

  // Lista de IPs válidas (tu red local o IP pública)
  const allowedIPs = [
    '45.232.149.146', // ✅ tu IP
    '127.0.0.1',      // localhost
    '::1'             // IPv6 localhost
  ];

  if (allowedIPs.includes(clientIP)) {
    next();
  } else {
    console.warn(`🚫 IP no permitida: ${clientIP}`);
    res.status(403).json({ message: 'Acceso denegado: IP no permitida' });
  }
});

// 🔹 Middleware global de autenticación (JWT)
app.use((req, res, next) => {
  const token = req.cookies.token;

  if (token) {
    try {
      const decoded = jwt.verify(token, SECRET_KEY);
      res.locals.isAuthenticated = true;
      res.locals.user = decoded;
    } catch {
      res.locals.isAuthenticated = false;
      res.locals.user = null;
    }
  } else {
    res.locals.isAuthenticated = false;
    res.locals.user = null;
  }

  res.locals.isLoginPage = req.path.startsWith('/login') || req.path.startsWith('/register');
  res.locals.title = "Cake Sweet";
  res.locals.error = null;
  res.locals.mensaje = null;
  next();
});

// 🔹 Rutas de prueba
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await query('SELECT NOW()');
    res.json({ status: '✅ Conexión exitosa a PostgreSQL', time: result.rows[0].now });
  } catch (err) {
    console.error('Error DB:', err);
    res.status(500).json({ error: '❌ Error en la conexión a la base de datos', detalle: err.message });
  }
});

app.get('/api/test-cors', (req, res) => {
  res.json({ status: "OK", origin: req.headers.origin, message: "CORS funcionando correctamente 🚀" });
});

// 🚀 Importar rutas
const catalogoRoutes = require('./routes/catalogo');
const loginRoutes = require('./routes/login');
const registerRoutes = require('./routes/register');
const homeRoutes = require('./routes/home');
const productosRoutes = require('./routes/productos');
const categoriasRoutes = require('./routes/categorias');
const imagenesRoutes = require('./routes/imagenes');

const allowedIps = process.env.ALLOWED_IPS?.split(',') || [];

// 🏠 Ruta raíz
app.get('/', (req, res) => res.locals.isAuthenticated ? res.redirect('/home') : res.redirect('/catalogo'));

// 🌍 Rutas públicas
app.use('/catalogo', catalogoRoutes);
app.use('/login', loginRoutes);
app.use('/register', registerRoutes);

// 🔒 Rutas privadas
app.use('/home', isAuthenticated, ipFilter(allowedIps), homeRoutes);
app.use('/productos', isAuthenticated, ipFilter(allowedIps), productosRoutes);
app.use('/categorias', isAuthenticated, ipFilter(allowedIps), categoriasRoutes);
app.use('/imagenes', isAuthenticated, ipFilter(allowedIps), imagenesRoutes);

// 📘 Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true, swaggerOptions: { persistAuthorization: true }}));

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

