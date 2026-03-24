const express = require('express');
const router = express.Router();
const axios = require('axios');

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
         * AJUSTE PARA COMPATIBILIDAD CON WIDGET C2AE
         * Si el frontend pide una sola estación (ej: SADP), devolvemos un objeto 
         * que el widget pueda leer directamente (raw y taf).
         */
        if (req.query.ids && dataFinal.length > 0) {
            const reporte = dataFinal[0];
            return res.json({
                raw: reporte.rawOb || "SIN DATOS METAR",
                taf: reporte.tafRaw || "TAF NO DISPONIBLE"
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