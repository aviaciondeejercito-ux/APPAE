import React, { useState, useEffect } from 'react';
import { getAlertasDashboard } from '../services/api';

const AlertasWidget = () => {
    const [alertas, setAlertas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unidad, setUnidad] = useState('');
    
    const [showPersonal, setShowPersonal] = useState(false);
    const [showAeronaves, setShowAeronaves] = useState(false);
    const [showDocumentacion, setShowDocumentacion] = useState(false);

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

    // --- LÓGICA DE AGRUPACIÓN: PERSONAL ---
    const personalBase = alertas.filter(a => a.categoria === 'TRIPULANTE');
    const personalPsico = personalBase.filter(a => a.tipo === 'PSICOFISICO');
    const personalOtros = personalBase.filter(a => a.tipo !== 'PSICOFISICO');

    const personalAgrupado = [...personalOtros.map(a => ({ mensaje: a.mensaje, gravedad: a.gravedad }))];
    
    if (personalPsico.length > 0) {
        personalAgrupado.push({
            mensaje: `⚠️ PSICOFÍSICO SIN CARGAR: ${personalPsico.map(p => p.nombre || "Tripulante").join(', ')}`,
            gravedad: 'CRITICO' // Se mostrará abajo por la lógica de orden
        });
    }

    // --- LÓGICA DE AGRUPACIÓN: AERONAVES ---
    const potencialBase = alertas.filter(a => a.categoria === 'AERONAVE' && a.tipo === 'POTENCIAL');
    const criticos = potencialBase.filter(a => a.gravedad === 'CRITICO');
    const advertencias = potencialBase.filter(a => a.gravedad === 'ADVERTENCIA');

    const aeronavesPotencialAgrupado = [];
    if (advertencias.length > 0) {
        advertencias.forEach(a => {
            aeronavesPotencialAgrupado.push({ mensaje: `⚠️ ${a.mensaje}`, gravedad: 'ADVERTENCIA' });
        });
    }
    if (criticos.length > 0) {
        aeronavesPotencialAgrupado.push({
            mensaje: `🚨 CRÍTICO (0 hs): ${criticos.map(a => a.mensaje.match(/AE-\d+/)?.[0]).join(', ')}`,
            gravedad: 'CRITICO'
        });
    }

    const aeronavesDocs = alertas.filter(a => a.categoria === 'AERONAVE' && a.tipo !== 'POTENCIAL');

    if (loading) return null;

    return (
        <div style={styles.container}>
            <h4 style={styles.titleArea}>Novedades Operativas ({unidad})</h4>
            
            <div style={styles.buttonGroup}>
                <button style={styles.btnPersonal} onClick={() => setShowPersonal(true)}>
                    👥 Personal ({personalBase.length})
                </button>
                <button style={styles.btnAeronaves} onClick={() => setShowAeronaves(true)}>
                    🚁 Aeronaves ({potencialBase.length})
                </button>
                <button style={styles.btnDocs} onClick={() => setShowDocumentacion(true)}>
                    📄 Docs/Venc ({aeronavesDocs.length})
                </button>
            </div>

            {showPersonal && <ModalGenerico titulo="Novedades de Personal" datos={personalAgrupado} onClose={() => setShowPersonal(false)} />}
            {showAeronaves && <ModalGenerico titulo="Estado de Potencial" datos={aeronavesPotencialAgrupado} onClose={() => setShowAeronaves(false)} />}
            {showDocumentacion && <ModalGenerico titulo="Vencimientos de Documentación" datos={aeronavesDocs} onClose={() => setShowDocumentacion(false)} />}
        </div>
    );
};

const ModalGenerico = ({ titulo, datos, onClose }) => (
    <div style={styles.modalOverlay} onClick={onClose}>
        <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
                <h3 style={{fontSize: '16px'}}>{titulo}</h3>
                <button style={styles.closeBtn} onClick={onClose}>✕</button>
            </div>
            {/* Se ordena para que CRITICO siempre quede al final */}
            {datos.sort((a,b) => (a.gravedad === 'CRITICO' ? 1 : -1)).map((a, i) => (
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
    item: { padding: '12px', borderLeft: '4px solid', marginBottom: '8px', backgroundColor: '#f8fafc', fontSize: '13px', lineHeight: '1.4' }
};

export default AlertasWidget;