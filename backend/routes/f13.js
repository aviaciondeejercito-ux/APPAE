const { Router } = require('express');
const router = Router();
const authMiddleware = require('../middleware/authMiddleware');

const { 
    getAeronavesDisponibles, 
    crearF13, 
    eliminarF13,
    getF13s 
} = require('../controllers/F13Controller');

// Middleware adaptador unificado para extraer el JWT/User
const protect = authMiddleware.protect || authMiddleware.verifyToken || authMiddleware;

const adaptarUsuarioId = (req, res, next) => {
    const idUsuario = (req.user && req.user._id) || (req.usuario && req.usuario._id) || req.usuarioId;
    if (idUsuario) {
        req.usuarioId = idUsuario;
    }
    next();
};

router.use(protect);

router.get('/', getF13s); 
router.get('/aeronaves-disponibles', getAeronavesDisponibles);
router.post('/nuevo', adaptarUsuarioId, crearF13);
router.delete('/eliminar/:id', eliminarF13);

module.exports = router;