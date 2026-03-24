import React from 'react';

/**
 * NightEvolutionWidget - ESTÁNDAR DE SEGURIDAD AE
 * Visualización táctica de la ventana operativa nocturna.
 */
const NightEvolutionWidget = ({ astronomyData }) => {
    if (!astronomyData) return null;

    const { estado, icono, iluminacion, sunset, sunrise, moonrise, moonset } = astronomyData;

    return (
        <div style={styles.nightCard}>
            <div style={styles.header}>
                <span style={styles.badge}>VENTANA NOCTURNA OPERATIVA</span>
            </div>
            
            {/* Línea de tiempo de Crepúsculos */}
            <div style={styles.timelineContainer}>
                <div style={styles.timePoint}>
                    <span style={styles.icon}>🌇</span>
                    <span style={styles.timeLabel}>{sunset}</span>
                    <span style={styles.desc}>OCASO</span>
                </div>

                <div style={styles.evolutionLine}>
                    <div style={styles.moonMarker}>
                        <div style={styles.moonInfo}>
                            <span style={styles.moonIcon}>{icono}</span>
                            <span style={styles.illumText}>{iluminacion}</span>
                        </div>
                        <div style={styles.verticalLine}></div>
                    </div>
                </div>

                <div style={styles.timePoint}>
                    <span style={styles.icon}>🌅</span>
                    <span style={styles.timeLabel}>{sunrise}</span>
                    <span style={styles.desc}>ALBA</span>
                </div>
            </div>

            {/* Datos Detallados de la Luna */}
            <div style={styles.detailsGrid}>
                <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>SALIDA LUNA</span>
                    <span style={styles.detailValue}>{moonrise}</span>
                </div>
                <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>PUESTA LUNA</span>
                    <span style={styles.detailValue}>{moonset}</span>
                </div>
            </div>

            <div style={styles.footer}>
                <strong>FASE:</strong> {estado} | <strong>REF:</strong> ART (UTC-3)
            </div>
        </div>
    );
};

const styles = {
    nightCard: { 
        background: 'linear-gradient(180deg, #0a0e14 0%, #16213e 100%)', 
        borderRadius: '12px', 
        padding: '18px', 
        border: '1px solid #1b3a57', 
        color: '#fff', 
        marginTop: '15px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.4)'
    },
    header: { marginBottom: '20px', textAlign: 'center' },
    badge: { 
        fontSize: '0.75rem', 
        background: 'rgba(27, 58, 87, 0.8)', 
        padding: '4px 12px', 
        borderRadius: '20px', 
        border: '1px solid #3498db',
        letterSpacing: '1px',
        fontWeight: 'bold'
    },
    timelineContainer: { 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '10px 0',
        marginBottom: '15px'
    },
    timePoint: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' },
    icon: { fontSize: '1.2rem' },
    timeLabel: { fontSize: '0.9rem', fontWeight: 'bold', color: '#fff' },
    desc: { fontSize: '0.65rem', color: '#8892b0', fontWeight: 'bold' },
    evolutionLine: { 
        flex: 1, 
        height: '2px', 
        background: 'linear-gradient(90deg, #ff7e5f 0%, #2c3e50 50%, #feb47b 100%)', 
        margin: '0 15px', 
        position: 'relative' 
    },
    moonMarker: { 
        position: 'absolute', 
        left: '50%', 
        top: '-38px', 
        transform: 'translateX(-50%)',
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center' 
    },
    moonInfo: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
    moonIcon: { fontSize: '1.6rem', filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.3))' },
    illumText: { fontSize: '0.75rem', fontWeight: 'bold', color: '#FFD700', marginTop: '-2px' },
    verticalLine: { width: '1px', height: '18px', background: '#FFD700', opacity: 0.6 },
    detailsGrid: { 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '10px', 
        padding: '10px',
        background: 'rgba(0,0,0,0.2)',
        borderRadius: '8px',
        marginBottom: '10px'
    },
    detailItem: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
    detailLabel: { fontSize: '0.6rem', color: '#8892b0', marginBottom: '2px' },
    detailValue: { fontSize: '0.85rem', fontWeight: 'bold' },
    footer: { 
        fontSize: '0.65rem', 
        borderTop: '1px solid rgba(255,255,255,0.1)', 
        paddingTop: '10px', 
        textAlign: 'center', 
        color: '#8892b0',
        textTransform: 'uppercase'
    }
};

export default NightEvolutionWidget;