const express = require('express');
const router = express.Router();
const { 
    getEvents, 
    createEvent, 
    updateEvent, 
    deleteEvent 
} = require('../controllers/eventController');

// Middleware de seguridad - Verifica que el usuario esté logueado
const authMiddleware = require('../middleware/authMiddleware');

/**
 * SISTEMA GESTIÓN AE - RUTAS PROTEGIDAS
 * El acceso está blindado. Solo usuarios autenticados pueden ver o gestionar.
 */

// Obtener eventos: Acceso total para visualización (Admin, User, Boss)
router.get('/', authMiddleware, getEvents);

// Crear evento: La validación de que el 'Boss' NO pueda crear se hace en el controlador
router.post('/', authMiddleware, createEvent);

// Editar evento: Solo permitida para Admin y User
router.put('/:id', authMiddleware, updateEvent);

// Eliminar evento: Baja definitiva del sistema
router.delete('/:id', authMiddleware, deleteEvent);

module.exports = router;