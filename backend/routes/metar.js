const express = require('express');
const router = express.Router();
const axios = require('axios');

/**
 * MÓDULO METEOROLÓGICO OPERATIVO - AVIACIÓN DE EJÉRCITO
 * Fuente: OPMET Internacional (vía NOAA/Aviation Weather)
 * Cubre: Estaciones SMN y Aeródromos Militares/Civiles AR
 */
router.get('/data', async (req, res) => {
    try {
        // 1. Listado de estaciones por defecto (Aviación de Ejército)
        const estacionesDefault = "SAZR,SAHZ,SAZS,SAVC,SAZB,SACO,SAZA,SAZF,SADP,SAAR,SAME,SACA,SARE,SAAP,SANT,SAWU,SAST,SARF,SAZN,SAAV,SAOC,SANE,SACE,SADO,SABE,SAVM,SAWD,SAVE,SAVT,SATM,SARP,SAWG,SADF,SAZM,SAWE,SAZY,SASA,SANU,SATU,SAEM,SARS,SRDR,SAAI,SATR,SASJ,SAWL";
        
        // 2. Tomar IDs de la consulta o usar los de por defecto
        const ids = req.query.ids || estacionesDefault;
        
        console.log(`📡 Sincronizando METAR/TAF para estaciones: ${ids}`);

        // 3. Petición a la red OPMET internacional
        const url = `https://www.aviationweather.gov/api/data/metar?ids=${ids}&format=json&taf=true`;

        const response = await axios.get(url, {
            headers: { 
                'User-Agent': 'Sistema-Gestion-AE-Server/1.0',
                'Accept': 'application/json'
            },
            timeout: 15000 
        });
        
        // 4. VALIDACIÓN CRÍTICA: Asegurar que siempre devolvemos un ARRAY
        // A veces NOAA devuelve un objeto directo si es una sola estación.
        let dataFinal = response.data;

        if (!dataFinal) {
            return res.status(200).json([]);
        }

        if (!Array.isArray(dataFinal)) {
            dataFinal = [dataFinal];
        }

        console.log(`✅ Datos sincronizados: ${dataFinal.length} informes listos.`);

        // 5. Envío de datos al Frontend
        res.json(dataFinal);

    } catch (error) {
        console.error("❌ Error METAR AE:", error.message);
        
        // Si hay error de conexión, devolvemos un error 500 pero con formato JSON
        res.status(500).json({ 
            success: false, 
            message: "Error de conexión con red OPMET",
            details: error.message 
        });
    }
});

module.exports = router;