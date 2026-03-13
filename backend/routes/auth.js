const express = require('express');
const router = express.Router();
// Importamos los controladores (Asegúrate de que authController.js tenga estas funciones)
const authController = require('../controllers/authController');

// Verificación de seguridad: Validar que los controladores estén definidos
const register = authController.register;
const login = authController.login;

if (!register || !login) {
    console.error('❌ ERROR CRÍTICO: Las funciones register o login no están definidas en authController.js');
}

/**
 * @route   POST /api/auth/register
 * @desc    Registrar un nuevo usuario
 * @access  Public
 */
router.post('/register', register);

/**
 * @route   POST /api/auth/login
 * @desc    Autenticar usuario y obtener token
 * @access  Public
 */
router.post('/login', login);

module.exports = router;