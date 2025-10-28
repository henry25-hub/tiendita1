const express = require('express');
const router = express.Router();
const db = require('../db'); // tu pool de PostgreSQL
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Helper para detectar si la petición espera JSON
function isJson(req) {
  return req.is('application/json') || req.headers.accept?.includes('application/json');
}

// 🧩 Multer configuración
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const carpeta = 'public/imagenes/productos/';
    if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta, { recursive: true });
    cb(null, carpeta);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// 🔹 Obtener todas las categorías
async function obtenerCategorias() {
  const { rows } = await db.query('SELECT * FROM categorias ORDER BY nombre ASC');
  return rows;
}

// 🔹 Redirigir raíz
router.get('/', (req, res) => {
  res.redirect('/imagenes/nuevoi');
});

// 🧾 Formulario nuevo
router.get('/nuevoi', async (req, res) => {
  try {
    const categorias = await obtenerCategorias();
    res.render('imagenes/nuevoi', {
      categorias,
      mensaje: req.query.mensaje || null,
      error: req.query.error || null,
      productos: [],       // Inicial vacío para filtro
      categoriaId: null
    });
  } catch (err) {
    console.error(err);
    res.redirect('/imagenes?error=Error al cargar formulario de imágenes');
  }
});

// 🧭 Filtrar productos por categoría (usado en el form)
router.get('/productos', async (req, res) => {
  try {
    const { categoria } = req.query;
    let productos = [];
    if (categoria) {
      const { rows } = await db.query('SELECT id, nombre FROM productos WHERE categoria_id = $1 ORDER BY nombre ASC', [categoria]);
      productos = rows;
    }
    const categorias = await obtenerCategorias();
    res.render('imagenes/nuevoi', {
      categorias,
      productos,
      categoriaId: categoria || null,
      mensaje: null,
      error: productos.length === 0 && categoria ? 'No hay productos para esta categoría' : null
    });
  } catch (err) {
    console.error(err);
    res.redirect('/imagenes?error=Error al filtrar productos');
  }
});

// 📤 Guardar imagen
router.post('/', upload.single('imagen'), async (req, res) => {
  try {
    const { producto_id } = req.body;
    if (!req.file) return res.redirect(`/imagenes/nuevoi?error=Debe subir una imagen`);

    const url = '/imagenes/productos/' + req.file.filename;
    await db.query('INSERT INTO imagenes_productos (url, producto_id) VALUES ($1, $2)', [url, producto_id]);

    res.redirect(`/imagenes/nuevoi?mensaje=Imagen agregada correctamente`);
  } catch (err) {
    console.error(err);
    res.redirect('/imagenes/nuevoi?error=Error al agregar imagen');
  }
});

// ✏️ Editar imagen
router.put('/:id', upload.single('imagen'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.redirect(`/imagenes/nuevoi?error=Debe subir una nueva imagen`);

    const { rows } = await db.query('SELECT url FROM imagenes_productos WHERE id = $1', [id]);
    if (!rows.length) return res.redirect(`/imagenes/nuevoi?error=Imagen no encontrada`);

    // Borrar archivo anterior
    const rutaAnterior = 'public' + rows[0].url;
    if (fs.existsSync(rutaAnterior)) fs.unlinkSync(rutaAnterior);

    const url = '/imagenes/productos/' + req.file.filename;
    await db.query('UPDATE imagenes_productos SET url=$1 WHERE id=$2', [url, id]);

    res.redirect(`/imagenes/nuevoi?mensaje=Imagen actualizada correctamente`);
  } catch (err) {
    console.error(err);
    res.redirect('/imagenes/nuevoi?error=Error al actualizar imagen');
  }
});

// 🗑️ Eliminar imagen
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query('SELECT url FROM imagenes_productos WHERE id = $1', [id]);
    if (!rows.length) return res.redirect(`/imagenes/nuevoi?error=Imagen no encontrada`);

    const rutaArchivo = 'public' + rows[0].url;
    if (fs.existsSync(rutaArchivo)) fs.unlinkSync(rutaArchivo);

    await db.query('DELETE FROM imagenes_productos WHERE id=$1', [id]);
    res.redirect(`/imagenes/nuevoi?mensaje=Imagen eliminada correctamente`);
  } catch (err) {
    console.error(err);
    res.redirect('/imagenes/nuevoi?error=Error al eliminar imagen');
  }
});

module.exports = router;
