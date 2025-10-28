const express = require('express');
const router = express.Router();
const db = require('../db'); // tu pool de PostgreSQL

// Helper para detectar si la petición espera JSON
const isJson = (req) => req.is('application/json') || req.headers.accept?.includes('application/json');

// 📄 LISTAR PRODUCTOS + FILTRO POR CATEGORÍA
router.get('/', async (req, res) => {
  try {
    let query = `
      SELECT p.id, p.nombre, p.precio, c.nombre AS categoria
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
    `;
    const params = [];
    let categoriaId = null;

    if (req.query.categoria) {
      query += ' WHERE p.categoria_id = $1';
      params.push(req.query.categoria);
      categoriaId = Number(req.query.categoria);
    }

    query += ' ORDER BY p.id ASC';

    const { rows: productos } = await db.query(query, params);
    const { rows: categorias } = await db.query('SELECT * FROM categorias ORDER BY nombre ASC');

    res.render('productos/indexp', {
      productos,
      categorias,
      categoriaId,
      mensaje: req.query.mensaje || null,
      error: req.query.error || null,
      isAuthenticated: req.user ? true : false
    });
  } catch (err) {
    console.error('❌ Error al listar productos:', err.message);
    res.redirect('/productos?error=Error cargando productos');
  }
});

// 📄 FORMULARIO NUEVO PRODUCTO
router.get('/nuevop', async (req, res) => {
  try {
    const { rows: categorias } = await db.query('SELECT * FROM categorias ORDER BY nombre ASC');
    res.render('productos/nuevop', { categorias, mensaje: null, error: null, isAuthenticated: req.user ? true : false });
  } catch (err) {
    console.error('❌ Error al cargar formulario de nuevo producto:', err.message);
    res.redirect('/productos?error=Error al cargar formulario');
  }
});

// ✅ CREAR PRODUCTO
router.post('/', async (req, res) => {
  try {
    const { nombre, precio, categoria_id } = req.body;
    if (!nombre || !precio || !categoria_id) {
      return res.redirect(`/productos/nuevop?error=${encodeURIComponent('Todos los campos son obligatorios')}`);
    }

    const { rowCount } = await db.query('SELECT id FROM categorias WHERE id = $1', [categoria_id]);
    if (rowCount === 0) return res.redirect(`/productos/nuevop?error=${encodeURIComponent('Categoría no válida')}`);

    await db.query('INSERT INTO productos (nombre, precio, categoria_id) VALUES ($1, $2, $3)', [nombre.trim(), precio, categoria_id]);

    res.redirect(`/productos?mensaje=${encodeURIComponent('Producto creado correctamente')}`);
  } catch (err) {
    console.error('❌ Error al crear producto:', err.message);
    res.redirect('/productos/nuevop?error=Error al crear producto');
  }
});

// 📄 FORMULARIO EDITAR PRODUCTO
router.get('/editarp/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: productos } = await db.query('SELECT * FROM productos WHERE id = $1', [id]);
    if (productos.length === 0) return res.redirect(`/productos?error=${encodeURIComponent('Producto no encontrado')}`);

    const { rows: categorias } = await db.query('SELECT * FROM categorias ORDER BY nombre ASC');

    res.render('productos/editarp', { producto: productos[0], categorias, mensaje: null, error: null, isAuthenticated: req.user ? true : false });
  } catch (err) {
    console.error('❌ Error al cargar formulario de edición:', err.message);
    res.redirect('/productos?error=Error al cargar formulario');
  }
});

// ✅ ACTUALIZAR PRODUCTO (PUT con método override o POST desde form)
router.post('/editarp/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, precio, categoria_id } = req.body;

    const { rowCount } = await db.query('UPDATE productos SET nombre = $1, precio = $2, categoria_id = $3 WHERE id = $4', [nombre.trim(), precio, categoria_id, id]);

    if (rowCount === 0) return res.redirect(`/productos?error=${encodeURIComponent('Producto no encontrado')}`);

    res.redirect(`/productos?mensaje=${encodeURIComponent('Producto actualizado correctamente')}`);
  } catch (err) {
    console.error('❌ Error al actualizar producto:', err.message);
    res.redirect(`/productos/editarp/${req.params.id}?error=Error al actualizar producto`);
  }
});

// ✅ ELIMINAR PRODUCTO (desde indexp)
router.post('/:id/delete', async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await db.query('DELETE FROM productos WHERE id = $1', [id]);
    if (rowCount === 0) return res.redirect(`/productos?error=${encodeURIComponent('Producto no encontrado')}`);

    res.redirect(`/productos?mensaje=${encodeURIComponent('Producto eliminado correctamente')}`);
  } catch (err) {
    console.error('❌ Error al eliminar producto:', err.message);
    res.redirect(`/productos?error=Error al eliminar producto`);
  }
});

module.exports = router;
