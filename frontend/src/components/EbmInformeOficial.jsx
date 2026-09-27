import React, { forwardRef } from 'react';

const EbmInformeOficial = forwardRef(({ 
    unidad = "ESCUADRÓN DE AVIACIÓN DE EXPLORACIÓN Y ATAQUE 602",
    anio = "2026",
    trimestre = "IV",
    tipoAeronave = "PLANO ROTATIVO / MONOMOTOR",
    tipoTripulacion = "MULTITRIPULADO",
    tipoEbm = "D",
    sda = "UH-1H / II",
    pilotos = [],
    observaciones = []
}, ref) => {

    // Cálculos para el cuadro resumen inferior
    const previstos = pilotos.length;
    const vuelan = pilotos.filter(p => (Number(p.hsPiloto || 0) + Number(p.hsCopiloto || 0) + Number(p.hsInstructor || 0)) > 0).length;
    const noCumplen = pilotos.filter(p => p.cumpleEbm === false).length;

    return (
        <div ref={ref} style={styles.container}>
            {/* Encabezado Institucional */}
            <div style={styles.topHeader}>
                <div style={styles.headerLeft}>
                    Ejército Argentino<br />
                    {unidad}
                </div>
                <div style={styles.headerRight}>
                    “2025 – AÑO DE LA RECONSTRUCCIÓN DE LA NACIÓN ARGENTINA”
                </div>
            </div>

            <div style={styles.titleBox}>
                INFORME EXIGENCIAS BÁSICAS MÍNIMAS {unidad.toUpperCase()}
            </div>

            {/* Metadatos del Informe */}
            <table style={styles.metaTable}>
                <tbody>
                    <tr>
                        <td style={styles.metaTd}><b>FUERZA ARMADA:</b> EJÉRCITO ARGENTINO</td>
                        <td style={styles.metaTdRight}><b>AÑO:</b> {anio}</td>
                    </tr>
                    <tr>
                        <td style={styles.metaTd}><b>TIPO DE AERONAVE:</b> {tipoAeronave}</td>
                        <td style={styles.metaTdRight}><b>TRIMESTRE:</b> {trimestre}</td>
                    </tr>
                    <tr>
                        <td style={styles.metaTd}><b>TIPO DE TRIPULACIÓN:</b> {tipoTripulacion}</td>
                        <td style={styles.metaTdRight}><b>TIPO:</b> {tipoEbm}</td>
                    </tr>
                    <tr>
                        <td style={styles.metaTd} colSpan={2}><b>SARM:</b> {sda}</td>
                    </tr>
                </tbody>
            </table>

            {/* Tabla Principal de Pilotos */}
            <table style={styles.mainTable}>
                <thead>
                    <tr>
                        <th style={styles.th} rowSpan={2}>Nº</th>
                        <th style={styles.th} rowSpan={2}>Nº CONTROL</th>
                        <th style={styles.th} rowSpan={2}>GRADO</th>
                        <th style={styles.th} rowSpan={2}>APELLIDO Y NOMBRE</th>
                        <th style={styles.th} rowSpan={2}>CUMPLE EBM COMO</th>
                        <th style={styles.th} colSpan={3}>HORAS DE VUELO</th>
                        <th style={styles.th} rowSpan={2}>TOTAL ACUMUL SARM</th>
                        <th style={styles.th} rowSpan={2}>TOTAL GENERAL</th>
                        <th style={styles.th} rowSpan={2}>TOTAL GENERAL AL 31Dic25</th>
                    </tr>
                    <tr>
                        <th style={styles.thSub}>PILOTO</th>
                        <th style={styles.thSub}>COPILOTO</th>
                        <th style={styles.thSub}>INSTR / INSP</th>
                    </tr>
                </thead>
                <tbody>
                    {pilotos.map((p, index) => (
                        <tr key={p._id || index}>
                            <td style={styles.tdCenter}>{index + 1}</td>
                            <td style={styles.tdCenter}>{p.numControl || p.dni || '-'}</td>
                            <td style={styles.tdCenter}>{p.grado}</td>
                            <td style={styles.tdLeft}>{p.apellido} {p.nombre}</td>
                            <td style={styles.tdCenter}>{p.cumpleComo || p.condicion || 'COPILOTO'}</td>
                            <td style={styles.tdNum}>{p.hsPiloto > 0 ? p.hsPiloto : '-'}</td>
                            <td style={styles.tdNum}>{p.hsCopiloto > 0 ? p.hsCopiloto : '-'}</td>
                            <td style={styles.tdNum}>{p.hsInstructor > 0 ? p.hsInstructor : '-'}</td>
                            <td style={styles.tdNum}>{p.totalSarm || 0}</td>
                            <td style={styles.tdNum}>{p.totalGeneral || 0}</td>
                            <td style={styles.tdNum}>{p.totalAnterior || 0}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Resumen de Cómputo */}
            <div style={styles.summaryBar}>
                <div>TOTAL DE PILOTOS PREVISTOS PARA VOLAR: <b>{previstos}</b></div>
                <div>TOTAL DE PILOTOS QUE VUELAN: <b>{vuelan}</b></div>
                <div>TOTAL DE PILOTOS QUE NO CUMPLIERON EBM: <b>{noCumplen}</b></div>
            </div>

            {/* Observaciones */}
            <div style={styles.obsContainer}>
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>OBSERVACIONES:</div>
                {observaciones && observaciones.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                        {observaciones.map((obs, idx) => (
                            <li key={idx}>{obs}</li>
                        ))}
                    </ul>
                ) : (
                    <div>- Sin observaciones.</div>
                )}
            </div>
        </div>
    );
});

// Estilos CSS exactos para A4 en impresión
const styles = {
    container: {
        width: '100%',
        maxWidth: '1050px',
        padding: '30px',
        backgroundColor: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        color: '#000000',
        boxSizing: 'border-box'
    },
    topHeader: {
        display: 'flex',
        justify: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '20px'
    },
    headerLeft: {
        fontSize: '11px',
        lineHeight: '1.3'
    },
    headerRight: {
        fontSize: '10px',
        fontStyle: 'italic'
    },
    titleBox: {
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: '13px',
        borderTop: '1px solid #000',
        borderBottom: '1px solid #000',
        padding: '6px 0',
        marginBottom: '15px'
    },
    metaTable: {
        width: '100%',
        borderCollapse: 'collapse',
        marginBottom: '15px'
    },
    metaTd: {
        padding: '3px 0',
        fontSize: '11px'
    },
    metaTdRight: {
        padding: '3px 0',
        fontSize: '11px',
        textAlign: 'right'
    },
    mainTable: {
        width: '100%',
        borderCollapse: 'collapse',
        marginBottom: '15px'
    },
    th: {
        border: '1px solid #000',
        padding: '6px 4px',
        fontSize: '10px',
        fontWeight: 'bold',
        textAlign: 'center',
        backgroundColor: '#f2f2f2'
    },
    thSub: {
        border: '1px solid #000',
        padding: '4px',
        fontSize: '9px',
        fontWeight: 'bold',
        textAlign: 'center',
        backgroundColor: '#f2f2f2'
    },
    tdCenter: {
        border: '1px solid #000',
        padding: '5px 4px',
        textAlign: 'center',
        fontSize: '10px'
    },
    tdLeft: {
        border: '1px solid #000',
        padding: '5px 6px',
        textAlign: 'left',
        fontSize: '10px'
    },
    tdNum: {
        border: '1px solid #000',
        padding: '5px 4px',
        textAlign: 'center',
        fontSize: '10px'
    },
    summaryBar: {
        display: 'flex',
        justify: 'space-between',
        border: '1px solid #000',
        padding: '8px 12px',
        fontSize: '10px',
        fontWeight: 'bold',
        marginBottom: '15px'
    },
    obsContainer: {
        fontSize: '11px',
        lineHeight: '1.4'
    }
};

export default EbmInformeOficial;