const Aircraft = require('../models/Aircraft');
const F13 = require('../models/F13');

/**
 * Obtiene el consolidado de novedades (Aeronaves + Formularios F-13)
 * Si el usuario es ADMIN, BOSS o DIRECTOR ve todo (u opcionalmente filtra). 
 * Si es usuario común, se segmenta estrictamente por su elemento asignado.
 */
const getNovedadesElemento = async (req, res) => {
    try {
        const { sda, fechaInicio, fechaFin, unidad } = req.query;

        // 🛡️ DETECTAR ROLES PRIVILEGIADOS DESDE EL TOKEN (Middleware de autenticación)
        const rolUsuario = (req.user?.role || req.user?.rango || '').toUpperCase();
        
        const tieneAccesoTotal = rolUsuario === 'ADMIN' || 
                                 rolUsuario === 'BOSS' || 
                                 rolUsuario === 'DIRECTOR' || 
                                 req.user?.esAdmin === true;

        // --- 1. CONSTRUCCIÓN INTELIGENTE DE FILTROS ---
        let filtroAeronave = {};
        let filtroF13 = {};

        if (!tieneAccesoTotal) {
            // USUARIO COMÚN: Bloqueo estricto por su unidad/elemento asignado
            // (Si viene vacío por query, intentamos rescatarlo del propio token del usuario)
            const unidadAFiltrar = unidad || req.user?.elemento || req.user?.unidad;

            if (!unidadAFiltrar) {
                return res.status(400).json({
                    ok: false,
                    msg: 'El elemento del usuario es requerido para segmentar la información.'
                });
            }
            filtroAeronave.unidad = { $regex: new RegExp(`^${unidadAFiltrar}$`, 'i') };
        } else {
            // ROLES PRIVILEGIADOS (ADMIN, BOSS, DIRECTOR): 
            // Si en el panel seleccionaron una unidad específica, filtramos por ella.
            // Si eligieron "TODAS" (o no viene parámetro), filtroAeronave queda vacío {} y trae TODO.
            if (unidad && unidad !== 'TODAS') {
                filtroAeronave.unidad = { $regex: new RegExp(`^${unidad}$`, 'i') };
            }
        }

        if (sda) {
            filtroAeronave.sda = sda;
        }

        // --- 2. OBTENER FLOTA ---
        const aeronaves = await Aircraft.find(filtroAeronave)
            .select('matricula modelo sda horasTotales estado enServicio unidad')
            .lean();

        const chequearOperativo = (a) => {
            return a.estado === 'E/S' || a.estado === 'En Servicio' || a.enServicio === true;
        };

        const totalAeronaves = aeronaves.length;
        const operativas = aeronaves.filter(chequearOperativo).length;
        const enMantenimiento = totalAeronaves - operativas;

        // --- 3. CONSULTAR HISTORIAL DE VUELOS (F13) ---
        const idsAeronavesUnidad = aeronaves.map(a => a._id);
        
        // Historial limitado a las aeronaves obtenidas en el paso anterior (filtradas o totales)
        filtroF13.aeronave = { $in: idsAeronavesUnidad };

        if (fechaInicio || fechaFin) {
            filtroF13.fecha = {};
            if (fechaInicio) filtroF13.fecha.$gte = new Date(fechaInicio);
            if (fechaFin) filtroF13.fecha.$lte = new Date(fechaFin);
        }

        const historialVuelosRaw = await F13.find(filtroF13)
            .populate('aeronave', 'matricula modelo sda unidad')
            .populate('creadoPor', 'nombre apellido rango')
            .sort({ fecha: -1 }) 
            .lean();

        const historialVuelos = historialVuelosRaw.map(vuelo => {
            const sumatoriaSeguridad = (vuelo.horasALaFecha || 0) + (vuelo.horasDelDia || 0);
            return {
                ...vuelo,
                horasTotales: vuelo.horasTotales !== undefined 
                    ? vuelo.horasTotales 
                    : Number(sumatoriaSeguridad.toFixed(2))
            };
        });

        // --- 4. PROCESAMIENTO DINÁMICO DE ODÓMETROS ---
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

        const totalHorasVoladasPeriodo = historialVuelos.reduce((sum, f13) => sum + (f13.horasDelDia || 0), 0);
        const totalAterrizajesPeriodo = historialVuelos.reduce((sum, f13) => sum + (f13.aterrizajes || 0), 0);

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
            msg: 'Error interno del servidor al recuperar las novedades.',
            error: error.message
        });
    }
};

module.exports = {
    getNovedadesElemento
};