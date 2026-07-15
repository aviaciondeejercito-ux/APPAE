const Aircraft = require('../models/Aircraft');
const F13 = require('../models/F13');

/**
 * Obtiene el consolidado de novedades del elemento (Aeronaves + Formularios F-13)
 * Filtrado estrictamente por la unidad del usuario.
 */
const getNovedadesElemento = async (req, res) => {
    try {
        // 1. Recibimos parámetros desde el frontend
        const { sda, fechaInicio, fechaFin, unidad } = req.query;

        // --- 1. CONSTRUCCIÓN DE FILTROS ---
        let filtroAeronave = {};
        let filtroF13 = {};

        // 🛡️ Filtro de Unidad
        if (unidad) {
            filtroAeronave.unidad = unidad;
        }

        // Filtro por Sistema de Armas (SDA)
        if (sda) {
            filtroAeronave.sda = sda;
        }

        // --- 2. OBTENER FLOTA Y CORREGIR ESTADOS (E/S) ---
        const aeronaves = await Aircraft.find(filtroAeronave)
            .select('matricula modelo sda horasTotales estado enServicio unidad')
            .lean();

        // 🛡️ CORRECCIÓN: Comprobación estricta usando siglas militares "E/S"
        const chequearOperativo = (a) => {
            return a.estado === 'E/S' || a.estado === 'En Servicio' || a.enServicio === true;
        };

        const totalAeronaves = aeronaves.length;
        const operativas = aeronaves.filter(chequearOperativo).length;
        const enMantenimiento = totalAeronaves - operativas;

        // --- 3. CONSULTAR EL HISTORIAL DE VUELOS (F13) DE LA UNIDAD ---
        const idsAeronavesUnidad = aeronaves.map(a => a._id);
        filtroF13.aeronave = { $in: idsAeronavesUnidad };

        // Para las métricas anuales/mensuales de la derecha, aplicamos los filtros temporales si existen
        if (fechaInicio || fechaFin) {
            filtroF13.fecha = {};
            if (fechaInicio) filtroF13.fecha.$gte = new Date(fechaInicio);
            if (fechaFin) filtroF13.fecha.$lte = new Date(fechaFin);
        }

        // Traemos los vuelos sin el límite estricto de 50 para no perder cálculos anuales,
        // pero ordenados para procesar estadísticas cronológicas
        const historialVuelos = await F13.find(filtroF13)
            .populate('aeronave', 'matricula modelo sda unidad')
            .populate('creadoPor', 'nombre apellido rango')
            .sort({ fecha: -1 }) 
            .lean();

        // --- 4. ⚙️ PROCESAMIENTO DINÁMICO DE HORAS ESTRUCTURALES SÓLIDAS ---
        // Para cada aeronave de la unidad, buscaremos de forma garantizada su F13 más reciente histórico
        // (ignorando los filtros de fecha del cliente) para saber cuál es su verdadero odómetro actual.
        const detalleFlotaActualizado = await Promise.all(aeronaves.map(async (nave) => {
            // Buscamos el último F13 de esta aeronave específica cargado en el sistema
            const ultimoF13 = await F13.findOne({ aeronave: nave._id })
                .sort({ fecha: -1, createdAt: -1 })
                .select('horasAnteriores horasDelDia')
                .lean();

            let horasEstructuralesReales = nave.horasTotales || 0;

            if (ultimoF13) {
                // El acumulado real al último minuto es: horasAnteriores del último vuelo + lo que voló ese día
                const acumuladoCalculado = (ultimoF13.horasAnteriores || 0) + (ultimoF13.horasDelDia || 0);
                horasEstructuralesReales = Number(acumuladoCalculado.toFixed(2));
            }

            return {
                ...nave,
                // Reemplazamos/aseguramos el campo 'horasTotales' con el número robusto definitivo
                horasTotales: horasEstructuralesReales
            };
        }));

        // Métricas rápidas de vuelo en el rango seleccionado
        const totalHorasVoladasPeriodo = historialVuelos.reduce((sum, f13) => sum + (f13.horasDelDia || 0), 0);
        const totalAterrizajesPeriodo = historialVuelos.reduce((sum, f13) => sum + (f13.aterrizajes || 0), 0);

        // --- 5. RESPUESTA CONSOLIDADA IMPENETRABLE ---
        return res.status(200).json({
            ok: true,
            resumenMantenimiento: {
                totalAeronaves,
                operativas,
                enMantenimiento,
                detalleFlota: detalleFlotaActualizado // Enviamos la flota con los odómetros reales calculados
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