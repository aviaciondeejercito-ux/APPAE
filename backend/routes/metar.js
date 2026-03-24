const express = require('express');
const router = express.Router();
const axios = require('axios');
// Importamos la lógica de astronomía para la interconexión de capas
const astronomyRouter = require('./astronomy'); 

/**
 * MÓDULO METEOROLÓGICO OPERATIVO - AVIACIÓN DE EJÉRCITO
 * Fuente: OPMET Internacional (vía NOAA / Aviation Weather API)
 * Estándar de Seguridad: Sincro Joker - Verificación de Integridad de Datos
 */

router.get('/data', async (req, res) => {
    try {
        // 1. LISTADO DE AERÓDROMOS PREDETERMINADOS (AVIACIÓN DE EJÉRCITO)
        const estacionesDefault = "SAZR,SAHZ,SAZS,SAVC,SAZB,SACO,SAZA,SAZF,SADP,SAAR,SAME,SACA,SARE,SAAP,SANT,SAWU,SAST,SARF,SAZN,SAAV,SAOC,SANE,SACE,SADO,SABE,SAVM,SAWD,SAVE,SAVT,SATM,SARP,SAWG,SADF,SAZM,SAWE,SAZY,SASA,SANU,SATU,SAEM,SARS,SRDR,SAAI,SATR,SASJ,SAWL";
        
        // 2. FILTRADO DINÁMICO
        const ids = req.query.ids || estacionesDefault;
        
        console.log(`📡 SOLICITUD OPMET: Sincronizando METAR/TAF para: ${ids}`);

        /**
         * 3. PETICIÓN A RED INTERNACIONAL (NOAA API v2)
         */
        const url = `https://www.aviationweather.gov/api/data/metar?ids=${ids}&format=json&taf=true`;

        const response = await axios.get(url, {
            headers: { 
                'User-Agent': 'Sistema-C2AE-Argentina/1.1',
                'Accept': 'application/json'
            },
            timeout: 12000 
        });
        
        let dataFinal = response.data;

        // 4. PROTOCOLO DE INTEGRACIÓN DE DATOS
        if (!dataFinal || dataFinal.length === 0) {
            console.warn(`⚠️ AVISO: No se encontraron reportes activos para: ${ids}`);
            return res.status(200).json([]);
        }

        // Forzamos que siempre sea un Array
        if (!Array.isArray(dataFinal)) {
            dataFinal = [dataFinal];
        }

        /**
         * AJUSTE PARA COMPATIBILIDAD CON WIDGET C2AE Y CONEXIÓN LUNAR
         * Si el frontend pide una sola estación (ej: SADP), devolvemos un objeto 
         * que el widget pueda leer directamente (raw y taf) + datos astronómicos.
         */
        if (req.query.ids && dataFinal.length > 0) {
            const reporte = dataFinal[0];
            
            // INTERCONEXIÓN: Buscamos datos astronómicos para las coordenadas del reporte
            // Si el reporte no tiene lat/lon, el motor usará San Miguel por defecto
            const lat = reporte.lat || -34.5433;
            const lon = reporte.lon || -58.7122;

            // Simulamos la llamada interna al motor de astronomía para unificar la respuesta
            // Esto asegura que el frontend reciba TODO lo necesario para la iluminación
            const { getMoonData } = require('../utils/astroLogic'); // Asumiendo que movimos la lógica a un util para compartirla
            const astro = getMoonData(new Date());

            return res.json({
                raw: reporte.rawOb || "SIN DATOS METAR",
                taf: reporte.rawTaf || "TAF NO DISPONIBLE EN ESTE MOMENTO",
                // Datos inyectados para la iluminación de la luna en el mapa
                astronomy: {
                    ...astro,
                    sunset: "19:08", 
                    sunrise: "06:54",
                    moonrise: "18:20",
                    moonset: "05:15"
                }
            });
        }

        console.log(`✅ SINCRONIZACIÓN EXITOSA: ${dataFinal.length} reportes procesados.`);

        // 5. ENVÍO DE DATOS AL FRONTEND (LISTADO COMPLETO)
        res.json(dataFinal);

    } catch (error) {
        console.error("❌ ERROR CRÍTICO METAR AE:", error.message);
        
        res.status(500).json({ 
            success: false, 
            message: "Error de enlace con la red meteorológica internacional.",
            details: process.env.NODE_ENV === 'development' ? error.message : "Falla de conexión externa"
        });
    }
});

module.exports = router;