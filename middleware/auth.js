const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'mi_secreto_ultra_seguro';

function isAuthenticated(req, res, next) {
  // Se busca token en cookie o header (para Postman)
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : req.cookies.token;

  // ❌ No hay token
  if (!token) {
    // Si la solicitud viene de Postman (API JSON)
    if (req.headers.accept?.includes('application/json')) {
      return res.status(403).json({ mensaje: 'Por favor inicia sesión' });
    }
    // Si viene del navegador (EJS)
    return res.redirect('/login?mensaje=Por favor inicia sesión');
  }

  try {
    // ✅ Verificar token
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    // ❌ Token expirado
    if (err.name === 'TokenExpiredError') {
      if (req.headers.accept?.includes('application/json')) {
        return res.status(401).json({ mensaje: 'Sesión expirada, inicia sesión de nuevo' });
      }
      res.clearCookie('token');
      return res.redirect('/login?mensaje=Sesión expirada, inicia sesión de nuevo');
    }

    // ❌ Token inválido
    if (req.headers.accept?.includes('application/json')) {
      return res.status(401).json({ mensaje: 'Token inválido' });
    }
    res.clearCookie('token');
    return res.redirect('/login?mensaje=Token inválido');
  }
}

module.exports = isAuthenticated;
