const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

/**
 * RUTAS DE AUTENTICACIÓN - SISTEMA GESTIÓN AE
 * Estas rutas gestionan el ingreso a la jerarquía operativa:
 * [admin, BOSS, OTO, DIRECTOR, user, OFICINA_TECNICA, OPERACIONES, JEFE, LOGISTICO, PERSONAL]
 */

// @route   POST /api/auth/register
// @desc    Registrar un nuevo usuario (Cumple con validaciones de User.js y Sincro Joker)
// @access  Public
router.post('/register', authController.register);

// @route   POST /api/auth/login
// @desc    Autenticar usuario y obtener token (Híbrido: username o email)
// @access  Public
router.post('/login', authController.login);

/**
 * SEGURIDAD Y CRÍTICA: 
 * El controlador authController gestiona la normalización de roles:
 * - admin y user se mantienen en minúsculas.
 * - Roles técnicos y jerárquicos se fuerzan a MAYÚSCULAS_CON_GUION.
 */

module.exports = router;