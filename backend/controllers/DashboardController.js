const Aircraft = require('../models/Aircraft');
const F13 = require('../models/F13');

/**
 * Obtiene el consolidado de novedades del elemento (Aeronaves + Formularios F-13)
 * Filtrado estrictamente por la unidad del usuario.
 */
const getNovedadesElemento = async (req, res) => {
    try {
        // 1. Recibimos el parámetro 'unidad' enviado desde el frontend
        const { sda, fechaInicio, fechaFin, unidad } = req.query;

        // --- 1. CONSTRUCCIÓN DE FILTROS ---
        let filtroAeronave = {};
        let filtroF13 = {};

        // 🛡️ FILTRO CRÍTICO DE UNIDAD: Si viene la unidad, restringimos las búsquedas a ella
        if (unidad) {
            filtroAeronave.unidad = unidad;
        }

        // Si se filtra por Sistema de Armas (SDA)
        if (sda) {
            filtroAeronave.sda = sda;
        }

        // Si se filtra por rango de fechas en los vuelos (F13)
        if (fechaInicio || fechaFin) {
            filtroF13.fecha = {};
            if (fechaInicio) filtroF13.fecha.$gte = new Date(fechaInicio);
            if (fechaFin) filtroF13.fecha.$lte = new Date(fechaFin);
        }

        // --- 2. CONSULTA DE NOVEDADES DE MANTENIMIENTO (Aircraft) ---
        // Buscamos SOLO las aeronaves pertenecientes a la unidad/SDA seleccionados
        const aeronaves = await Aircraft.find(filtroAeronave)
            .select('matricula modelo sda horasTotales estado enServicio unidad')
            .lean();

        // Métricas rápidas de mantenimiento para el panel basadas EXCLUSIVAMENTE en la flota filtrada
        const totalAeronaves = aeronaves.length;
        const operativas = aeronaves.filter(a => a.estado === 'En Servicio' || a.enServicio === true).length;
        const enMantenimiento = totalAeronaves - operativas;

        // --- 3. CONSULTA DE NOVEDADES DE HORAS VOLADAS (F13) ---
        // Para que los vuelos también correspondan únicamente a tu unidad,
        // vinculamos los registros F13 a los IDs de las aeronaves de tu unidad.
        const idsAeronavesUnidad = aeronaves.map(a => a._id);
        filtroF13.aeronave = { $in: idsAeronavesUnidad };

        const historialVuelos = await F13.find(filtroF13)
            .populate('aeronave', 'matricula modelo sda unidad')
            .populate('creadoPor', 'nombre apellido rango')
            .sort({ fecha: -1 }) // Trae los más recientes primero
            .limit(50) // Limitamos a los últimos 50 para no sobrecargar el panel
            .lean();

        // Métricas rápidas de vuelo basadas únicamente en el historial de la unidad
        const totalHorasVoladasPeriodo = historialVuelos.reduce((sum, f13) => sum + (f13.horasDelDia || 0), 0);
        const totalAterrizajesPeriodo = historialVuelos.reduce((sum, f13) => sum + (f13.aterrizajes || 0), 0);

        // --- 4. RESPUESTA CONSOLIDADA ---
        return res.status(200).json({
            ok: true,
            resumenMantenimiento: {
                totalAeronaves,
                operativas,
                enMantenimiento,
                detalleFlota: aeronaves
            },
            resumenVuelos: {
                totalHorasVoladas: Number(totalHorasVoladasPeriodo.toFixed(2)),
                totalAterrizajes: totalAterrizajesPeriodo,
                cantidadVuelos: historialVuelos.length,
                ultimosVuelos: historialVuelos
            }
        });

    } catch (error) {
        console.error('❌ Error al consolidar novedades del panel:', error);
        return res.status(500).json({
            ok: false,
            msg: 'Error interno del servidor al recuperar las novedades del panel.',
            error: error.message
        });
    }
};

module.exports = {
    getNovedadesElemento
};