const { Router } = require('express');
const router = Router();

// 1. Importamos el middleware con la ruta exacta (aseguramos minúsculas/mayúsculas del proyecto)
const authMiddleware = require('../middleware/authMiddleware'); // 👈 O '../middlewares/authMiddleware' según se llame tu carpeta física

const { 
    getAeronavesDisponibles, 
    crearF13, 
    eliminarF13,
    getF13s 
} = require('../controllers/F13Controller');

// 2. Un pequeño middleware puente para adaptar req.user a req.usuarioId que espera tu controlador de F13
const adaptarUsuarioId = (req, res, next) => {
    if (req.user && req.user._id) {
        req.usuarioId = req.user._id; // Inyectamos req.usuarioId para que F13Controller no lance 401
    }
    next();
};

// 3. Aplicamos de manera segura el middleware de autenticación y la adaptación de ID en las rutas correspondientes
router.get('/', authMiddleware, getF13s); 
router.get('/aeronaves-disponibles', authMiddleware, getAeronavesDisponibles);
router.post('/nuevo', authMiddleware, adaptarUsuarioId, crearF13);
router.delete('/eliminar/:id', authMiddleware, eliminarF13);

module.exports = router;