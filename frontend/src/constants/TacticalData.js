// src/constants/TacticalData.js

export const AEROPUERTOS = [
    { nombre: "SADO - CAMPO DE MAYO", lat: -34.528, lng: -58.641 },
    { nombre: "SAZN - NEUQUÉN", lat: -38.949, lng: -68.143 },
    { nombre: "SAWG - RÍO GALLEGOS", lat: -51.608, lng: -69.312 },
    // Agregá aquí los que faltan siguiendo el mismo formato
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