import React, { useState, useEffect } from 'react';
import EventService from '../services/EventService';

const AEROPUERTOS_ESTANDAR = [
    { nombre: "SADO - Campo de Mayo", lat: -34.528, lng: -58.641 },
    { nombre: "SAZN - Neuquén", lat: -38.949, lng: -68.143 },
    { nombre: "SATU - Curuzú Cuatiá", lat: -29.775, lng: -58.042 },
    { nombre: "SAST - Tartagal", lat: -22.516, lng: -63.791 },
    { nombre: "SADF - San Fernando", lat: -34.453, lng: -58.589 },
    { nombre: "SABE - Aeroparque", lat: -34.559, lng: -58.415 },
    { nombre: "SADP - El Palomar", lat: -34.609, lng: -58.602 },
    { nombre: "SACO - Córdoba", lat: -31.310, lng: -64.208 },
    { nombre: "SASA - Salta", lat: -24.856, lng: -65.486 },
    { nombre: "SAMR - Rosario", lat: -32.903, lng: -60.784 },
    { nombre: "SAME - Mendoza", lat: -32.831, lng: -68.792 },
    { nombre: "SARP - Posadas", lat: -27.385, lng: -55.970 },
    { nombre: "SAWG - Río Gallegos", lat: -51.608, lng: -69.312 },
    { nombre: "SAVC - Comodoro Rivadavia", lat: -45.785, lng: -67.465 },
    { nombre: "SAOR - Río Cuarto", lat: -33.085, lng: -64.261 },
    { nombre: "SAZY - Chapelco", lat: -40.075, lng: -71.139 },
    // Se pueden seguir agregando de la lista provista manteniendo este formato
];

const UNIDADES_AE = [
    "Cte Av Ej", "B Av Ej 601", "Sec Av Ej 6", "Sec Av Ej 3", "Sec Av Ej 9", 
    "Sec Av Ej 12", "Sec Av Ej MI 4", "B Ab Av 601", "B Mantenimiento 601"
];

const CargaTactica = () => {
    const [aeronavesDisponibles, setAeronavesDisponibles] = useState([]);
    const [formData, setFormData] = useState({
        title: '',
        elemento: '',
        notasMarginales: '',
        aeronaveSel: '',
        // Coordenadas GMS (Grados, Minutos, Segundos)
        latG: 34, latM: 31, latS: 40, latDir: 'S',
        lngG: 58, lngM: 38, lngS: 29, lngDir: 'W',
        locNombre: ''
    });

    // Cargar aeronaves E/S disponibles al iniciar
    useEffect(() => {
        const cargarAeronaves = async () => {
            try {
                const elementoUsuario = localStorage.getItem('elemento') || '';
                const data = await EventService.getAvailableAircraft(elementoUsuario);
                setAeronavesDisponibles(data || []);
            } catch (error) {
                console.error("Error cargando flota disponible");
            }
        };
        cargarAeronaves();
    }, []);

    // Conversor de GMS a Decimal para Leaflet
    const toDecimal = (g, m, s, dir) => {
        let dec = parseFloat(g) + parseFloat(m) / 60 + parseFloat(s) / 3600;
        return (dir === 'S' || dir === 'W') ? dec * -1 : dec;
    };

    const handleAeropuerto = (e) => {
        const apto = AEROPUERTOS_ESTANDAR.find(p => p.nombre === e.target.value);
        if (apto) {
            // Aquí podrías opcionalmente desglosar decimal a GMS, 
            // pero para simplificar seteamos el nombre y el payload usará los decimales
            setFormData({ ...formData, locNombre: apto.nombre });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const latDec = toDecimal(formData.latG, formData.latM, formData.latS, formData.latDir);
        const lngDec = toDecimal(formData.lngG, formData.lngM, formData.lngS, formData.lngDir);

        const payload = {
            title: `${formData.aeronaveSel} - ${formData.title}`,
            start: new Date(),
            end: new Date(new Date().getTime() + 6 * 60 * 60 * 1000), 
            elemento: formData.elemento,
            etapa: 'ordenada',
            isRealTime: true,
            status: 'en_curso',
            ubicacion: {
                nombre: formData.locNombre || 'Posición por Coordenadas',
                lat: latDec,
                lng: lngDec
            },
            notasMarginales: formData.notasMarginales,
            color: '#e67e22' 
        };

        try {
            await EventService.createEvent(payload);
            alert("🚀 MISIÓN LANZADA AL MAPA TÁCTICO");
            setFormData({ ...formData, title: '', notasMarginales: '' });
        } catch (error) {
            alert("Error en el despacho de misión");
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.card}>
                <h2 style={styles.title}>⚡ DESPACHO TÁCTICO</h2>
                <p style={styles.subtitle}>Mando y Control - Aviación de Ejército</p>
                
                <form onSubmit={handleSubmit}>
                    {/* 1. Selector de Aeronave E/S */}
                    <label style={styles.label}>Aeronave (En Servicio):</label>
                    <select 
                        style={styles.input} 
                        required 
                        value={formData.aeronaveSel}
                        onChange={(e) => setFormData({...formData, aeronaveSel: e.target.value})}
                    >
                        <option value="">Seleccione Aeronave...</option>
                        {aeronavesDisponibles.map(a => (
                            <option key={a._id} value={`${a.sda} ${a.matricula}`}>
                                {a.sda} - {a.matricula} ({a.unidad})
                            </option>
                        ))}
                    </select>

                    {/* 2. Nombre de la Operación */}
                    <label style={styles.label}>Indicativo / Nombre de Operación:</label>
                    <input 
                        style={styles.input}
                        placeholder="Ej: APOYO FUEGO INCENDIO"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value.toUpperCase()})}
                        required
                    />

                    <label style={styles.label}>Unidad Responsable:</label>
                    <select 
                        style={styles.input}
                        value={formData.elemento}
                        onChange={(e) => setFormData({...formData, elemento: e.target.value})}
                        required
                    >
                        <option value="">Seleccione Unidad...</option>
                        {UNIDADES_AE.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>

                    {/* Selector de Aeropuertos */}
                    <div style={styles.geoBox}>
                        <label style={styles.label}>Despliegue (Puntos Notables):</label>
                        <select onChange={handleAeropuerto} style={styles.input}>
                            <option value="">Cargar desde Aeródromo...</option>
                            {AEROPUERTOS_ESTANDAR.map(p => <option key={p.nombre} value={p.nombre}>{p.nombre}</option>)}
                        </select>
                        
                        <label style={styles.label}>Coordenadas Exactas (GMS):</label>
                        {/* Latitud GMS */}
                        <div style={styles.row}>
                            <input type="number" placeholder="G" style={styles.inputTriple} onChange={(e)=>setFormData({...formData, latG: e.target.value})} value={formData.latG}/>
                            <input type="number" placeholder="M" style={styles.inputTriple} onChange={(e)=>setFormData({...formData, latM: e.target.value})} value={formData.latM}/>
                            <input type="number" placeholder="S" style={styles.inputTriple} onChange={(e)=>setFormData({...formData, latS: e.target.value})} value={formData.latS}/>
                            <select style={styles.inputShort} onChange={(e)=>setFormData({...formData, latDir: e.target.value})} value={formData.latDir}>
                                <option value="S">S</option><option value="N">N</option>
                            </select>
                        </div>
                        {/* Longitud GMS */}
                        <div style={styles.row}>
                            <input type="number" placeholder="G" style={styles.inputTriple} onChange={(e)=>setFormData({...formData, lngG: e.target.value})} value={formData.lngG}/>
                            <input type="number" placeholder="M" style={styles.inputTriple} onChange={(e)=>setFormData({...formData, lngM: e.target.value})} value={formData.lngM}/>
                            <input type="number" placeholder="S" style={styles.inputTriple} onChange={(e)=>setFormData({...formData, lngS: e.target.value})} value={formData.lngS}/>
                            <select style={styles.inputShort} onChange={(e)=>setFormData({...formData, lngDir: e.target.value})} value={formData.lngDir}>
                                <option value="W">W</option><option value="E">E</option>
                            </select>
                        </div>
                    </div>

                    <label style={styles.label}>Info Marginal (TRIPULACIÓN / CARGA / COMBUSTIBLE):</label>
                    <textarea 
                        style={styles.textarea}
                        placeholder="Ej: TRIP: MY PEREZ, TEN DUARTE / CARGA: 400KG MEDICAMENTOS / COMB: 450 LBS"
                        value={formData.notasMarginales}
                        onChange={(e) => setFormData({...formData, notasMarginales: e.target.value.toUpperCase()})}
                        required
                    />

                    <button type="submit" style={styles.btn}>LANZAR MISIÓN AL MAPA</button>
                </form>
            </div>
        </div>
    );
};

const styles = {
    page: { padding: '20px', display: 'flex', justifyContent: 'center', backgroundColor: '#121212', minHeight: '100vh' },
    card: { backgroundColor: '#1e272e', color: 'white', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '600px', border: '1px solid #f39c12' },
    title: { color: '#f39c12', margin: '0', textAlign: 'center', fontSize: '1.5rem' },
    subtitle: { textAlign: 'center', fontSize: '0.75rem', marginBottom: '20px', letterSpacing: '2px' },
    label: { display: 'block', marginBottom: '5px', fontSize: '0.8rem', fontWeight: 'bold', color: '#bdc3c7' },
    input: { width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '4px', border: 'none', backgroundColor: '#2f3542', color: 'white' },
    inputTriple: { width: '25%', padding: '10px', marginBottom: '10px', borderRadius: '4px', border: 'none', backgroundColor: '#2f3542', color: 'white', textAlign: 'center' },
    inputShort: { width: '20%', padding: '10px', marginBottom: '10px', borderRadius: '4px', border: 'none', backgroundColor: '#f39c12', color: 'black', fontWeight: 'bold' },
    row: { display: 'flex', justifyContent: 'space-between', marginBottom: '5px' },
    geoBox: { padding: '15px', backgroundColor: '#3d4451', borderRadius: '8px', marginBottom: '15px' },
    textarea: { width: '100%', height: '100px', padding: '12px', borderRadius: '6px', backgroundColor: '#2f3542', color: 'white', border: 'none', resize: 'none', marginBottom: '10px' },
    btn: { width: '100%', padding: '15px', backgroundColor: '#d35400', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem', transition: '0.3s' }
};

export default CargaTactica;