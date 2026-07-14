const { Router } = require('express');
const router = Router();
const { 
    getAeronavesDisponibles, 
    crearF13, 
    eliminarF13 
} = require('../controllers/F13Controller');

// GET - Obtener las aeronaves para armar el desplegable
router.get('/aeronaves-disponibles', getAeronavesDisponibles);

// POST - Guardar el formulario F-13
router.post('/nuevo', crearF13);

// DELETE - Eliminar un F-13 por ID
router.delete('/eliminar/:id', eliminarF13);

module.exports = router;