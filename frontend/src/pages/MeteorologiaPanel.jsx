import React, { useState, useEffect } from 'react';

const MeteorologiaPanel = ({ estaciones = ['SADE', 'SADP', 'SACO', 'SAEZ'] }) => {
    const [datos, setDatos] = useState([]);
    const [visible, setVisible] = useState(false);

    const fetchMetar = async () => {
        try {
            // NOTA: Para producción necesitarás una API Key de CheckWX (es gratuita hasta cierto límite)
            // Aquí simulamos la estructura que devuelve para que veas cómo se renderiza
            const mockData = estaciones.map(id => ({
                id,
                metar: "METAR " + id + " 222300Z 11008KT 9999 FEW030 22/14 Q1013",
                taf: "TAF " + id + " 221700Z 2218/2318 12010KT 9999 BKN030...",
                temp: "22°C"
            }));
            setDatos(mockData);
        } catch (err) {
            console.error("Error meteorología:", err);
        }
    };

    useEffect(() => {
        fetchMetar();
        const interval = setInterval(fetchMetar, 1800000); // Actualiza cada 30 min
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{...styles.container, right: visible ? '0' : '-320px'}}>
            <button onClick={() => setVisible(!visible)} style={styles.tab}>
                {visible ? '▶' : '☁️ MET'}
            </button>
            
            <div style={styles.content}>
                <h3 style={styles.title}>INFORMACIÓN METEOROLÓGICA</h3>
                {datos.map(d => (
                    <div key={d.id} style={styles.card}>
                        <div style={styles.cardHeader}>
                            <strong>{d.id}</strong> <span style={{color: '#00ff00'}}>{d.temp}</span>
                        </div>
                        <div style={styles.metarText}>
                            <strong>METAR:</strong> {d.metar}
                        </div>
                        <div style={styles.tafText}>
                            <strong>TAF:</strong> {d.taf}
                        </div>
                    </div>
                ))}
                <div style={styles.footer}>FUENTE: NOAA / AVIATION WEATHER</div>
            </div>
        </div>
    );
};

const styles = {
    container: {
        position: 'absolute', top: '80px', height: '70vh', width: '320px',
        backgroundColor: 'rgba(10, 10, 10, 0.95)', border: '1px solid #333',
        zIndex: 2000, transition: 'right 0.3s ease', color: 'white',
        display: 'flex', flexDirection: 'row'
    },
    tab: {
        position: 'absolute', left: '-40px', top: '20px', width: '40px', height: '60px',
        backgroundColor: '#f39c12', border: 'none', cursor: 'pointer',
        borderRadius: '5px 0 0 5px', fontWeight: 'bold'
    },
    content: { padding: '15px', overflowY: 'auto', width: '100%' },
    title: { fontSize: '0.9rem', color: '#f39c12', borderBottom: '1px solid #f39c12', paddingBottom: '5px' },
    card: { marginBottom: '15px', backgroundColor: '#1a1a1a', padding: '8px', borderRadius: '4px', fontSize: '0.75rem' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '5px', borderBottom: '1px solid #333' },
    metarText: { color: '#bdc3c7', marginBottom: '5px', fontFamily: 'monospace' },
    tafText: { color: '#95a5a6', fontStyle: 'italic', fontFamily: 'monospace' },
    footer: { fontSize: '0.6rem', color: '#555', textAlign: 'center', marginTop: '10px' }
};

export default MeteorologiaPanel;