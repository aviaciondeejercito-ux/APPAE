import React from 'react';

const EbmInformeOficial = ({ 
    datos, 
    unidad = "B AV APY COMB 601", 
    trimestre = "III", 
    anio = "2026", 
    sarm = "C-208", 
    leyendaAno = "2026 - AÑO DE LA GRANDEZA ARGENTINA",
    observaciones = [
        "El personal que no cumple EBM obedece a razones operativas y/o asignaciones de servicios inherentes al cargo."
    ] 
}) => {
    const pilotosPrevistos = datos.length;
    const pilotosQueVuelan = datos.filter(d => (d.hsPiloto + d.hsCopiloto + d.hsInstructor) > 0).length;
    const pilotosNoCumplieron = datos.filter(d => d.cumpleEbm === 'NO' || (d.hsPiloto + d.hsCopiloto + d.hsInstructor) === 0).length;

    return (
        <div style={styles.page}>
            <style>
                {`
                    @media print {
                        @page {
                            size: A4 landscape;
                            margin: 10mm;
                        }
                        body {
                            margin: 0;
                            padding: 0;
                            background: #fff !important;
                            -webkit-print-color-adjust: exact;
                        }
                        .no-print { display: none !important; }
                    }
                `}
            </style>

            {/* ENCABEZADO REGLAMENTARIO */}
            <div style={styles.headerContainer}>
                <div style={styles.headerLeft}>
                    <div style={styles.entidad}>Ejército Argentino</div>
                    <div style={styles.unidad}>{unidad}</div>
                </div>
                <div style={styles.headerRight}>
                    <div style={styles.leyendaAno}>"{leyendaAno}"</div>
                </div>
            </div>

            {/* METADATOS DEL INFORME */}
            <div style={styles.metaGrid}>
                <div style={styles.metaRow}>
                    <span><strong>FUERZA ARMADA:</strong> EJÉRCITO ARGENTINO</span>
                    <span><strong>INFORME EXIGENCIAS BÁSICAS MÍNIMAS</strong> {unidad}</span>
                </div>
                <div style={styles.metaRow}>
                    <span><strong>TIPO DE AERONAVE:</strong> PLANO FIJO / ROTATIVO</span>
                    <span><strong>AÑO:</strong> {anio}</span>
                </div>
                <div style={styles.metaRow}>
                    <span><strong>TIPO DE TRIPULACIÓN:</strong> MULTITRIPULADO</span>
                    <span><strong>TRIMESTRE:</strong> {trimestre}</span>
                </div>
                <div style={styles.metaRow}>
                    <span><strong>SARM:</strong> {sarm}</span>
                    <span><strong>TIPO:</strong> C</span>
                </div>
            </div>

            {/* TABLA PRINCIPAL */}
            <table style={styles.table}>
                <thead>
                    <tr>
                        <th rowSpan="2" style={{ width: '30px' }}>N°</th>
                        <th rowSpan="2" style={{ width: '80px' }}>Nº CONTROL</th>
                        <th rowSpan="2" style={{ width: '60px' }}>GRADO</th>
                        <th rowSpan="2">APELLIDO Y NOMBRE</th>
                        <th rowSpan="2" style={{ width: '90px' }}>CUMPLE EBM COMO</th>
                        <th colSpan="3" style={{ borderBottom: '1px solid #000' }}>HORAS DE VUELO DEL AÑO</th>
                        <th rowSpan="2" style={{ width: '80px' }}>TOTAL ACUMUL SARM</th>
                        <th rowSpan="2" style={{ width: '80px' }}>TOTAL GENERAL</th>
                        <th rowSpan="2" style={{ width: '90px' }}>TOTAL SARM AL 31Dic{Number(anio) - 1}</th>
                    </tr>
                    <tr>
                        <th style={{ width: '60px' }}>PILOTO</th>
                        <th style={{ width: '60px' }}>COPILOTO</th>
                        <th style={{ width: '70px' }}>INSTR / INSP</th>
                    </tr>
                </thead>
                <tbody>
                    {datos.map((row, index) => (
                        <tr key={row.id || index}>
                            <td style={{ textAlign: 'center' }}>{index + 1}</td>
                            <td style={{ textAlign: 'center' }}>{row.nroControl || ''}</td>
                            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{row.grado}</td>
                            <td style={{ textTransform: 'uppercase' }}>{row.apellidoNombre}</td>
                            <td style={{ textAlign: 'center', fontSize: '10px' }}>{row.cumpleComo || 'COPILOTO'}</td>
                            <td style={styles.numCol}>{row.hsPiloto > 0 ? row.hsPiloto.toFixed(1) : ''}</td>
                            <td style={styles.numCol}>{row.hsCopiloto > 0 ? row.hsCopiloto.toFixed(1) : ''}</td>
                            <td style={styles.numCol}>{row.hsInstructor > 0 ? row.hsInstructor.toFixed(1) : ''}</td>
                            <td style={{ ...styles.numCol, fontWeight: 'bold' }}>{row.totalAcumulSarm?.toFixed(1) || '0.0'}</td>
                            <td style={{ ...styles.numCol, fontWeight: 'bold' }}>{row.totalGeneral?.toFixed(1) || '0.0'}</td>
                            <td style={{ ...styles.numCol, backgroundColor: '#f9f9f9' }}>{row.totalSarmAl31Dic?.toFixed(1) || '0.0'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* RESUMEN DE TOTALES */}
            <div style={styles.resumenContainer}>
                <div><strong>TOTAL DE PILOTOS PREVISTOS PARA VOLAR:</strong> {pilotosPrevistos}</div>
                <div><strong>TOTAL DE PILOTOS QUE VUELAN:</strong> {pilotosQueVuelan}</div>
                <div><strong>TOTAL DE PILOTOS QUE NO CUMPLIERON EBM:</strong> {pilotosNoCumplieron}</div>
            </div>

            {/* SECCIÓN OBSERVACIONES */}
            <div style={styles.obsContainer}>
                <strong>OBSERVACIONES:</strong>
                <ul style={{ margin: '5px 0 0 15px', padding: 0 }}>
                    {observaciones.map((obs, idx) => (
                        <li key={idx} style={{ fontSize: '11px' }}>{obs}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

const styles = {
    page: {
        width: '100%',
        boxSizing: 'border-box',
        backgroundColor: '#fff',
        color: '#000',
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        lineHeight: '1.2',
        padding: '10px'
    },
    headerContainer: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '15px',
        borderBottom: '2px solid #000',
        paddingBottom: '5px'
    },
    headerLeft: {
        display: 'flex',
        flexDirection: 'column'
    },
    headerRight: {
        textAlign: 'right'
    },
    entidad: {
        fontSize: '14px',
        fontWeight: 'bold',
        textTransform: 'uppercase'
    },
    unidad: {
        fontSize: '12px',
        fontWeight: 'bold'
    },
    leyendaAno: {
        fontSize: '10px',
        fontStyle: 'italic',
        fontWeight: 'bold'
    },
    metaGrid: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        marginBottom: '15px'
    },
    metaRow: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '11px'
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        marginBottom: '15px',
        fontSize: '10px'
    },
    numCol: {
        textAlign: 'right',
        paddingRight: '5px'
    },
    resumenContainer: {
        display: 'flex',
        justifyContent: 'space-between',
        border: '1px solid #000',
        padding: '8px',
        marginBottom: '15px',
        fontSize: '10px',
        fontWeight: 'bold'
    },
    obsContainer: {
        border: '1px solid #000',
        padding: '8px',
        fontSize: '10px'
    }
};

export default EbmInformeOficial;