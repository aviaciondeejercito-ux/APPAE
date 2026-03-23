// backend/routes/metar.js
const express = require('express');
const router = express.Router();
const axios = require('axios');

/**
 * MÓDULO METEOROLÓGICO OPERATIVO - AVIACIÓN DE EJÉRCITO
 * @route GET /api/weather/data (o /api/metar/data según tu server.js)
 * @desc Proxy seguro para obtener METAR y TAF de la NOAA evitando errores de CORS.
 */
router.get('/data', async (req, res) => {
    try {
        // Listado completo de estaciones estratégicas y de la red de la Aviación de Ejército
        const ids = "SAZR,SAHZ,SAZS,SAVC,SAZB,SACO,SAZA,SAZF,SADP,SAAR,SAME,SACA,SARE,SAAP,SANT,SAWU,SAST,SARF,SAZN,SAAV,SAOC,SANE,SACE,SADO,SABE,SAVM,SAWD,SAVE,SAVT,SATM,SARP,SAWG,SADF,SAZM,SAWE,SAZY,SASA,SANU,SATU,SAEM,SARS,SRDR,SAAI,SATR,SASJ,SAWL";
        
        console.log(`📡 Protocolo METAR: Solicitando actualización para ${ids.split(',').length} estaciones...`);

        // Realizamos la petición a la NOAA
        const response = await axios.get(`https://www.aviationweather.gov/api/data/metar?ids=${ids}&format=json&taf=true`, {
            headers: {
                // Es vital incluir un User-Agent para que la API de NOAA no rechace la conexión del servidor
                'User-Agent': 'Sistema-Gestion-AE-Server/1.0'
            },
            timeout: 10000 // 10 segundos de espera máxima
        });
        
        // Verificamos si hay datos
        if (!response.data) {
            throw new Error("La respuesta de NOAA está vacía");
        }

        console.log("✅ Datos meteorológicos sincronizados correctamente.");
        
        // Devolvemos los datos tal cual los recibe el servidor (formato JSON)
        res.json(response.data);

    } catch (error) {
        console.error("❌ Error en Proxy METAR del Servidor AE:", error.message);
        
        // Respuesta de error controlada para que el Frontend no se rompa
        res.status(500).json({ 
            error: "Error al obtener datos de NOAA",
            details: error.message 
        });
    }
});

module.exports = router;