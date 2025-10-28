const express = require("express");
const { query } = require("../db"); // usar nuestro pool optimizado
const router = express.Router();

// Detectar si la petición espera JSON
const isJsonRequest = (req) =>
  req.is("application/json") || req.headers.accept?.includes("application/json");

// ✅ GET /catalogo → lista de productos
router.get("/", async (req, res) => {
  try {
    const categoriaId = req.query.categoria || null;

    // Obtener categorías
    const categoriasResult = await query("SELECT id, nombre FROM categorias ORDER BY id");
    const categorias = categoriasResult.rows;

    // Obtener productos (filtrados o no)
    let sql = `
      SELECT p.id, p.nombre, p.precio, c.nombre AS categoria, ip.url AS imagen
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN imagenes_productos ip ON ip.producto_id = p.id
    `;
    const params = [];

    if (categoriaId) {
      sql += " WHERE c.id = $1";
      params.push(categoriaId);
    }

    const productosResult = await query(sql, params);
    const productos = productosResult.rows;

    // Si viene de API
    if (isJsonRequest(req)) {
      return res.status(200).json({ productos, categorias });
    }

    // Render en EJS
    res.render("catalogo/index", {
      layout: "layout",
      title: "Catálogo de Productos",
      categorias,
      productos,
      categoriaId,
    });
  } catch (err) {
    console.error("❌ Error en /catalogo:", err.message);

    const mensaje = "Ha ocurrido un error al cargar el catálogo.";
    if (isJsonRequest(req)) {
      return res.status(500).json({ error: mensaje, detalle: err.message });
    }

    res.status(500).render("error", {
      title: "Error al cargar catálogo",
      mensaje,
      error: err.message,
    });
  }
});

// ✅ GET /catalogo/:id → detalle de producto
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const productoResult = await query(
      `
      SELECT p.id, p.nombre, p.precio, c.nombre AS categoria
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.id = $1
      `,
      [id]
    );
    const producto = productoResult.rows[0];

    if (!producto) {
      const msg = "Producto no encontrado";
      if (isJsonRequest(req)) return res.status(404).json({ error: msg });
      return res.status(404).render("error", { title: msg, mensaje: msg });
    }

    const imagenesResult = await query(
      `SELECT * FROM imagenes_productos WHERE producto_id = $1`,
      [id]
    );
    const imagenes = imagenesResult.rows;

    if (isJsonRequest(req)) return res.status(200).json({ producto, imagenes });

    res.render("catalogo/detalle", {
      layout: "layout",
      title: producto.nombre,
      producto,
      imagenes,
    });
  } catch (err) {
    console.error("❌ Error en /catalogo/:id:", err.message);

    const mensaje = "Ha ocurrido un error al cargar el producto.";
    if (isJsonRequest(req)) {
      return res.status(500).json({ error: mensaje, detalle: err.message });
    }

    res.status(500).render("error", {
      title: "Error al cargar producto",
      mensaje,
      error: err.message,
    });
  }
});

module.exports = router;
