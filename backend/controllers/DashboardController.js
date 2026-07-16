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

        // 🛡️ CONTROL DE SEGURIDAD EXTREMO: Si no hay unidad del operador, abortamos
        if (!unidad) {
            return res.status(400).json({
                ok: false,
                msg: 'La unidad del usuario es requerida para segmentar la información y evitar fugas de datos.'
            });
        }

        // --- 1. CONSTRUCCIÓN DE FILTROS ---
        // Usamos regex con flag 'i' para que la comparación de la unidad sea insensible a mayúsculas/minúsculas
        let filtroAeronave = {
            unidad: { $regex: new RegExp(`^${unidad}$`, 'i') }
        };
        let filtroF13 = {};

        // Filtro por Sistema de Armas (SDA) si el operador lo selecciona en el panel
        if (sda) {
            filtroAeronave.sda = sda;
        }

        // --- 2. OBTENER FLOTA DE LA UNIDAD Y CORREGIR ESTADOS (E/S) ---
        const aeronaves = await Aircraft.find(filtroAeronave)
            .select('matricula modelo sda horasTotales estado enServicio unidad')
            .lean();

        // 🛡️ COMPROBACIÓN: Comprobación usando siglas militares "E/S"
        const chequearOperativo = (a) => {
            return a.estado === 'E/S' || a.estado === 'En Servicio' || a.enServicio === true;
        };

        const totalAeronaves = aeronaves.length;
        const operativas = aeronaves.filter(chequearOperativo).length;
        const enMantenimiento = totalAeronaves - operativas;

        // --- 3. CONSULTAR HISTORIAL DE VUELOS (F13) EXCLUSIVO DE ESTA UNIDAD ---
        const idsAeronavesUnidad = aeronaves.map(a => a._id);
        
        // El historial solo traerá vuelos pertenecientes a las aeronaves de esta unidad
        filtroF13.aeronave = { $in: idsAeronavesUnidad };

        // Aplicamos filtros temporales si existen en el frontend
        if (fechaInicio || fechaFin) {
            filtroF13.fecha = {};
            if (fechaInicio) filtroF13.fecha.$gte = new Date(fechaInicio);
            if (fechaFin) filtroF13.fecha.$lte = new Date(fechaFin);
        }

        // Traemos los vuelos ordenados cronológicamente
        const historialVuelosRaw = await F13.find(filtroF13)
            .populate('aeronave', 'matricula modelo sda unidad')
            .populate('creadoPor', 'nombre apellido rango')
            .sort({ fecha: -1 }) 
            .lean();

        // 🚀 MAPEO CON LOS CAMPOS REALES DE TU MONGO
        const historialVuelos = historialVuelosRaw.map(vuelo => {
            // Usamos el 'horasTotales' que ya viene en tu base de datos. 
            // Si no existiera, hacemos la suma de seguridad (horasALaFecha + horasDelDia)
            const sumatoriaSeguridad = (vuelo.horasALaFecha || 0) + (vuelo.horasDelDia || 0);
            
            return {
                ...vuelo,
                horasTotales: vuelo.horasTotales !== undefined 
                    ? vuelo.horasTotales 
                    : Number(sumatoriaSeguridad.toFixed(2))
            };
        });

        // --- 4. ⚙️ PROCESAMIENTO DINÁMICO DE HORAS ESTRUCTURALES SÓLIDAS ---
        // Para cada aeronave de la unidad, buscamos su F13 más reciente histórico para calcular su odómetro actual
        const detalleFlotaActualizado = await Promise.all(aeronaves.map(async (nave) => {
            // Buscamos el último F13 de esta aeronave específica cargado en el sistema
            const ultimoF13 = await F13.findOne({ aeronave: nave._id })
                .sort({ fecha: -1, createdAt: -1 })
                .select('horasALaFecha horasDelDia horasTotales')
                .lean();

            let horasEstructuralesReales = nave.horasTotales || 0;

            if (ultimoF13) {
                // Usamos su campo 'horasTotales' nativo, o calculamos el fallback
                const acumuladoCalculado = ultimoF13.horasTotales !== undefined
                    ? ultimoF13.horasTotales
                    : (ultimoF13.horasALaFecha || 0) + (ultimoF13.horasDelDia || 0);
                
                horasEstructuralesReales = Number(acumuladoCalculado.toFixed(2));
            }

            return {
                ...nave,
                // Reemplazamos/aseguramos el campo 'horasTotales' con el odómetro dinámico definitivo
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
                detalleFlota: detalleFlotaActualizado // Flota con odómetros reales calculados
            },
            resumenVuelos: {
                totalHorasVoladas: Number(totalHorasVoladasPeriodo.toFixed(2)),
                totalAterrizajes: totalAterrizajesPeriodo,
                cantidadVuelos: historialVuelos.length,
                ultimosVuelos: historialVuelos // Historial de vuelos con horasTotales garantizadas
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