import React, { useState, useEffect } from 'react';
import { getAlertasDashboard } from '../services/api';

const AlertasWidget = () => {
    const [alertas, setAlertas] = useState([]);
    const [resumen, setResumen] = useState({ criticas: 0, advertencias: 0 });
    const [unidad, setUnidad] = useState('');
    const [loading, setLoading] = useState(true);
    
    // Estados separados para cada Modal
    const [showPersonal, setShowPersonal] = useState(false);
    const [showAeronaves, setShowAeronaves] = useState(false);

    useEffect(() => {
        cargarAlertasUnidad();
    }, []);

    const cargarAlertasUnidad = async () => {
        try {
            const response = await getAlertasDashboard();
            if (response.data?.success) {
                setAlertas(response.data.data || []);
                setResumen(response.data.resumen || { criticas: 0, advertencias: 0 });
                setUnidad(response.data.jurisdiccion || '');
            }
        } catch (error) {
            console.error("Error al recuperar el panel de alertas:", error);
        } finally {
            setLoading(false);
        }
    };

    const tripulantes = alertas.filter(a => a.categoria === 'TRIPULANTE');
    const aeronaves = alertas.filter(a => a.categoria === 'AERONAVE' || a.categoria === 'COMPONENTES');

    if (loading) return null;
    if (alertas.length === 0) return null;

    return (
        <div style={styles.container}>
            <h4 style={styles.titleArea}>Novedades Operativas ({unidad})</h4>
            
            <div style={styles.buttonGroup}>
                <button style={styles.btnPersonal} onClick={() => setShowPersonal(true)}>
                    👥 Personal ({tripulantes.length})
                </button>
                <button style={styles.btnAeronaves} onClick={() => setShowAeronaves(true)}>
                    🚁 Aeronaves ({aeronaves.length})
                </button>
            </div>

            {/* Modal Personal */}
            {showPersonal && (
                <ModalGenerico 
                    titulo="Novedades de Personal" 
                    datos={tripulantes} 
                    onClose={() => setShowPersonal(false)} 
                />
            )}

            {/* Modal Aeronaves */}
            {showAeronaves && (
                <ModalGenerico 
                    titulo="Novedades de Aeronaves" 
                    datos={aeronaves} 
                    onClose={() => setShowAeronaves(false)} 
                />
            )}
        </div>
    );
};

// Componente Modal Auxiliar para mantener el código limpio
const ModalGenerico = ({ titulo, datos, onClose }) => (
    <div style={styles.modalOverlay} onClick={onClose}>
        <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
                <h3>{titulo}</h3>
                <button onClick={onClose}>✕</button>
            </div>
            {datos.map((a, i) => (
                <div key={i} style={{...styles.item, borderLeftColor: a.gravedad === 'CRITICO' ? '#dc2626' : '#d97706'}}>
                    {a.mensaje}
                </div>
            ))}
        </div>
    </div>
);

const styles = {
    container: { marginBottom: '20px' },
    titleArea: { fontSize: '14px', color: '#64748b', marginBottom: '10px' },
    buttonGroup: { display: 'flex', gap: '10px' },
    btnPersonal: { padding: '10px 15px', borderRadius: '6px', border: 'none', backgroundColor: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: 'bold' },
    btnAeronaves: { padding: '10px 15px', borderRadius: '6px', border: 'none', backgroundColor: '#0ea5e9', color: 'white', cursor: 'pointer', fontWeight: 'bold' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
    modalContent: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', width: '90%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '15px' },
    item: { padding: '10px', borderLeft: '4px solid', marginBottom: '8px', backgroundColor: '#f8fafc', fontSize: '12px' }
};

export default AlertasWidget;