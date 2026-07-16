const Aircraft = require('../models/Aircraft');
const F13 = require('../models/F13');

/**
 * Obtiene el consolidado de novedades del elemento (Aeronaves + Formularios F-13)
 * Filtrado estrictamente por la unidad/elemento del usuario.
 */
const getNovedadesElemento = async (req, res) => {
    try {
        // 1. Recibimos la unidad del usuario (que en su perfil es su 'elemento')
        const { sda, fechaInicio, fechaFin, unidad } = req.query;

        // 🛡️ CONTROL DE SEGURIDAD: Si no hay unidad/elemento, abortamos
        if (!unidad) {
            return res.status(400).json({
                ok: false,
                msg: 'El elemento/unidad del usuario es requerido para segmentar la información.'
            });
        }

        // --- 1. CONSTRUCCIÓN DE FILTROS ---
        // 🔧 CORRECCIÓN CLAVE: Buscamos en el campo "unidad" de la Aeronave usando el string del "elemento" del usuario
        let filtroAeronave = {
            unidad: { $regex: new RegExp(`^${unidad}$`, 'i') }
        };
        let filtroF13 = {};

        // Filtro por Sistema de Armas (SDA) si se selecciona en el panel
        if (sda) {
            filtroAeronave.sda = sda;
        }

        // --- 2. OBTENER FLOTA Y CORREGIR ESTADOS (E/S) ---
        // Volvemos a proyectar 'unidad' que es el campo real del modelo Aircraft
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
            const sumatoriaSeguridad = (vuelo.horasALaFecha || 0) + (vuelo.horasDelDia || 0);
            
            return {
                ...vuelo,
                horasTotales: vuelo.horasTotales !== undefined 
                    ? vuelo.horasTotales 
                    : Number(sumatoriaSeguridad.toFixed(2))
            };
        });

        // --- 4. ⚙️ PROCESAMIENTO DINÁMICO DE HORAS ESTRUCTURALES SÓLIDAS ---
        const detalleFlotaActualizado = await Promise.all(aeronaves.map(async (nave) => {
            const ultimoF13 = await F13.findOne({ aeronave: nave._id })
                .sort({ fecha: -1, createdAt: -1 })
                .select('horasALaFecha horasDelDia horasTotales')
                .lean();

            let horasEstructuralesReales = nave.horasTotales || 0;

            if (ultimoF13) {
                const acumuladoCalculado = ultimoF13.horasTotales !== undefined
                    ? ultimoF13.horasTotales
                    : (ultimoF13.horasALaFecha || 0) + (ultimoF13.horasDelDia || 0);
                
                horasEstructuralesReales = Number(acumuladoCalculado.toFixed(2));
            }

            return {
                ...nave,
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
                detalleFlota: detalleFlotaActualizado 
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