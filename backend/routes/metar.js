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
        // Si el frontend envía ?ids=SADP, usamos ese. Si no, cargamos toda la red operativa.
        const ids = req.query.ids || estacionesDefault;
        
        console.log(`📡 SOLICITUD OPMET: Sincronizando METAR/TAF para: ${ids}`);

        /**
         * 3. PETICIÓN A RED INTERNACIONAL (NOAA API v2)
         * - ids: Estaciones OACI
         * - format: json para procesamiento directo
         * - taf: true para incluir pronóstico de terminal
         */
        const url = `https://www.aviationweather.gov/api/data/metar?ids=${ids}&format=json&taf=true`;

        const response = await axios.get(url, {
            headers: { 
                'User-Agent': 'Sistema-C2AE-Argentina/1.1',
                'Accept': 'application/json'
            },
            timeout: 12000 // Tiempo límite de espera para evitar bloqueos del server
        });
        
        let dataFinal = response.data;

        // 4. PROTOCOLO DE INTEGRACIÓN DE DATOS
        // Si no hay datos, enviamos array vacío para no romper el .map() del frontend
        if (!dataFinal || dataFinal.length === 0) {
            console.warn(`⚠️ AVISO: No se encontraron reportes activos para: ${ids}`);
            return res.status(200).json([]);
        }

        // VALIDACIÓN CRÍTICA: NOAA a veces devuelve un objeto {} en lugar de [] si es una sola estación.
        // Forzamos que siempre sea un Array para que el Frontend no falle.
        if (!Array.isArray(dataFinal)) {
            dataFinal = [dataFinal];
        }

        console.log(`✅ SINCRONIZACIÓN EXITOSA: ${dataFinal.length} reportes procesados.`);

        // 5. ENVÍO DE DATOS AL FRONTEND
        res.json(dataFinal);

    } catch (error) {
        // Log detallado para el administrador en consola
        console.error("❌ ERROR CRÍTICO METAR AE:", error.message);
        
        // Respuesta de seguridad JSON
        res.status(500).json({ 
            success: false, 
            message: "Error de enlace con la red meteorológica internacional.",
            details: process.env.NODE_ENV === 'development' ? error.message : "Falla de conexión externa"
        });
    }
});

module.exports = router;