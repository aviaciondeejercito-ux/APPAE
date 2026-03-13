const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

/**
 * RUTAS DE AUTENTICACIÓN - SISTEMA GESTIÓN AE
 * * Estas rutas son de acceso público, pero gestionan el ingreso 
 * a la jerarquía de Admin, Boss y User.
 */

// @route   POST /api/auth/register
// @desc    Registrar un nuevo usuario (Cumple con validaciones de User.js)
// @access  Public
router.post('/register', authController.register);

// @route   POST /api/auth/login
// @desc    Autenticar usuario y obtener token (Híbrido: username o email)
// @access  Public
router.post('/login', authController.login);

/**
 * SEGURIDAD Y CRÍTICA: 
 * Se eliminan las verificaciones de consola redundantes para mantener 
 * el log limpio en Render. Si el controlador no existe, Express 
 * lanzará un error de referencia al iniciar, lo cual es más seguro 
 * que un console.log que permite que el servidor siga corriendo.
 */

module.exports = router;