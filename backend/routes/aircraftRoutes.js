const express = require('express');
const router = express.Router();
const aircraftController = require('../controllers/aircraftController');
const authMiddleware = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rolecheck');

/**
 * RUTAS DE MATERIAL AERONÁUTICO MODULARIZADO - SISTEMA AE
 * Seguridad en capas: Autenticación de Token -> Middleware de Rol -> Filtro de Contexto de Unidad en Controlador.
 */

// 1. Capa de Aislamiento y Protección Global (JWT/Session)
const protect = authMiddleware.protect || authMiddleware.verifyToken || authMiddleware;
router.use(protect);

/**
 * 2. RUTAS ESTÁTICAS PRINCIPALES
 */

// GET '/' -> Obtiene la flota. El controlador decide si devuelve la Flota Global o solo la Unidad según credenciales.
router.get('/', aircraftController.getAircrafts);

// POST '/' -> Carga inicial de aeronaves con estructuras relacionales complejas (motores, hélices y planeador).
router.post(
    '/', 
    authorize(
        'admin', 'ADMIN', 
        'BOSS', 'DIRECTOR', 'OTO', 
        'OFICINA_TECNICA', 'OFICINATECNICA', 
        'S4_UNIDAD', 'S4UNIDAD', 'S4', 
        'OFICINA_CE_TECNICA', 'OFICINACETECNICA'
    ), 
    aircraftController.createAircraft
);

/**
 * 3. RUTAS CRÍTICAS POR ID 
 * Posicionadas estratégicamente arriba para interceptar las peticiones antes que los comodines de texto.
 */

// PUT '/:id' -> Modificación de tablas dinámicas de inspección, carga de novedades o transferencia/traslado de unidad.
router.put(
    '/:id', 
    authorize(
        'admin', 'ADMIN', 
        'BOSS', 'DIRECTOR', 'OTO', 
        'OFICINA_TECNICA', 'OFICINATECNICA', 
        'S4_UNIDAD', 'S4UNIDAD', 'S4',
        'OFICINA_CE_TECNICA', 'OFICINACETECNICA'
    ), 
    aircraftController.updateAircraftStatus
);

// DELETE '/:id' -> Destrucción de registros. El controlador valida que solo rangos de Comando Estratégico procedan.
router.delete(
    '/:id', 
    authorize(
        'admin', 'ADMIN', 
        'BOSS', 'DIRECTOR', 'OTO', 
        'OFICINA_TECNICA', 'OFICINATECNICA', 
        'S4_UNIDAD', 'S4UNIDAD', 'S4'
    ), 
    aircraftController.deleteAircraft
);

/**
 * 4. RUTAS DE COMPATIBILIDAD Y CONSULTA DIRIGIDA POR PARÁMETRO
 * Permiten buscar de manera explícita el material de un elemento ajeno (sujeto a las restricciones del controlador).
 */

// Si tu controlador maneja una función específica para búsquedas explícitas por elemento
if (typeof aircraftController.getAircraftsByElemento === 'function') {
    router.get(
        '/elemento/:elemento', 
        authorize(
            'user', 'USER', 
            'S4_UNIDAD', 'S4UNIDAD', 'S4', 
            'OFICINA_TECNICA', 'OFICINATECNICA', 
            'OFICINA_CE_TECNICA', 'OFICINACETECNICA', 
            'OTO', 'OTOAE', 'DIRECTOR', 'BOSS', 'admin', 'ADMIN'
        ), 
        aircraftController.getAircraftsByElemento
    );

    // Comodín genérico de resguardo al final del archivo
    router.get(
        '/:elemento', 
        authorize(
            'user', 'USER', 
            'S4_UNIDAD', 'S4UNIDAD', 'S4', 
            'OFICINA_TECNICA', 'OFICINATECNICA', 
            'OFICINA_CE_TECNICA', 'OFICINACETECNICA', 
            'OTO', 'OTOAE', 'DIRECTOR', 'BOSS', 'admin', 'ADMIN'
        ), 
        aircraftController.getAircraftsByElemento
    );
} else {
    // Si centralizaste todo en getAircrafts pasándole filtros por query query string (?unidad=...)
    router.get(
        '/elemento/:elemento',
        authorize('admin', 'ADMIN', 'BOSS', 'DIRECTOR', 'OTO', 'OFICINA_TECNICA', 'OFICINATECNICA'),
        aircraftController.getAircrafts
    );
}

module.exports = router;