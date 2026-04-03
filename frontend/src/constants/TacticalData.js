// src/constants/TacticalData.js

export const AEROPUERTOS = [
    // --- AMBA & BUENOS AIRES ---
    { nombre: "SADO - CAMPO DE MAYO", lat: -34.528, lng: -58.641 },
    { nombre: "SABE - AEROPARQUE J. NEWBERY", lat: -34.558, lng: -58.416 },
    { nombre: "SAEZ - EZEIZA / PISTARINI", lat: -34.822, lng: -58.535 },
    { nombre: "SADP - EL PALOMAR", lat: -34.609, lng: -58.602 },
    { nombre: "SADM - MORÓN", lat: -34.675, lng: -58.645 },
    { nombre: "SADF - SAN FERNANDO", lat: -34.453, lng: -58.590 },
    { nombre: "SADL - LA PLATA", lat: -34.972, lng: -57.894 },
    { nombre: "SADJ - MARIANO MORENO", lat: -34.556, lng: -58.790 },
    { nombre: "SAZB - BAHÍA BLANCA", lat: -38.724, lng: -62.169 },
    { nombre: "SAZM - MAR DEL PLATA", lat: -37.934, lng: -57.573 },
    { nombre: "SAZT - TANDIL", lat: -37.236, lng: -59.227 },
    { nombre: "SAZV - VILLA GESELL", lat: -37.235, lng: -57.027 },

    // --- CENTRO & CUYO ---
    { nombre: "SACO - CÓRDOBA / AMBROSIO TARAVELLA", lat: -31.310, lng: -64.208 },
    { nombre: "SAOC - RÍO CUARTO", lat: -33.125, lng: -64.261 },
    { nombre: "SAOR - VILLA REYNOLDS", lat: -33.725, lng: -65.380 },
    { nombre: "SAME - MENDOZA / EL PLUMERILLO", lat: -32.831, lng: -68.792 },
    { nombre: "SAMR - SAN RAFAEL", lat: -34.588, lng: -68.403 },
    { nombre: "SANU - SAN JUAN", lat: -31.571, lng: -68.418 },
    { nombre: "SAOU - SAN LUIS", lat: -33.272, lng: -66.355 },
    { nombre: "SAOS - VALLE DEL CONLARA", lat: -32.385, lng: -65.185 },

    // --- NOROESTE (NOA) ---
    { nombre: "SASA - SALTA / GÜEMES", lat: -24.856, lng: -65.486 },
    { nombre: "SASJ - JUJUY / GUZMÁN", lat: -24.392, lng: -64.913 },
    { nombre: "SANT - TUCUMÁN", lat: -26.840, lng: -65.104 },
    { nombre: "SANL - LA RIOJA", lat: -29.380, lng: -66.795 },
    { nombre: "SANC - CATAMARCA", lat: -28.593, lng: -65.751 },
    { nombre: "SANE - SANTIAGO DEL ESTERO", lat: -27.766, lng: -64.310 },
    { nombre: "SANR - TERMAS DE RÍO HONDO", lat: -27.508, lng: -64.935 },

    // --- NORESTE & LITORAL (NEA) ---
    { nombre: "SARE - RESISTENCIA", lat: -27.449, lng: -59.056 },
    { nombre: "SARC - CORRIENTES", lat: -27.445, lng: -58.761 },
    { nombre: "SARP - POSADAS", lat: -27.385, lng: -55.971 },
    { nombre: "SARI - IGUAZÚ", lat: -25.737, lng: -54.473 },
    { nombre: "SARF - FORMOSA", lat: -26.213, lng: -58.233 },
    { nombre: "SAAR - ROSARIO", lat: -32.903, lng: -60.784 },
    { nombre: "SAAV - SANTA FE / SAUCE VIEJO", lat: -31.711, lng: -60.812 },
    { nombre: "SAAP - PARANÁ", lat: -31.794, lng: -60.480 },

    // --- PATAGONIA ---
    { nombre: "SAZN - NEUQUÉN", lat: -38.949, lng: -68.143 },
    { nombre: "SAZS - BARILOCHE", lat: -41.151, lng: -71.157 },
    { nombre: "SAZY - SAN MARTÍN DE LOS ANDES", lat: -40.075, lng: -71.231 },
    { nombre: "SAVV - VIEDMA", lat: -40.869, lng: -63.003 },
    { nombre: "SAVT - TRELEW", lat: -43.210, lng: -65.270 },
    { nombre: "SAVC - COMODORO RIVADAVIA", lat: -45.785, lng: -67.465 },
    { nombre: "SAWG - RÍO GALLEGOS", lat: -51.608, lng: -69.312 },
    { nombre: "SAWE - RÍO GRANDE", lat: -53.777, lng: -67.749 },
    { nombre: "SAWH - USHUAIA", lat: -54.843, lng: -68.295 },
    { nombre: "SAWC - EL CALAFATE", lat: -50.280, lng: -72.053 },
    { nombre: "SAVE - ESQUEL", lat: -42.907, lng: -71.139 },

    // --- LAD & HELIPUERTOS ESTRATÉGICOS ---
    { nombre: "LADH - CASA DE GOBIERNO", lat: -34.608, lng: -58.370 },
    { nombre: "LADH - HOSPITAL MILITAR CENTRAL", lat: -34.572, lng: -58.435 },
    { nombre: "LAD - CURUZÚ CUATIÁ (EJÉRCITO)", lat: -29.771, lng: -58.016 },
    { nombre: "LAD - APÓSTOLES", lat: -27.915, lng: -55.761 },
    { nombre: "LAD - TARTAGAL", lat: -22.518, lng: -63.791 },
    { nombre: "LAD - PASO DE LOS LIBRES", lat: -29.689, lng: -57.152 },
    { nombre: "LAD - SAN JULIÁN", lat: -49.308, lng: -67.801 },
    { nombre: "SABC - EDIFICIO CÓNDOR (FAA)", lat: -34.585, lng: -58.368 }
];

export const UNIDADES_EJERCITO = [
    "B HELIC ASAL 601",
    "B AV APY COMB 601",
    "SEC AE M 6",
    "ESC AV EXPL ATQ 602",
    "SEC AE 11",
];

export const TRIPULACION = {
    pilotos: ["CAP PEREZ", "TEN GARCIA", "MAY RODRIGUEZ", "S/D"],
    copilotos: ["TEN LOPEZ", "SUBTEN MARTINEZ", "S/D"],
    mecanicos: ["SARG VERA", "CPAL GOMEZ", "S/D"]
};

export const CLASIFICACION_SDA = {
    'C-212': 'ala_fija',
    'C-208': 'ala_fija',
    'UH-1H': 'ala_rotativa',
    'BELL 212': 'ala_rotativa',
};
export const TIPOS_DE_APOYO = [
    "PATRON BASICO",
    "PATRON NOCTURNO",
    "PATRON INSTRUMENTAL",
    "TRANSPORTE DE PERSONAL",
    "PATRON DE RAPPEL",
    "PATRON DE CARGA EXTERNA",
    "LANZAMIENTO DE PARACAIDISTAS",
    "LANZAMIENTO DE BUZOS",
    "PATRON TACTICO",
    "PATRON DE FORMACION",
    "NAVEGACION",
    "EJERCICIO MEDEVAC",
    "TIRO DESDE AERONAVES",
    "CALIFICACION",
    "HABILITACION",
    "EMERGENCIAS 1",
    "EMERGENCIAS 2",
    "VUELO OFICIAL",
    "APOYO GENERAL",
    "PLAN NACIONAL DE MANEJO DEL FUEGO",
    "APOYO HUMANITARIO",
    "SANITARIO",
    "HELIBALDE",
    "VUELO DE MANTENIMIENTO",
    "VUELO DE PRUEBA",
    "COMBATE EN GENERAL",
    "COMBATE SIN ENEMIGO DETECTADO",
    "COMBATE CON ENEMIGO DETECTADO",
    "TRASLADO DE AERONAVE",
    "CURSO BASICO CONJUNTO DE PILOTO DE HELICOPTERO"
];