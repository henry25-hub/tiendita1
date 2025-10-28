const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query } = require('../db'); // Usamos la función query centralizada

router.get('/', (req, res) => {
  res.render('register', { 
    title: 'Registro - Cake Sweet',
    error: null
  });
});

router.post('/', async (req, res) => {
  try {
    const isJson = req.is('application/json'); // Detecta si viene de Postman o AJAX
    const { usuario, password } = req.body;

    console.log('🧠 Body recibido:', req.body);

    // Validaciones
    if (!usuario || !password) {
      const msg = 'Usuario y contraseña son necesarios';
      if (isJson) return res.status(400).json({ error: msg });
      return res.render('register', { title: 'Registro - Cake Sweet', error: msg });
    }

    if (usuario.length < 3) {
      const msg = 'El usuario debe tener al menos 3 caracteres';
      if (isJson) return res.status(400).json({ error: msg });
      return res.render('register', { title: 'Registro - Cake Sweet', error: msg });
    }

    if (password.length < 4) {
      const msg = 'La contraseña debe tener al menos 4 caracteres';
      if (isJson) return res.status(400).json({ error: msg });
      return res.render('register', { title: 'Registro - Cake Sweet', error: msg });
    }

    // Verificar si ya existe el usuario
    const existingUsers = await query(
      'SELECT * FROM usuarios WHERE usuario = $1',
      [usuario]
    );

    if (existingUsers.rows.length > 0) {
      const msg = 'El usuario ya existe';
      if (isJson) return res.status(400).json({ error: msg });
      return res.render('register', { title: 'Registro - Cake Sweet', error: msg });
    }

    // Encriptar contraseña y guardar usuario
    const hashedPassword = await bcrypt.hash(password, 10);

    await query(
      'INSERT INTO usuarios (usuario, password) VALUES ($1, $2)',
      [usuario, hashedPassword]
    );

    if (isJson) {
      return res.status(201).json({ mensaje: 'Usuario registrado correctamente' });
    }

    // Redireccionar a login con mensaje de éxito
    res.redirect('/login?mensaje=Usuario registrado exitosamente');

  } catch (error) {
    console.error('❌ Error en registro:', error);
    const isJson = req.is('application/json');
    const errorMsg = 'Error interno del servidor: ' + error.message;

    if (isJson) return res.status(500).json({ error: errorMsg });

    res.render('register', { title: 'Registro - Cake Sweet', error: errorMsg });
  }
});

module.exports = router;
