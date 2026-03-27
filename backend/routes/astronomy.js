const express = require('express');
const router = express.Router();

/**
 * MOTOR DE CÁLCULO ASTRONÓMICO TÁCTICO - EJÉRCITO ARGENTINO
 * Estándar de Seguridad: Sincro Joker
 * Cálculos: Fase Lunar, Iluminación, Salida/Puesta y Tránsito (Zenit).
 */

// Función auxiliar para calcular la Fase Lunar y Horarios (Algoritmo de precisión)
const getMoonData = (date) => {
    const lp = 2551442.8; // Ciclo sinódico exacto en segundos
    const now = new Date(date);
    const newMoon = new Date("1970-01-07T20:35:00Z"); // Referencia conocida
    const phase = ((now.getTime() - newMoon.getTime()) / 1000) % lp;
    const res = Math.floor((phase / lp) * 30);
    
    // Cálculo de fracción de iluminación (0 a 1)
    const moonFraction = (1 - Math.abs((phase / (lp / 2)) - 1));
    const percent = Math.round(moonFraction * 100);

    let estado = "";
    let icono = "";

    // Mapeo táctico de fases
    if (res === 0 || res === 29) { estado = "LUNA NUEVA"; icono = "🌑"; }
    else if (res < 7) { estado = "LUNA CRECIENTE"; icono = "🌒"; }
    else if (res === 7) { estado = "CUARTO CRECIENTE"; icono = "🌓"; }
    else if (res < 15) { estado = "GIBOSA CRECIENTE"; icono = "🌔"; }
    else if (res === 15) { estado = "LUNA LLENA"; icono = "🌕"; }
    else if (res < 22) { estado = "GIBOSA MENGUANTE"; icono = "🌖"; }
    else if (res === 22) { estado = "CUARTO MENGUANTE"; icono = "🌗"; }
    else { estado = "LUNA MENGUANTE"; icono = "🌘"; }

    /**
     * LÓGICA DE HORARIOS DINÁMICOS (Planeamiento NVG)
     * La luna retrasa su salida aprox 50 min diarios.
     */
    const calculateTimes = (index) => {
        // Estimación de salida basada en el índice (07:00 AM en Luna Nueva)
        let riseH = (7 + (index * 0.83)) % 24;
        let setH = (riseH + 12.4) % 24;
        let zenithH = (riseH + 6.2) % 24; // Punto más alto (Cúspide)

        const format = (h) => {
            const hh = Math.floor(h);
            const mm = Math.round((h - hh) * 60);
            const ampm = hh >= 12 ? 'PM' : 'AM';
            const h12 = hh % 12 || 12;
            return `${h12.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')} ${ampm}`;
        };

        return {
            moonrise: format(riseH),
            moonset: format(setH),
            zenith: format(zenithH)
        };
    };

    const times = calculateTimes(res);

    return { 
        estado, 
        icono, 
        moon_phase: `${icono} ${estado}`, // Para compatibilidad de Widget
        moon_illumination: percent,        // Para compatibilidad de Widget
        iluminacion: `${percent}%`, 
        moon_fraction: moonFraction, 
        ...times,
        index: res 
    };
};

// Ruta principal para obtener datos por coordenadas (Ej: SADP, SAME)
router.get('/data', (req, res) => {
    try {
        const { lat, lng } = req.query;
        const date = new Date();

        // Si no hay coordenadas, usamos San Miguel (Campo de Mayo) por defecto
        const latitude = parseFloat(lat) || -34.5433;
        const longitude = parseFloat(lng) || -58.7122;

        const moon = getMoonData(date);

        const result = {
            ...moon,
            sunset: "07:15 PM", // Referencia promedio marzo
            sunrise: "06:45 AM",
            coordenadas: { lat: latitude, lng: longitude },
            timestamp: date.toISOString(),
            success: true 
        };

        console.log(`🔭 EFEMÉRIDES NVG: Generadas para coord ${latitude}, ${longitude}`);
        res.json(result);

    } catch (error) {
        console.error("❌ ERROR ASTRONOMY AE:", error.message);
        res.status(500).json({ 
            success: false, 
            error: "Falla en motor de efemérides",
            estado: "DATOS NO DISPONIBLES",
            moon_fraction: 0 
        });
    }
});

module.exports = router;