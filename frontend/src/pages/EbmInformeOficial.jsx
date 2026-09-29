import React from 'react';

const EbmInformeOficial = React.forwardRef(({ 
    datos = [], 
    unidad = "B AV APY COMB 601", 
    trimestre = "III", 
    anio = "2026", 
    tipoAeronave = "PLANO FIJO",
    tipoTripulacion = "MULTITRIPULADO",
    tipoEbm = "C",
    sarm = "C-208", 
    leyendaAno = "2026 – AÑO DE LA GRANDEZA ARGENTINA",
    observaciones = [
        "El personal que no cumple EBM obedece a razones operativas y/o asignaciones de servicios inherentes al cargo."
    ] 
}, ref) => {
    const pilotosPrevistos = datos.length;
    const pilotosQueVuelan = datos.filter(d => (Number(d.hsPiloto || 0) + Number(d.hsCopiloto || 0) + Number(d.hsInstructor || 0)) > 0).length;
    const pilotosNoCumplieron = datos.filter(d => d.cumpleEbm === 'NO' || (Number(d.hsPiloto || 0) + Number(d.hsCopiloto || 0) + Number(d.hsInstructor || 0)) === 0).length;

    const anioAnterior = Number(anio) - 1;

    return (
        <div ref={ref} style={styles.page}>
            <style>
                {`
                    @media print {
                        @page {
                            size: A4 landscape;
                            margin: 8mm 10mm;
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

            {/* SELLO REGLAMENTARIO DE SEGURIDAD SUPERIOR */}
            <div style={styles.selloWrapper}>
                <div style={styles.selloReservadoBox}>
                    RESERVADO
                </div>
            </div>

            {/* ENCABEZADO REGLAMENTARIO */}
            <div style={styles.headerContainer}>
                <div style={styles.headerLeftBlock}>
                    <div style={styles.entidad}>Ejército Argentino</div>
                    <div style={styles.unidadHeader}>{unidad}</div>
                </div>
                <div style={styles.headerRightBlock}>
                    <div style={styles.leyendaAno}>“{leyendaAno}”</div>
                </div>
            </div>

            {/* TÍTULO PRINCIPAL EN NEGRITA Y SUBRAYADO */}
            <div style={styles.titleContainer}>
                <h3 style={styles.mainTitle}>
                    <u>INFORME DE CUMPLIMIENTO DE EXIGENCIAS BÁSICAS MÍNIMAS - {unidad.toUpperCase()}</u>
                </h3>
            </div>

            {/* METADATOS / ENCABEZADO TÉCNICO */}
            <div style={styles.metaContainer}>
                <div style={styles.metaColLeft}>
                    <div style={styles.metaLine}>
                        <span style={styles.metaLabel}>FUERZA ARMADA:</span>
                        <span style={styles.metaValue}>EA</span>
                    </div>
                    <div style={styles.metaLine}>
                        <span style={styles.metaLabel}>TIPO DE AERONAVE:</span>
                        <span style={styles.metaValue}>{tipoAeronave.toUpperCase()}</span>
                    </div>
                    <div style={styles.metaLine}>
                        <span style={styles.metaLabel}>TIPO DE TRIPULACIÓN:</span>
                        <span style={styles.metaValue}>{tipoTripulacion.toUpperCase()}</span>
                    </div>
                    <div style={styles.metaLine}>
                        <span style={styles.metaLabel}>SARM:</span>
                        <span style={styles.metaValue}>{sarm.toUpperCase()}</span>
                    </div>
                </div>

                <div style={styles.metaColRight}>
                    <div style={styles.metaLineRight}>
                        <span style={styles.metaLabel}>AÑO:</span>
                        <span style={styles.metaValue}>{anio}</span>
                    </div>
                    <div style={styles.metaLineRight}>
                        <span style={styles.metaLabel}>TRIMESTRE:</span>
                        <span style={styles.metaValue}>{trimestre}</span>
                    </div>
                    <div style={styles.metaLineRight}>
                        <span style={styles.metaLabel}>TIPO:</span>
                        <span style={styles.metaValue}>{tipoEbm}</span>
                    </div>
                </div>
            </div>

            {/* TABLA PRINCIPAL CON FORMATO FIEL A LA PLANILLA OFICIAL */}
            <table style={styles.table}>
                <thead>
                    <tr>
                        <th rowSpan="3" style={{ ...styles.th, width: '70px' }}>Nº CONTROL</th>
                        <th rowSpan="3" style={{ ...styles.th, width: '55px' }}>GRADO</th>
                        <th rowSpan="3" style={{ ...styles.th, textAlign: 'left', paddingLeft: '8px' }}>APELLIDO Y NOMBRE</th>
                        <th rowSpan="3" style={{ ...styles.th, width: '100px' }}>CUMPLE EBM COMO</th>
                        <th colSpan="5" style={{ ...styles.th, borderBottom: '1px solid #000' }}>HORAS DE VUELO</th>
                        <th rowSpan="3" style={{ ...styles.th, width: '90px' }}>TOTAL ACUMUL SARM (3)</th>
                        <th rowSpan="3" style={{ ...styles.th, width: '90px' }}>TOTAL GENERAL (4)</th>
                        <th rowSpan="3" style={{ ...styles.th, width: '95px' }}>TOTAL GENERAL AL 31Dic{anioAnterior}</th>
                    </tr>
                    <tr>
                        <th rowSpan="2" style={{ ...styles.thSub, width: '55px' }}>PILOTO</th>
                        <th rowSpan="2" style={{ ...styles.thSub, width: '55px' }}>COPILOTO</th>
                        <th colSpan="3" style={{ ...styles.thSub, borderBottom: '1px solid #000' }}>INSTRUCTOR / INSPECTOR</th>
                    </tr>
                    <tr>
                        <th style={{ ...styles.thSub, width: '45px' }}>PIL</th>
                        <th style={{ ...styles.thSub, width: '55px' }}>INST/ INSP</th>
                        <th style={{ ...styles.thSub, width: '50px' }}>TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    {datos.length > 0 ? (
                        datos.map((row, index) => {
                            const esInstructor = row.cumpleComo === 'INSTRUCTOR';
                            const hsInstPil = esInstructor ? Number(row.hsPiloto || 0) : 0;
                            const hsInstInsp = esInstructor ? Number(row.hsInstructor || 0) : 0;
                            const hsInstTotal = hsInstPil + hsInstInsp;

                            return (
                                <tr key={row._id || index}>
                                    <td style={styles.tdCenter}>{row.nroControl || index + 1}</td>
                                    <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>{row.grado}</td>
                                    <td style={styles.tdLeft}>{row.apellidoNombre}</td>
                                    <td style={{ ...styles.tdCenter, textTransform: 'uppercase', fontSize: '9px' }}>{row.cumpleComo || 'COPILOTO'}</td>
                                    
                                    {/* HORAS TRIMESTRE */}
                                    <td style={styles.tdNum}>{row.hsPiloto > 0 && !esInstructor ? row.hsPiloto.toFixed(1) : '-'}</td>
                                    <td style={styles.tdNum}>{row.hsCopiloto > 0 ? row.hsCopiloto.toFixed(1) : '-'}</td>
                                    
                                    {/* SUBCOLUMNAS DE INSTRUCTOR */}
                                    <td style={styles.tdNum}>{hsInstPil > 0 ? hsInstPil.toFixed(1) : '-'}</td>
                                    <td style={styles.tdNum}>{hsInstInsp > 0 ? hsInstInsp.toFixed(1) : '-'}</td>
                                    <td style={{ ...styles.tdNum, fontWeight: esInstructor ? 'bold' : 'normal' }}>
                                        {hsInstTotal > 0 ? hsInstTotal.toFixed(1) : '-'}
                                    </td>

                                    {/* TOTALES ACUMULADOS */}
                                    <td style={{ ...styles.tdNum, fontWeight: 'bold' }}>{row.totalAcumulSarm ? row.totalAcumulSarm.toFixed(1) : '0.0'}</td>
                                    <td style={{ ...styles.tdNum, fontWeight: 'bold' }}>{row.totalGeneral ? row.totalGeneral.toFixed(1) : '0.0'}</td>
                                    <td style={{ ...styles.tdNum, backgroundColor: '#fafafa' }}>{row.totalSarmAl31Dic ? row.totalSarmAl31Dic.toFixed(1) : '0.0'}</td>
                                </tr>
                            );
                        })
                    ) : (
                        <tr>
                            <td colSpan="12" style={{ ...styles.tdCenter, padding: '15px' }}>
                                No hay tripulantes cargados para el SARM y Trimestre seleccionado.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* CUADRO RESUMEN DE PILOTOS - TRIMESTRE (5) */}
            <div style={styles.resumenWrapper}>
                <div style={styles.resumenTitle}>TRIMESTRE (5)</div>
                <div style={styles.resumenBox}>
                    <div style={styles.resumenItem}>
                        <strong>TOTAL DE PILOTOS PREVISTOS PARA VOLAR:</strong> {pilotosPrevistos}
                    </div>
                    <div style={styles.resumenItem}>
                        <strong>TOTAL DE PILOTOS QUE VUELAN:</strong> {pilotosQueVuelan}
                    </div>
                    <div style={styles.resumenItem}>
                        <strong>TOTAL DE PILOTOS QUE NO CUMPLIERON EBM:</strong> {pilotosNoCumplieron}
                    </div>
                </div>
            </div>

            {/* SECCIÓN NOTAS: (2) */}
            <div style={styles.obsBox}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px', textDecoration: 'underline' }}>NOTAS:</div>
                <ul style={{ margin: 0, paddingLeft: '18px' }}>
                    {observaciones.map((obs, idx) => (
                        <li key={idx} style={{ fontSize: '9.5px', lineHeight: '1.3' }}>{obs}</li>
                    ))}
                </ul>
            </div>

            {/* SELLO REGLAMENTARIO DE SEGURIDAD INFERIOR */}
            <div style={{ ...styles.selloWrapper, marginTop: '15px' }}>
                <div style={styles.selloReservadoBox}>
                    RESERVADO
                </div>
            </div>
        </div>
    );
});

const styles = {
    page: {
        width: '100%',
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
        color: '#000000',
        fontFamily: '"Times New Roman", Times, serif',
        fontSize: '10px',
        lineHeight: '1.2',
        padding: '5mm 10mm'
    },
    selloWrapper: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        marginBottom: '6px'
    },
    selloReservadoBox: {
        width: '55mm',
        height: '10mm',
        border: '1px solid #000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"Times New Roman", Times, serif',
        fontWeight: 'bold',
        fontSize: '13px',
        letterSpacing: '1px',
        textTransform: 'uppercase',
        boxSizing: 'border-box'
    },
    headerContainer: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '8px'
    },
    headerLeftBlock: {
        textAlign: 'center',
        fontStyle: 'italic',
        lineHeight: '1.1'
    },
    entidad: {
        fontSize: '11.5px',
        fontWeight: 'bold'
    },
    unidadHeader: {
        fontSize: '10.5px',
        fontWeight: 'normal'
    },
    headerRightBlock: {
        textAlign: 'right',
        fontStyle: 'italic',
        maxWidth: '50%'
    },
    leyendaAno: {
        fontSize: '9.5px',
        fontWeight: 'bold'
    },
    titleContainer: {
        textAlign: 'center',
        margin: '8px 0 10px 0'
    },
    mainTitle: {
        margin: 0,
        fontSize: '11.5px',
        fontWeight: 'bold',
        letterSpacing: '0.5px',
        textTransform: 'uppercase'
    },
    metaContainer: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '8px',
        fontSize: '10px'
    },
    metaColLeft: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px'
    },
    metaColRight: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        minWidth: '150px'
    },
    metaLine: {
        display: 'flex',
        gap: '6px'
    },
    metaLineRight: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: '10px'
    },
    metaLabel: {
        fontWeight: 'bold'
    },
    metaValue: {
        fontWeight: 'normal'
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        border: '1px solid #000000',
        marginBottom: '10px',
        fontSize: '9px'
    },
    th: {
        border: '1px solid #000000',
        padding: '4px 2px',
        textAlign: 'center',
        fontWeight: 'bold',
        backgroundColor: '#ffffff'
    },
    thSub: {
        border: '1px solid #000000',
        padding: '3px 2px',
        textAlign: 'center',
        fontWeight: 'bold',
        backgroundColor: '#ffffff'
    },
    tdCenter: {
        border: '1px solid #000000',
        padding: '3px 2px',
        textAlign: 'center'
    },
    tdLeft: {
        border: '1px solid #000000',
        padding: '3px 5px',
        textAlign: 'left',
        textTransform: 'uppercase'
    },
    tdNum: {
        border: '1px solid #000000',
        padding: '3px 4px',
        textAlign: 'right'
    },
    resumenWrapper: {
        width: '55%',
        marginBottom: '10px'
    },
    resumenTitle: {
        fontSize: '9.5px',
        fontWeight: 'bold',
        marginBottom: '2px'
    },
    resumenBox: {
        display: 'flex',
        flexDirection: 'column',
        gap: '3px',
        border: '1px solid #000000',
        padding: '6px 10px',
        fontSize: '9.5px'
    },
    resumenItem: {
        textAlign: 'left'
    },
    obsBox: {
        border: '1px solid #000000',
        padding: '6px 8px',
        fontSize: '9.5px',
        minHeight: '30px'
    }
};

export default EbmInformeOficial;