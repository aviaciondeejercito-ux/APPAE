import React, { useState, useEffect } from 'react';
import { getAlertasDashboard } from '../services/api';

const AlertasWidget = () => {
    const [alertas, setAlertas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unidad, setUnidad] = useState('');
    
    // Estados para 3 Modales
    const [showPersonal, setShowPersonal] = useState(false);
    const [showAeronaves, setShowAeronaves] = useState(false); // Potencial (Horas)
    const [showDocumentacion, setShowDocumentacion] = useState(false); // Vencimientos

    useEffect(() => {
        cargarAlertasUnidad();
    }, []);

    const cargarAlertasUnidad = async () => {
        try {
            const response = await getAlertasDashboard();
            if (response.data?.success) {
                setAlertas(response.data.data || []);
                setUnidad(response.data.jurisdiccion || '');
            }
        } catch (error) {
            console.error("Error al recuperar el panel de alertas:", error);
        } finally {
            setLoading(false);
        }
    };

    const ordenarAlertas = (lista) => [...lista].sort((a, b) => (a.gravedad === 'ADVERTENCIA' ? -1 : 1));

    // Filtros por lógica de negocio
    const tripulantes = ordenarAlertas(alertas.filter(a => a.categoria === 'TRIPULANTE'));
    const aeronavesPotencial = ordenarAlertas(alertas.filter(a => a.categoria === 'AERONAVE' && a.tipo === 'POTENCIAL'));
    const aeronavesDocs = ordenarAlertas(alertas.filter(a => a.categoria === 'AERONAVE' && a.tipo !== 'POTENCIAL'));

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
                    🚁 Potencial ({aeronavesPotencial.length})
                </button>
                <button style={styles.btnDocs} onClick={() => setShowDocumentacion(true)}>
                    📄 Docs/Venc ({aeronavesDocs.length})
                </button>
            </div>

            {/* Modales */}
            {showPersonal && <ModalGenerico titulo="Novedades de Personal" datos={tripulantes} onClose={() => setShowPersonal(false)} />}
            {showAeronaves && <ModalGenerico titulo="Potencial de Aeronaves" datos={aeronavesPotencial} onClose={() => setShowAeronaves(false)} />}
            {showDocumentacion && <ModalGenerico titulo="Vencimientos de Documentación" datos={aeronavesDocs} onClose={() => setShowDocumentacion(false)} />}
        </div>
    );
};

const ModalGenerico = ({ titulo, datos, onClose }) => (
    <div style={styles.modalOverlay} onClick={onClose}>
        <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
                <h3>{titulo}</h3>
                <button style={styles.closeBtn} onClick={onClose}>✕</button>
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
    buttonGroup: { display: 'flex', gap: '8px' },
    btnPersonal: { padding: '8px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#3b82f6', color: 'white', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' },
    btnAeronaves: { padding: '8px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#0ea5e9', color: 'white', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' },
    btnDocs: { padding: '8px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#6366f1', color: 'white', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
    modalContent: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', width: '90%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
    closeBtn: { border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px' },
    item: { padding: '10px', borderLeft: '4px solid', marginBottom: '8px', backgroundColor: '#f8fafc', fontSize: '12px' }
};

export default AlertasWidget;