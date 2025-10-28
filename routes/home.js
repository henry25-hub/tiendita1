/**
 * @swagger
 * tags:
 *   name: Home
 *   description: Dashboard privado del usuario autenticado
 */

/**
 * @swagger
 * /home:
 *   get:
 *     summary: Ver dashboard (requiere token JWT)
 *     tags: [Home]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard cargado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                   example: "Bienvenido al panel principal"
 *                 usuario:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 6
 *                     usuario:
 *                       type: string
 *                       example: "jhamy"
 *       401:
 *         description: Usuario no autenticado o token inválido
 */

const express = require("express");
const db = require("../db"); // PostgreSQL pool
const router = express.Router();

// GET /home → dashboard protegido
router.get("/", async (req, res) => {
  try {
    // req.user debe venir del middleware de autenticación JWT
    const { rows } = await db.query(
      "SELECT id, usuario FROM usuarios WHERE id = $1",
      [req.user.id]
    );

    if (rows.length === 0) {
      if (req.headers.accept?.includes("application/json")) {
        return res.status(401).json({ mensaje: "Usuario no encontrado" });
      }
      return res.redirect("/login?mensaje=Usuario no encontrado");
    }

    const usuario = rows[0];

    // Respuesta JSON (API/Swagger/Postman)
    if (req.headers.accept?.includes("application/json")) {
      return res.status(200).json({
        mensaje: "Bienvenido al panel principal",
        usuario,
      });
    }

    // Respuesta EJS (vistas web)
    res.render("home", {
      title: "Dashboard - Cake Sweet",
      usuario,
      error: null,
      mensaje: null,
    });
  } catch (err) {
    console.error("Error en /home:", err);

    if (req.headers.accept?.includes("application/json")) {
      res
        .status(500)
        .json({ mensaje: "Error interno del servidor. Intente nuevamente." });
    } else {
      res.redirect("/login?mensaje=Error en el servidor");
    }
  }
});

module.exports = router;
