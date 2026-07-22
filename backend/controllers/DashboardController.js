const Aircraft = require('../models/Aircraft');
const F13 = require('../models/F13');

/**
 * Obtiene el consolidado de novedades (Aeronaves + Formularios F-13)
 */
const getNovedadesElemento = async (req, res) => {
    try {
        const { sda, fechaInicio, fechaFin, unidad } = req.query;

        // 🛡️ DETECTAR ROLES PRIVILEGIADOS DESDE EL TOKEN
        const rolUsuario = (req.user?.role || req.user?.rango || '').toUpperCase();
        const tieneAccesoTotal = rolUsuario === 'ADMIN' || 
                                 rolUsuario === 'BOSS' || 
                                 rolUsuario === 'DIRECTOR' || 
                                 req.user?.esAdmin === true;

        // --- 1. FILTROS POR UNIDAD ---
        let filtroAeronave = {};
        let filtroF13 = {};

        if (!tieneAccesoTotal) {
            const unidadAFiltrar = unidad || req.user?.elemento || req.user?.unidad;
            if (!unidadAFiltrar) {
                return res.status(400).json({
                    ok: false,
                    msg: 'El elemento del usuario es requerido para segmentar la información.'
                });
            }
            filtroAeronave.unidad = { $regex: new RegExp(`^${unidadAFiltrar}$`, 'i') };
        } else {
            if (unidad && unidad !== 'TODAS') {
                filtroAeronave.unidad = { $regex: new RegExp(`^${unidad}$`, 'i') };
            }
        }

        if (sda) {
            filtroAeronave.sda = sda;
        }

        // --- 2. OBTENER FLOTA Y NORMALIZAR ---
        // Solicitamos tgPlaneadorActual y estadoOperativo según el nuevo AircraftSchema
        const aeronaves = await Aircraft.find(filtroAeronave)
            .select('matricula sda unidad estadoOperativo tgPlaneadorActual inicioAeHs tipoIcono')
            .lean();

        // Verificación basada en el enum ['E/S', 'F/S']
        const totalAeronaves = aeronaves.length;
        const operativas = aeronaves.filter(a => a.estadoOperativo === 'E/S').length;
        const enMantenimiento = totalAeronaves - operativas;

        // --- 3. CONSULTAR HISTORIAL DE VUELOS (F13) ---
        const idsAeronavesUnidad = aeronaves.map(a => a._id);
        filtroF13.aeronave = { $in: idsAeronavesUnidad };

        if (fechaInicio || fechaFin) {
            filtroF13.fecha = {};
            if (fechaInicio) filtroF13.fecha.$gte = new Date(fechaInicio);
            if (fechaFin) filtroF13.fecha.$lte = new Date(fechaFin);
        }

        const historialVuelosRaw = await F13.find(filtroF13)
            .populate('aeronave', 'matricula sda unidad')
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

        // --- 4. CÁLCULO DINÁMICO DEL ODÓMETRO ESTRUCTURAL ---
        const detalleFlotaActualizado = await Promise.all(aeronaves.map(async (nave) => {
            const ultimoF13 = await F13.findOne({ aeronave: nave._id })
                .sort({ fecha: -1, createdAt: -1 })
                .select('horasALaFecha horasDelDia horasTotales')
                .lean();

            // Prioridad de horas: Último F-13 registrado > tgPlaneadorActual > inicioAeHs > 0
            let horasEstructuralesReales = nave.tgPlaneadorActual || nave.inicioAeHs || 0;

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