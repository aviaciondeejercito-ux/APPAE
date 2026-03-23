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
        const estacionesDefault = "SAZR,SAHZ,SAZS,SAVC,SAZB,SACO,SAZA,SAZF,SADP,SAAR,SAME,SACA,SARE,SAAP,SANT,SAWU,SAST,SARF,SAZN,SAAV,SAOC,SANE,SACE,SADO,SABE,SAVM,SAWD,SAVE,SAVT,SATM,SARP,SAWG,SADF,SAZM,SAWE,SAZY,SASA,SANU,SATU,SAEM,SARS,SRDR,SAAI,SATR,SASJ,SAWL";
        const ids = req.query.ids || estacionesDefault;
        
        console.log(`📡 Sincronizando METAR/TAF para ${ids.split(',').length} estaciones...`);

        const url = `https://www.aviationweather.gov/api/data/metar?ids=${ids}&format=json&taf=true`;

        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Sistema-Gestion-AE-Server/1.0' },
            timeout: 15000 
        });
        
        if (!response.data || response.data.length === 0) {
            return res.status(200).json([]);
        }

        // Enviamos solo la data necesaria
        res.json(response.data);

    } catch (error) {
        console.error("❌ Error METAR AE:", error.message);
        res.status(500).json({ success: false, message: "Error de conexión con red OPMET" });
    }
});

module.exports = router;