const { Router } = require('express');
const router = Router();
const { 
    getAeronavesDisponibles, 
    crearF13, 
    eliminarF13,
    getF13s // 👈 Asegurate de importar la función que obtiene la lista del controlador
} = require('../controllers/F13Controller');

// 🌟 GET - Obtener la lista de todo el historial de F-13 (¡ESTA FALTA EN TU CÓDIGO!)
router.get('/', getF13s); // 👈 Esta mapea directamente a API.get('/f13')

// GET - Obtener las aeronaves para armar el desplegable
router.get('/aeronaves-disponibles', getAeronavesDisponibles);

// POST - Guardar el formulario F-13
router.post('/nuevo', crearF13);

// DELETE - Eliminar un F-13 por ID
router.delete('/eliminar/:id', eliminarF13);

module.exports = router;