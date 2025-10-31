require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const requestIp = require('request-ip');
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

const app = express();
const PORT = process.env.PORT || 10000;
const SECRET_KEY = process.env.JWT_SECRET;

// 🧩 Verificar variable JWT
if (!SECRET_KEY) {
  console.error("❌ JWT_SECRET no definido en .env");
  process.exit(1);
}

// ⚙️ Configurar vistas y layouts EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// 🗂️ Archivos estáticos
app.use(express.static('public'));
app.use('/vendor/bootstrap', express.static(path.join(__dirname, 'node_modules/bootstrap/dist')));
app.use('/vendor/bootstrap-icons', express.static(path.join(__dirname, 'node_modules/bootstrap-icons')));

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

// 🧭 Detectar IP real (Render + local)
app.use(requestIp.mw());

// ✅ Lista de IPs permitidas (puedes agregar más)
const allowedIPs = [
  '45.232.149.130', // IP pública del Instituto
  '45.232.149.146', // otra IP del Instituto (por si acaso)
  '127.0.0.1',      // localhost
  '::1'             // localhost IPv6
];

// 🔐 Middleware de control de acceso por IP
app.use((req, res, next) => {
  const forwarded = req.headers['x-forwarded-for'];
  let clientIP = forwarded ? forwarded.split(',')[0].trim() : req.clientIp;
  clientIP = clientIP?.replace('::ffff:', '') || 'desconocida';

  console.log(`🕵️ Intento de acceso desde: ${clientIP}`);

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

// ⚙️ CORS seguro
const allowedOrigins = [
  'https://pasteleria-1.onrender.com', // dominio Render
  'http://localhost:5173'              // entorno local
];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS no permitido'));
    }
  },
  credentials: true
}));

// 🔹 Middleware JWT global
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

// 🔹 Rutas importadas
const catalogoRoutes = require('./routes/catalogo');
const loginRoutes = require('./routes/login');
const registerRoutes = require('./routes/register');
const homeRoutes = require('./routes/home');
const productosRoutes = require('./routes/productos');
const categoriasRoutes = require('./routes/categorias');
const imagenesRoutes = require('./routes/imagenes');

// 🏠 Ruta raíz
app.get('/', (req, res) => {
  res.locals.isAuthenticated ? res.redirect('/home') : res.redirect('/catalogo');
});

// 🌍 Rutas públicas
app.use('/catalogo', catalogoRoutes);
app.use('/login', loginRoutes);
app.use('/register', registerRoutes);

// 🔒 Rutas privadas (requieren IP + JWT)
app.use('/home', isAuthenticated, ipFilter(allowedIPs), homeRoutes);
app.use('/productos', isAuthenticated, ipFilter(allowedIPs), productosRoutes);
app.use('/categorias', isAuthenticated, ipFilter(allowedIPs), categoriasRoutes);
app.use('/imagenes', isAuthenticated, ipFilter(allowedIPs), imagenesRoutes);

// 📘 Swagger Docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  swaggerOptions: { persistAuthorization: true }
}));

// ❌ 404 y 500
app.use((req, res) => res.status(404).render('error', { title: "Error 404", mensaje: 'Página no encontrada', error: null }));
app.use((err, req, res, next) => {
  console.error('Error no controlado:', err);
  res.status(500).render('error', { title: "Error del servidor", mensaje: 'Ocurrió un error interno.', error: null });
});

// 🚀 Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
  console.log(`📘 Swagger Docs: /api-docs`);
});
