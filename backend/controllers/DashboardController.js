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

        // --- 1. FILTROS POR UNIDAD CON SANITIZACIÓN REGEXP ---
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
            // Escapar caracteres especiales para evitar errores en RegExp
            const unidadEscapada = unidadAFiltrar.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filtroAeronave.unidad = { $regex: new RegExp(`^${unidadEscapada}$`, 'i') };
        } else {
            if (unidad && unidad !== 'TODAS') {
                const unidadEscapada = unidad.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                filtroAeronave.unidad = { $regex: new RegExp(`^${unidadEscapada}$`, 'i') };
            }
        }

        if (sda) {
            filtroAeronave.sda = sda;
        }

        // --- 2. OBTENER FLOTA (QUERY 1) ---
        const aeronaves = await Aircraft.find(filtroAeronave)
            .select('matricula sda unidad estadoOperativo tgPlaneadorActual inicioAeHs tipoIcono')
            .lean();

        // 🛡️ GUARDAAGUJAS: Si la unidad no tiene aeronaves registradas, retornamos 200 limpio
        if (!aeronaves || aeronaves.length === 0) {
            return res.status(200).json({
                ok: true,
                resumenMantenimiento: {
                    totalAeronaves: 0,
                    operativas: 0,
                    enMantenimiento: 0,
                    detalleFlota: []
                },
                resumenVuelos: {
                    totalHorasVoladas: 0,
                    totalAterrizajes: 0,
                    cantidadVuelos: 0,
                    ultimosVuelos: []
                }
            });
        }

        const totalAeronaves = aeronaves.length;
        const operativas = aeronaves.filter(a => a.estadoOperativo === 'E/S').length;
        const enMantenimiento = totalAeronaves - operativas;

        // --- 3. SANITIZAR FILTRO DE FECHAS DE FORMA SEGURA ---
        const idsAeronavesUnidad = aeronaves.map(a => a._id);
        filtroF13.aeronave = { $in: idsAeronavesUnidad };

        if (fechaInicio || fechaFin) {
            filtroF13.fecha = {};
            if (fechaInicio && !isNaN(new Date(fechaInicio).getTime())) {
                filtroF13.fecha.$gte = new Date(fechaInicio);
            }
            if (fechaFin && !isNaN(new Date(fechaFin).getTime())) {
                filtroF13.fecha.$lte = new Date(fechaFin);
            }
            if (Object.keys(filtroF13.fecha).length === 0) {
                delete filtroF13.fecha;
            }
        }

        // --- 4. CONSULTAR HISTORIAL DE VUELOS (QUERY 2) ---
        const historialVuelosRaw = await F13.find(filtroF13)
            .populate('aeronave', 'matricula sda unidad')
            .populate('creadoPor', 'nombre apellido rango')
            .sort({ fecha: -1, createdAt: -1 }) 
            .lean();

        const historialVuelos = (historialVuelosRaw || []).map(vuelo => {
            const horasALaFecha = Number(vuelo.horasALaFecha) || 0;
            const horasDelDia = Number(vuelo.horasDelDia) || 0;
            const sumatoriaSeguridad = horasALaFecha + horasDelDia;

            return {
                ...vuelo,
                horasTotales: vuelo.horasTotales !== undefined 
                    ? vuelo.horasTotales 
                    : Number(sumatoriaSeguridad.toFixed(2))
            };
        });

        // --- 5. CÁLCULO EFICIENTE DEL ODÓMETRO EN MEMORIA ---
        const mapaUltimoF13 = {};
        historialVuelos.forEach(vuelo => {
            const naveId = vuelo.aeronave?._id?.toString() || vuelo.aeronave?.toString();
            if (naveId && !mapaUltimoF13[naveId]) {
                mapaUltimoF13[naveId] = vuelo;
            }
        });

        const detalleFlotaActualizado = aeronaves.map((nave) => {
            const naveIdStr = nave._id.toString();
            const ultimoF13 = mapaUltimoF13[naveIdStr];

            let horasEstructuralesReales = nave.tgPlaneadorActual || nave.inicioAeHs || 0;

            if (ultimoF13) {
                const acumuladoCalculado = ultimoF13.horasTotales !== undefined
                    ? ultimoF13.horasTotales
                    : (Number(ultimoF13.horasALaFecha) || 0) + (Number(ultimoF13.horasDelDia) || 0);
                
                horasEstructuralesReales = Number(acumuladoCalculado.toFixed(2));
            }

            return {
                ...nave,
                horasTotales: horasEstructuralesReales
            };
        });

        // --- 6. TOTALIZADORES PROTEGIDOS ---
        const totalHorasVoladasPeriodo = historialVuelos.reduce((sum, f13) => sum + (Number(f13.horasDelDia) || 0), 0);
        const totalAterrizajesPeriodo = historialVuelos.reduce((sum, f13) => sum + (Number(f13.aterrizajes) || 0), 0);

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