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

        // --- 2. OBTENER FLOTA (QUERY 1) ---
        const aeronaves = await Aircraft.find(filtroAeronave)
            .select('matricula sda unidad estadoOperativo tgPlaneadorActual inicioAeHs tipoIcono')
            .lean();

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
            // Si el objeto quedó vacío por fechas inválidas, lo eliminamos
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
            const sumatoriaSeguridad = (vuelo.horasALaFecha || 0) + (vuelo.horasDelDia || 0);
            return {
                ...vuelo,
                horasTotales: vuelo.horasTotales !== undefined 
                    ? vuelo.horasTotales 
                    : Number(sumatoriaSeguridad.toFixed(2))
            };
        });

        // --- 5. CÁLCULO EFICIENTE DEL ODÓMETRO EN MEMORIA (SIN QUERIES EXTRA) ---
        // Mapeamos el último F13 de cada aeronave buscando en la lista ya ordenada
        const mapaUltimoF13 = {};
        historialVuelos.forEach(vuelo => {
            const naveId = vuelo.aeronave?._id?.toString() || vuelo.aeronave?.toString();
            if (naveId && !mapaUltimoF13[naveId]) {
                mapaUltimoF13[naveId] = vuelo; // Al estar ordenado por fecha DESC, el primero que entra es el último
            }
        });

        const detalleFlotaActualizado = aeronaves.map((nave) => {
            const naveIdStr = nave._id.toString();
            const ultimoF13 = mapaUltimoF13[naveIdStr];

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
        });

        // --- 6. TOTALIZADORES ---
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