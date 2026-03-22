import React, { useState } from 'react';
import EventService from '../services/EventService';

const PUNTOS_NOTABLES = [
    { nombre: "Campo de Mayo (Cte Av Ej)", lat: -34.528, lng: -58.641 },
    { nombre: "Neuquén (Secc Av Ej 6)", lat: -38.949, lng: -68.143 },
    { nombre: "Curuzú Cuatiá (Secc Av Ej 3)", lat: -29.775, lng: -58.042 },
    { nombre: "Tartagal (Aeródromo)", lat: -22.516, lng: -63.791 },
    { nombre: "Salto (Destacamento)", lat: -31.383, lng: -57.966 }
];

const CargaTactica = () => {
    const [formData, setFormData] = useState({
        title: '',
        elemento: '',
        notasMarginales: '',
        lat: -34.528,
        lng: -58.641,
        locNombre: ''
    });

    const handlePuntoNotable = (e) => {
        const punto = PUNTOS_NOTABLES.find(p => p.nombre === e.target.value);
        if (punto) {
            setFormData({ ...formData, lat: punto.lat, lng: punto.lng, locNombre: punto.nombre });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const payload = {
            title: formData.title,
            start: new Date(), // Comienza ahora
            end: new Date(new Date().getTime() + 4 * 60 * 60 * 1000), // +4hs por defecto
            elemento: formData.elemento,
            etapa: 'ordenada',
            isRealTime: true,
            status: 'en_curso',
            ubicacion: {
                nombre: formData.locNombre || 'Posición Manual',
                lat: parseFloat(formData.lat),
                lng: parseFloat(formData.lng)
            },
            notasMarginales: formData.notasMarginales,
            color: '#d35400' // Color distintivo para misiones tácticas
        };

        try {
            await EventService.createEvent(payload);
            alert("🚀 MISIÓN LANZADA: Aparecerá en el mapa inmediatamente.");
            setFormData({ title: '', elemento: '', notasMarginales: '', lat: -34.528, lng: -58.641, locNombre: '' });
        } catch (error) {
            alert("Error al lanzar misión");
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.card}>
                <h2 style={styles.title}>⚡ DESPACHO TÁCTICO EN TIEMPO REAL</h2>
                <p style={styles.subtitle}>Esta misión se reflejará automáticamente en el Mapa del Boss.</p>
                
                <form onSubmit={handleSubmit}>
                    <label style={styles.label}>Indicativo de la Misión / Vuelo:</label>
                    <input 
                        style={styles.input}
                        placeholder="Ej: AE-452 APOYO SANITARIO"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        required
                    />

                    <label style={styles.label}>Unidad Responsable:</label>
                    <input 
                        style={styles.input}
                        placeholder="Ej: B Av Ej 601"
                        value={formData.elemento}
                        onChange={(e) => setFormData({...formData, elemento: e.target.value})}
                        required
                    />

                    <div style={styles.geoBox}>
                        <label style={styles.label}>Ubicación Actual (Despliegue):</label>
                        <select onChange={handlePuntoNotable} style={styles.input}>
                            <option value="">Seleccionar Punto Notable...</option>
                            {PUNTOS_NOTABLES.map(p => <option key={p.nombre} value={p.nombre}>{p.nombre}</option>)}
                        </select>
                        
                        <div style={styles.row}>
                            <input 
                                type="number" step="0.000001" style={styles.inputHalf} 
                                value={formData.lat} onChange={(e) => setFormData({...formData, lat: e.target.value})}
                                placeholder="Latitud"
                            />
                            <input 
                                type="number" step="0.000001" style={styles.inputHalf} 
                                value={formData.lng} onChange={(e) => setFormData({...formData, lng: e.target.value})}
                                placeholder="Longitud"
                            />
                        </div>
                    </div>

                    <label style={styles.label}>Información Marginal (Tripulación, Carga, Combustible):</label>
                    <textarea 
                        style={styles.textarea}
                        placeholder="Detalles críticos para el Mando..."
                        value={formData.notasMarginales}
                        onChange={(e) => setFormData({...formData, notasMarginales: e.target.value})}
                    />

                    <button type="submit" style={styles.btn}>LANZAR OPERACIÓN</button>
                </form>
            </div>
        </div>
    );
};

const styles = {
    page: { padding: '40px 20px', display: 'flex', justifyContent: 'center' },
    card: { backgroundColor: '#1e272e', color: 'white', padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '600px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },
    title: { color: '#f39c12', margin: '0 0 5px 0', textAlign: 'center' },
    subtitle: { textAlign: 'center', fontSize: '0.8rem', opacity: 0.7, marginBottom: '20px' },
    label: { display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: 'bold' },
    input: { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '6px', border: 'none', backgroundColor: '#2f3542', color: 'white' },
    inputHalf: { width: '48%', padding: '12px', marginBottom: '15px', borderRadius: '6px', border: 'none', backgroundColor: '#2f3542', color: 'white' },
    row: { display: 'flex', justifyContent: 'space-between' },
    geoBox: { padding: '15px', backgroundColor: '#3d4451', borderRadius: '8px', marginBottom: '15px' },
    textarea: { width: '100%', height: '100px', padding: '12px', borderRadius: '6px', backgroundColor: '#2f3542', color: 'white', border: 'none', resize: 'none' },
    btn: { width: '100%', padding: '15px', marginTop: '20px', backgroundColor: '#d35400', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }
};

export default CargaTactica;