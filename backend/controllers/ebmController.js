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
        
        // 2. Construcción del filtro base (Solo pilotos activos de la escala elegida)
        let query = { 
            grado: { $in: gradosHabilitados }, 
            activo: true
        };

        // 3. EXCEPCIÓN DE JURISDICCIÓN: Si es de COMANDO o ADMIN ve a todos los elementos.
        // Si pertenece a una unidad de línea, se le inyecta la restricción atómica.
        const unidadNormalizada = unidadUser.trim().toUpperCase();
        const esMandoEstrategico = ['COMANDO', 'ADMIN', 'COMANAV'].includes(unidadNormalizada);

        if (!esMandoEstrategico) {
            query.$or = [
                { unidad: unidadUser }, 
                { elemento: unidadUser }
            ];
        }

        // 4. Búsqueda selectiva en base de datos 
        // (Agregamos 'habilitaciones' al select para que el frontend pueda armar el filtro por Sistema de Armas)
        const pilotos = await Tripulante.find(query)
            .select('grado apellido nombre unidad elemento habilitaciones')
            .sort({ grado: 1, apellido: 1 })
            .lean();

        console.log(`✅ Pilotos devueltos para el entorno [${unidadUser}]: ${pilotos.length}`);
        
        // 5. Retorno de la nómina limpia
        res.status(200).json(pilotos);

    } catch (error) {
        console.error("❌ ERROR CRÍTICO EN CONTROLADOR EBM:", error);
        res.status(500).json({ mensaje: "Error interno del servidor al procesar la nómina militar" });
    }
};