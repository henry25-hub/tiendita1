const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("../db"); // db.js con Pool PostgreSQL
const crypto = require("crypto");

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET || "mi_secreto_ultra_seguro";

// GET /login → formulario EJS
router.get("/", (req, res) => {
  const mensaje = req.query.mensaje || null;
  res.render("login", {
    title: "Iniciar Sesión - Cake Sweet",
    error: null,
    mensaje,
    isLoginPage: true
  });
});

// POST /login → procesa login (EJS o JSON)
router.post("/", async (req, res, next) => {
  const { usuario, password } = req.body;

  try {
    if (!usuario || !password) {
      if (req.headers.accept?.includes("application/json")) {
        return res.status(400).json({ mensaje: "Faltan datos obligatorios" });
      } else {
        return res.render("login", {
          title: "Iniciar Sesión - Cake Sweet",
          error: "Faltan datos obligatorios",
          mensaje: null,
          isLoginPage: true
        });
      }
    }

    // 🔹 Consulta PostgreSQL
    const result = await db.query(
      "SELECT * FROM usuarios WHERE usuario = $1",
      [usuario]
    );
    const usuarios = result.rows;

    if (usuarios.length === 0) {
      if (req.headers.accept?.includes("application/json")) {
        return res.status(401).json({ mensaje: "Credenciales incorrectas" });
      } else {
        return res.render("login", {
          title: "Iniciar Sesión - Cake Sweet",
          error: "Credenciales incorrectas",
          mensaje: null,
          isLoginPage: true
        });
      }
    }

    const user = usuarios[0];
    let passwordValida = false;

    // Detectar MD5 y actualizar a bcrypt
    const isMD5 = /^[a-f0-9]{32}$/i.test(user.password);
    if (isMD5) {
      const md5Hash = crypto.createHash("md5").update(password).digest("hex");
      passwordValida = md5Hash === user.password;

      if (passwordValida) {
        const bcryptHash = await bcrypt.hash(password, 10);
        await db.query("UPDATE usuarios SET password = $1 WHERE id = $2", [
          bcryptHash,
          user.id
        ]);
      }
    } else {
      passwordValida = await bcrypt.compare(password, user.password);
    }

    if (!passwordValida) {
      if (req.headers.accept?.includes("application/json")) {
        return res.status(401).json({ mensaje: "Credenciales incorrectas" });
      } else {
        return res.render("login", {
          title: "Iniciar Sesión - Cake Sweet",
          error: "Credenciales incorrectas",
          mensaje: null,
          isLoginPage: true
        });
      }
    }

    // Generar token JWT
    const token = jwt.sign(
      { id: user.id, usuario: user.usuario },
      SECRET_KEY,
      { expiresIn: "24h" }
    );

    if (req.headers.accept?.includes("application/json")) {
      return res.status(200).json({
        mensaje: "Inicio de sesión exitoso",
        token,
        usuario: user.usuario
      });
    }

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000
    });
    res.redirect("/home");

  } catch (err) {
    console.error("Error en login:", err);
    next(err);
  }
});

// Logout
router.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login?mensaje=Sesión cerrada correctamente");
});

module.exports = router;
