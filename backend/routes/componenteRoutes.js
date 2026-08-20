import express from 'express';
import {
  crearComponente,
  obtenerComponentes,
  asignarAUnidad,
  instalarEnAeronave,
  desmontarDeAeronave,
  darDeBaja
} from '../controllers/componenteController.js';

const router = express.Router();

// 📍 1. POOL GENERAL Y BÚSQUEDA
// GET  /api/componentes         -> Obtener/Filtrar componentes (por unidad, estado, S/N, P/N, etc.)
// POST /api/componentes         -> Dar de alta un componente en el Pool General
router.route('/')
  .get(obtenerComponentes)
  .post(crearComponente);

// 📍 2. ASIGNACIÓN A UNIDAD (Reclamar del Pool General)
// PUT /api/componentes/:id/asignar-unidad
router.put('/:id/asignar-unidad', asignarAUnidad);

// 📍 3. MONTAJE EN AERONAVE
// PUT /api/componentes/:id/instalar
router.put('/:id/instalar', instalarEnAeronave);

// 📍 4. DESMONTAJE / REMOCIÓN DE AERONAVE
// PUT /api/componentes/:id/desmontar
router.put('/:id/desmontar', desmontarDeAeronave);

// 📍 5. DAR DE BAJA
// PUT /api/componentes/:id/dar-de-baja
router.put('/:id/dar-de-baja', darDeBaja);

export default router;