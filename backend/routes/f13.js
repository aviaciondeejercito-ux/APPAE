const { Router } = require('express');
const router = Router();
// 👉 IMPORTA AQUÍ TU MIDDLEWARE DE AUTENTICACIÓN (ajusta la ruta según tu proyecto)
const authMiddleware = require('../middlewares/auth'); 

const { 
    getAeronavesDisponibles, 
    crearF13, 
    eliminarF13,
    getF13s 
} = require('../controllers/F13Controller');

// 👇 Aplica el authMiddleware a las rutas que lo necesiten
router.get('/', authMiddleware, getF13s); 
router.get('/aeronaves-disponibles', authMiddleware, getAeronavesDisponibles);
router.post('/nuevo', authMiddleware, crearF13);
router.delete('/eliminar/:id', authMiddleware, eliminarF13);

module.exports = router;