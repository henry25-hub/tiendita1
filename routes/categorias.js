const express = require('express');
const router = express.Router();
const db = require('../db'); // Pool de PostgreSQL

// Helper para detectar si la petición espera JSON
function isJson(req) {
  return req.is('application/json') || req.headers.accept?.includes('application/json');
}

// ✅ LISTAR CATEGORÍAS
router.get('/', async (req, res) => {
  try {
    const { rows: categorias } = await db.query('SELECT * FROM categorias ORDER BY id ASC');
    res.render('categorias/index', { 
      categorias, 
      mensaje: req.query.mensaje || null, 
      error: req.query.error || null 
    });
  } catch (err) {
    console.error('❌ Error al obtener categorías:', err);
    res.redirect('/categorias?error=Error cargando categorías');
  }
});

// ✅ FORMULARIO NUEVA CATEGORÍA
router.get('/nuevo', (req, res) => {
  res.render('categorias/nuevo', { mensaje: null, error: null, nombre: '' });
});

// ✅ CREAR CATEGORÍA
router.post('/', async (req, res) => {
  const { nombre } = req.body;
  if (!nombre || nombre.trim() === '') {
    return res.render('categorias/nuevo', { mensaje: null, error: 'El nombre de la categoría es obligatorio', nombre: '' });
  }

  try {
    await db.query('INSERT INTO categorias (nombre) VALUES ($1)', [nombre.trim()]);
    res.redirect(`/categorias?mensaje=${encodeURIComponent('Categoría agregada correctamente')}`);
  } catch (err) {
    console.error('❌ Error al crear categoría:', err);
    res.render('categorias/nuevo', { mensaje: null, error: 'Error al guardar categoría', nombre });
  }
});

// ✅ FORMULARIO EDITAR CATEGORÍA
router.get('/:id/editar', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await db.query('SELECT * FROM categorias WHERE id = $1', [id]);
    if (rows.length === 0) return res.redirect(`/categorias?error=${encodeURIComponent('Categoría no encontrada')}`);

    res.render('categorias/editar', { categoria: rows[0], mensaje: null, error: null });
  } catch (err) {
    console.error('❌ Error al cargar categoría:', err);
    res.redirect(`/categorias?error=${encodeURIComponent('Error al cargar categoría')}`);
  }
});

// ✅ ACTUALIZAR CATEGORÍA
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre } = req.body;

  if (!nombre || nombre.trim() === '') {
    return res.redirect(`/categorias/${id}/editar?error=${encodeURIComponent('El nombre de la categoría es obligatorio')}`);
  }

  try {
    const { rowCount } = await db.query('UPDATE categorias SET nombre = $1 WHERE id = $2', [nombre.trim(), id]);
    if (rowCount === 0) return res.redirect(`/categorias?error=${encodeURIComponent('Categoría no encontrada')}`);

    res.redirect(`/categorias?mensaje=${encodeURIComponent('Categoría actualizada correctamente')}`);
  } catch (err) {
    console.error('❌ Error al actualizar categoría:', err);
    res.redirect(`/categorias/${id}/editar?error=${encodeURIComponent('Error al actualizar categoría')}`);
  }
});

// ✅ ELIMINAR CATEGORÍA
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { rowCount } = await db.query('DELETE FROM categorias WHERE id = $1', [id]);
    if (rowCount === 0) return res.redirect(`/categorias?error=${encodeURIComponent('Categoría no encontrada')}`);

    res.redirect(`/categorias?mensaje=${encodeURIComponent('Categoría eliminada correctamente')}`);
  } catch (err) {
    console.error('❌ Error al eliminar categoría:', err);
    res.redirect(`/categorias?error=${encodeURIComponent('Error al eliminar categoría')}`);
  }
});

module.exports = router;
