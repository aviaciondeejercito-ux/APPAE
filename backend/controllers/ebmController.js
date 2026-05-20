const Tripulante = require('../models/Tripulante');

exports.getPlanificacionCompleta = async (req, res) => {
    try {
        // Captura dinámica de la unidad o elemento desde la sesión inyectada por el middleware 'protect'
        const unidadUser = req.user?.unidad || req.user?.elemento;
        
        console.log(`📡 Petición de nómina EBM recibida para la unidad del usuario: ${unidadUser || 'SIN UNIDAD DEFINIDA'}`);

        // Si por algún error de sesión no viene la unidad, cortamos la petición por seguridad operativa
        if (!unidadUser) {
            return res.status(400).json({ 
                success: false, 
                mensaje: "No se pudo determinar la unidad operativa del usuario actual." 
            });
        }
        
        // 1. Lista de grados oficiales habilitados para pilotos (Escala de Oficiales)
        const gradosHabilitados = ['CR', 'TC', 'MY', 'CT', 'TP', 'TT', 'ST'];
        
        // 2. Construcción del filtro atómico (Solo activos, de la escala elegida y que pertenezcan a la unidad)
        let query = { 
            grado: { $in: gradosHabilitados }, 
            activo: true,
            $or: [
                { unidad: unidadUser }, 
                { elemento: unidadUser }
            ]
        };

        // 3. Búsqueda selectiva en base de datos
        const pilotos = await Tripulante.find(query)
            .select('grado apellido nombre unidad elemento')
            .sort({ grado: 1, apellido: 1 })
            .lean();

        console.log(`✅ Pilotos de la unidad [${unidadUser}] encontrados: ${pilotos.length}`);
        
        // 4. Retorno de la nómina limpia
        res.status(200).json(pilotos);

    } catch (error) {
        console.error("❌ ERROR CRÍTICO EN CONTROLADOR EBM:", error);
        res.status(500).json({ mensaje: "Error interno del servidor al procesar la nómina militar" });
    }
};