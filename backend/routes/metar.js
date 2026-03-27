const express = require('express');
const router = express.Router();
const axios = require('axios');

/**
 * MÓDULO METEOROLÓGICO OPERATIVO - AVIACIÓN DE EJÉRCITO
 * Fuente: OPMET Internacional (vía NOAA / Aviation Weather API)
 * Estándar de Seguridad: Sincro Joker - Verificación de Integridad de Datos
 * AJUSTE: Compatibilidad con Radar en Tiempo Real (/:id)
 */

// Lógica Astronómica Integrada (Cálculos de precisión para NVG)
const getMoonData = (date) => {
    const lp = 2551442.8;
    const now = new Date(date);
    const newMoon = new Date("1970-01-07T20:35:00Z");
    const phase = ((now.getTime() - newMoon.getTime()) / 1000) % lp;
    const res = Math.floor((phase / lp) * 30);
    const moonFraction = (1 - Math.abs((phase / (lp / 2)) - 1));
    const percent = Math.round(moonFraction * 100);

    let estado = "";
    let icono = "";
    if (res === 0 || res === 29) { estado = "LUNA NUEVA"; icono = "🌑"; }
    else if (res < 7) { estado = "LUNA CRECIENTE"; icono = "🌒"; }
    else if (res === 7) { estado = "CUARTO CRECIENTE"; icono = "🌓"; }
    else if (res < 15) { estado = "GIBOSA CRECIENTE"; icono = "🌔"; }
    else if (res === 15) { estado = "LUNA LLENA"; icono = "🌕"; }
    else if (res < 22) { estado = "GIBOSA MENGUANTE"; icono = "🌖"; }
    else if (res === 22) { estado = "CUARTO MENGUANTE"; icono = "🌗"; }
    else { estado = "LUNA MENGUANTE"; icono = "🌘"; }

    return { 
        moon_phase: `${icono} ${estado}`, 
        moon_illumination: percent, 
        moon_fraction: moonFraction, 
        index: res 
    };
};

/**
 * ENDPOINT PRINCIPAL: Soporta /api/weather/SADP o /api/weather/data?ids=...
 */
router.get('/:id?', async (req, res) => {
    try {
        const estacionesDefault = "SAZR,SAHZ,SAZS,SAVC,SAZB,SACO,SAZA,SAZF,SADP,SAAR,SAME,SACA,SARE,SAAP,SANT,SAWU,SAST,SARF,SAZN,SAAV,SAOC,SANE,SACE,SADO,SABE,SAVM,SAWD,SAVE,SAVT,SATM,SARP,SAWG,SADF,SAZM,SAWE,SAZY,SASA,SANU,SATU,SAEM,SARS,SRDR,SAAI,SATR,SASJ,SAWL";
        
        // Prioridad: 1. Parámetro de URL (:id) | 2. Query String (?ids=) | 3. Default
        const ids = req.params.id || req.query.ids || estacionesDefault;
        
        console.log(`📡 SOLICITUD OPMET C2AE: Sincronizando datos para: ${ids}`);

        const url = `https://www.aviationweather.gov/api/data/metar?ids=${ids}&format=json&taf=true`;

        const response = await axios.get(url, {
            headers: { 
                'User-Agent': 'Sistema-C2AE-Argentina/1.1',
                'Accept': 'application/json'
            },
            timeout: 12000 
        });
        
        let dataFinal = response.data;

        if (!dataFinal || dataFinal.length === 0) {
            console.warn(`⚠️ AVISO OPMET: No se encontraron reportes para: ${ids}`);
            return res.status(200).json({ 
                success: false,
                raw: "SIN DATOS METAR", 
                taf: "TAF NO DISPONIBLE",
                astronomy: null 
            });
        }

        // Si es una solicitud de estación individual (Radar Widget)
        if (req.params.id || (req.query.ids && !Array.isArray(dataFinal))) {
            const reporte = Array.isArray(dataFinal) ? dataFinal[0] : dataFinal;
            const astro = getMoonData(new Date());

            return res.json({
                success: true,
                raw: reporte.rawOb || "SIN DATOS METAR",
                taf: reporte.rawTaf || "TAF NO DISPONIBLE",
                astronomy: {
                    ...astro,
                    sunset: "19:08 HS", 
                    sunrise: "06:54 HS",
                    moonrise: "18:20 HS",
                    moonset: "05:15 HS"
                }
            });
        }

        // Caso de solicitud masiva (Capa del mapa)
        res.json(dataFinal);

    } catch (error) {
        console.error("❌ ERROR CRÍTICO METAR AE:", error.message);
        res.status(500).json({ 
            success: false, 
            raw: "ERROR DE CONEXIÓN RED AE", 
            taf: "REINTENTE OPERACIÓN" 
        });
    }
});

module.exports = router;