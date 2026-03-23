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
    { nombre: "SAZR - Santa Rosa", lat: -36.588, lng: -64.276 },
    { nombre: "SAHZ - Zapala", lat: -38.975, lng: -70.113 },
    { nombre: "SAZS - Bariloche", lat: -41.151, lng: -71.157 },
    { nombre: "SAZB - Bahía Blanca", lat: -38.718, lng: -62.169 },
    { nombre: "SAZA - Azul", lat: -36.840, lng: -59.882 },
    { nombre: "SAZF - Olavarría", lat: -36.889, lng: -60.226 },
    { nombre: "SAAP - Paraná", lat: -31.794, lng: -60.480 },
    { nombre: "SANT - Tucumán", lat: -26.841, lng: -65.104 },
    { nombre: "SARF - Formosa", lat: -26.213, lng: -58.228 },
    { nombre: "SAAV - Santa Fe", lat: -31.711, lng: -60.812 },
    { nombre: "SANE - Santiago del Estero", lat: -27.766, lng: -64.311 },
    { nombre: "SANU - San Juan", lat: -31.571, lng: -68.418 }
];

const UNIDADES_AE = [
    "B HELIC ASAL 601", "B AV APY COMB 601", "SEC AE M 6", "SEC AE M 8",
    "ESC AV EXPL ATQ 602", "SEC AE 11", "EC AE", "SEC AE MTE 3",
    "SEC AE DR", "B AB MANT AERON 601", "SEC AE MTE 12", "SEC AE 9"
];

const CargaTactica = () => {
    const [aeronavesDisponibles, setAeronavesDisponibles] = useState([]);
    const [misionesActivas, setMisionesActivas] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        title: '', elemento: '', notasMarginales: '', 
        aeronaveModelo: '', matricula: '', // Campos separados
        latG: 34, latM: 31, latS: 40, latDir: 'S',
        lngG: 58, lngM: 38, lngS: 29, lngDir: 'W',
        locNombre: ''
    });

    const cargarDatos = async () => {
        try {
            const [aeronaves, misiones] = await Promise.all([
                EventService.getAvailableAircraft('all'),
                EventService.getActiveOperations()
            ]);
            setAeronavesDisponibles(aeronaves || []);
            setMisionesActivas(misiones || []);
        } catch (error) {
            console.error("Error sincronizando situación táctica");
        }
    };

    useEffect(() => {
        cargarDatos();
        const interval = setInterval(cargarDatos, 15000);
        return () => clearInterval(interval);
    }, []);

    const toDecimal = (g, m, s, dir) => {
        let dec = parseFloat(g) + parseFloat(m) / 60 + parseFloat(s) / 3600;
        return (dir === 'S' || dir === 'W') ? dec * -1 : dec;
    };

    const fromDecimal = (dec, type) => {
        const abs = Math.abs(dec);
        const g = Math.floor(abs);
        const m = Math.floor((abs - g) * 60);
        const s = Math.round((abs - g - m / 60) * 3600);
        let dir = "";
        if (type === 'lat') dir = dec < 0 ? 'S' : 'N';
        if (type === 'lng') dir = dec < 0 ? 'W' : 'E';
        return { g, m, s, dir };
    };

    const handleAeropuerto = (e) => {
        const apto = AEROPUERTOS_ESTANDAR.find(p => p.nombre === e.target.value);
        if (apto) {
            const latGMS = fromDecimal(apto.lat, 'lat');
            const lngGMS = fromDecimal(apto.lng, 'lng');
            setFormData({ 
                ...formData, 
                locNombre: apto.nombre,
                latG: latGMS.g, latM: latGMS.m, latS: latGMS.s, latDir: latGMS.dir,
                lngG: lngGMS.g, lngM: lngGMS.m, lngS: lngGMS.s, lngDir: lngGMS.dir
            });
        }
    };

    // Manejador inteligente de selección de aeronave
    const handleAeronaveSelect = (e) => {
        const value = e.target.value; // Viene como "MODELO|MATRICULA"
        if (!value) {
            setFormData({ ...formData, aeronaveModelo: '', matricula: '' });
            return;
        }
        const [modelo, matricula] = value.split('|');
        setFormData({ ...formData, aeronaveModelo: modelo, matricula: matricula });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const latDec = toDecimal(formData.latG, formData.latM, formData.latS, formData.latDir);
        const lngDec = toDecimal(formData.lngG, formData.lngM, formData.lngS, formData.lngDir);

        const payload = {
            // El título principal para el log administrativo
            title: editingId ? formData.title : `${formData.aeronaveModelo} ${formData.matricula} - ${formData.title}`,
            
            // CAMPOS SEPARADOS PARA EL MAPA (Se guardan en notas o campos extendidos según tu backend)
            // Usamos notasMarginales para enviar la estructura limpia que el mapa leerá
            matricula: formData.matricula, 
            aeronave: formData.aeronaveModelo,
            
            elemento: formData.elemento,
            isRealTime: true, 
            status: 'en_desarrollo', 
            ubicacion: {
                nombre: formData.locNombre || 'Posición por Coordenadas',
                lat: latDec, lng: lngDec
            },
            notasMarginales: formData.notasMarginales,
            color: '#e67e22' 
        };

        try {
            if (editingId) {
                await EventService.updateEvent(editingId, payload);
                alert("📍 POSICIÓN ACTUALIZADA EN RADAR");
            } else {
                await EventService.createEvent(payload);
                alert("🚀 OPERACIÓN LANZADA AL MONITOR");
            }
            setEditingId(null);
            setFormData({ title: '', elemento: '', notasMarginales: '', aeronaveModelo: '', matricula: '', latG: 34, latM: 31, latS: 40, latDir: 'S', lngG: 58, lngM: 38, lngS: 29, lngDir: 'W', locNombre: '' });
            cargarDatos();
        } catch (error) {
            console.error(error);
            alert("Error en la operación táctica.");
        }
    };

    const handlePrepareUpdate = (m) => {
        const latGMS = fromDecimal(m.ubicacion.lat, 'lat');
        const lngGMS = fromDecimal(m.ubicacion.lng, 'lng');
        setEditingId(m._id);
        setFormData({
            title: m.title,
            elemento: m.elemento,
            notasMarginales: m.notasMarginales,
            aeronaveModelo: m.aeronave || '', 
            matricula: m.matricula || '',
            latG: latGMS.g, latM: latGMS.m, latS: latGMS.s, latDir: latGMS.dir,
            lngG: lngGMS.g, lngM: lngGMS.m, lngS: lngGMS.s, lngDir: lngGMS.dir,
            locNombre: m.ubicacion.nombre
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleFinalizar = async (id) => {
        if (!window.confirm("¿Remover del Monitor de Operaciones?")) return;
        try {
            await EventService.updateEvent(id, { 
                status: 'finalizado', 
                isRealTime: false 
            });
            cargarDatos();
        } catch (error) {
            alert("Error al remover operación");
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                {/* COLUMNA IZQUIERDA: FORMULARIO */}
                <div style={styles.card}>
                    <h2 style={styles.title}>{editingId ? '📍 ACTUALIZAR POSICIÓN' : '⚡ NUEVO VUELO'}</h2>
                    <p style={styles.subtitle}>SISTEMA DE GESTIÓN TÁCTICA DE AVIACIÓN</p>
                    
                    <form onSubmit={handleSubmit}>
                        {!editingId && (
                            <>
                                <label style={styles.label}>Aeronave (SDA y Matrícula):</label>
                                <select 
                                    style={styles.input} 
                                    required 
                                    value={`${formData.aeronaveModelo}|${formData.matricula}`} 
                                    onChange={handleAeronaveSelect}
                                >
                                    <option value="|">Seleccione Aeronave...</option>
                                    {aeronavesDisponibles.map(a => (
                                        <option key={a._id} value={`${a.sda}|${a.matricula}`}>
                                            {a.sda} - {a.matricula} ({a.unidad})
                                        </option>
                                    ))}
                                </select>
                            </>
                        )}

                        <label style={styles.label}>Indicativo de Vuelo / Misión:</label>
                        <input style={styles.input} value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value.toUpperCase()})} required placeholder="Ej: ASALTO AEREO / SANITARIO" />

                        <label style={styles.label}>Unidad Responsable:</label>
                        <select style={styles.input} value={formData.elemento} onChange={(e) => setFormData({...formData, elemento: e.target.value})} required>
                            <option value="">Seleccione Unidad...</option>
                            {UNIDADES_AE.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>

                        <div style={styles.geoBox}>
                            <label style={styles.label}>Referencia de Aeródromo:</label>
                            <select onChange={handleAeropuerto} style={styles.input} value={formData.locNombre}>
                                <option value="">Opcional: Cargar Aeródromo...</option>
                                {AEROPUERTOS_ESTANDAR.map(p => <option key={p.nombre} value={p.nombre}>{p.nombre}</option>)}
                            </select>
                            
                            <label style={styles.label}>Coordenadas Actuales (GMS):</label>
                            <div style={styles.row}>
                                <input type="number" style={styles.inputTriple} onChange={(e)=>setFormData({...formData, latG: e.target.value})} value={formData.latG}/>
                                <input type="number" style={styles.inputTriple} onChange={(e)=>setFormData({...formData, latM: e.target.value})} value={formData.latM}/>
                                <input type="number" style={styles.inputTriple} onChange={(e)=>setFormData({...formData, latS: e.target.value})} value={formData.latS}/>
                                <select style={styles.inputShort} onChange={(e)=>setFormData({...formData, latDir: e.target.value})} value={formData.latDir}>
                                    <option value="S">S</option><option value="N">N</option>
                                </select>
                            </div>
                            <div style={styles.row}>
                                <input type="number" style={styles.inputTriple} onChange={(e)=>setFormData({...formData, lngG: e.target.value})} value={formData.lngG}/>
                                <input type="number" style={styles.inputTriple} onChange={(e)=>setFormData({...formData, lngM: e.target.value})} value={formData.lngM}/>
                                <input type="number" style={styles.inputTriple} onChange={(e)=>setFormData({...formData, lngS: e.target.value})} value={formData.lngS}/>
                                <select style={styles.inputShort} onChange={(e)=>setFormData({...formData, lngDir: e.target.value})} value={formData.lngDir}>
                                    <option value="W">W</option><option value="E">E</option>
                                </select>
                            </div>
                        </div>

                        <label style={styles.label}>TRIPULACIÓN / CARGA / COMBUSTIBLE:</label>
                        <textarea style={styles.textarea} value={formData.notasMarginales} onChange={(e) => setFormData({...formData, notasMarginales: e.target.value.toUpperCase()})} required />

                        <button type="submit" style={editingId ? styles.btnUpdate : styles.btn}>
                            {editingId ? '💾 ACTUALIZAR POSICIÓN' : '🚀 LANZAR VUELO'}
                        </button>
                        {editingId && <button type="button" onClick={() => setEditingId(null)} style={styles.btnCancel}>CANCELAR</button>}
                    </form>
                </div>

                {/* COLUMNA DERECHA: LOG DE OPERACIONES */}
                <div style={styles.logCard}>
                    <h3 style={{ color: '#f39c12', borderBottom: '1px solid #f39c12', paddingBottom: '10px' }}>🛰️ OPERACIONES EN DESARROLLO</h3>
                    <div style={styles.scrollArea}>
                        {misionesActivas.length === 0 ? <p style={{color: '#7f8c8d'}}>No hay medios reportando posición.</p> : 
                        misionesActivas.map(m => (
                            <div key={m._id} style={styles.misionItem}>
                                <div style={{fontWeight: 'bold', color: '#ecf0f1'}}>{m.title}</div>
                                <div style={{fontSize: '0.75rem', color: '#bdc3c7'}}>{m.elemento} | {m.ubicacion.nombre}</div>
                                <div style={styles.btnRow}>
                                    <button onClick={() => handlePrepareUpdate(m)} style={styles.btnSmall}>ACTUALIZAR</button>
                                    <button onClick={() => handleFinalizar(m._id)} style={styles.btnSmallRed}>FINALIZAR</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const styles = {
    page: { padding: '20px', backgroundColor: '#121212', minHeight: '100vh', fontFamily: 'monospace' },
    container: { display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px', maxWidth: '1400px', margin: '0 auto' },
    card: { backgroundColor: '#1e272e', color: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #f39c12' },
    logCard: { backgroundColor: '#1e272e', color: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #7f8c8d' },
    scrollArea: { maxHeight: '600px', overflowY: 'auto', marginTop: '15px' },
    misionItem: { backgroundColor: '#2f3542', padding: '12px', borderRadius: '8px', marginBottom: '10px', borderLeft: '4px solid #f39c12' },
    title: { color: '#f39c12', margin: '0', textAlign: 'center', fontSize: '1.5rem', letterSpacing: '2px' },
    subtitle: { textAlign: 'center', fontSize: '0.75rem', marginBottom: '20px', letterSpacing: '2px', color: '#7f8c8d' },
    label: { display: 'block', marginBottom: '5px', fontSize: '0.8rem', fontWeight: 'bold', color: '#bdc3c7' },
    input: { width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '4px', border: 'none', backgroundColor: '#2f3542', color: 'white', fontFamily: 'monospace' },
    inputTriple: { width: '23%', padding: '8px', marginBottom: '5px', borderRadius: '4px', border: 'none', backgroundColor: '#3d4451', color: 'white', textAlign: 'center' },
    inputShort: { width: '20%', padding: '8px', marginBottom: '5px', borderRadius: '4px', border: 'none', backgroundColor: '#f39c12', color: 'black', fontWeight: 'bold' },
    row: { display: 'flex', justifyContent: 'space-between', marginBottom: '5px' },
    geoBox: { padding: '15px', backgroundColor: '#3d4451', borderRadius: '8px', marginBottom: '15px' },
    textarea: { width: '100%', height: '80px', padding: '10px', borderRadius: '6px', backgroundColor: '#2f3542', color: 'white', border: 'none', resize: 'none', marginBottom: '10px', fontFamily: 'monospace' },
    btn: { width: '100%', padding: '15px', backgroundColor: '#d35400', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', letterSpacing: '2px' },
    btnUpdate: { width: '100%', padding: '15px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
    btnCancel: { width: '100%', padding: '10px', backgroundColor: 'transparent', color: '#bdc3c7', border: 'none', cursor: 'pointer', marginTop: '5px' },
    btnRow: { display: 'flex', gap: '10px', marginTop: '10px' },
    btnSmall: { padding: '5px 10px', backgroundColor: '#2980b9', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' },
    btnSmallRed: { padding: '5px 10px', backgroundColor: '#c0392b', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }
};

export default CargaTactica;