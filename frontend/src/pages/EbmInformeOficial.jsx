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

            {/* SELLO REGLAMENTARIO DE SEGURIDAD SUPERIOR (55mm x 10mm) */}
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

            {/* TÍTULO PRINCIPAL CON SUBRAYADO */}
            <div style={styles.titleContainer}>
                <h3 style={styles.mainTitle}>
                    <u>INFORME EXIGENCIAS BÁSICAS MÍNIMAS {unidad.toUpperCase()}</u>
                </h3>
            </div>

            {/* METADATOS / ENCABEZADO TÉCNICO */}
            <div style={styles.metaContainer}>
                <div style={styles.metaColLeft}>
                    <div style={styles.metaLine}>
                        <span style={styles.metaLabel}>FUERZA ARMADA:</span>
                        <span style={styles.metaValue}>EJÉRCITO ARGENTINO</span>
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

            {/* TABLA PRINCIPAL CON BORDES VISIBLES */}
            <table style={styles.table}>
                <thead>
                    <tr>
                        <th rowSpan="2" style={{ ...styles.th, width: '30px' }}>N°</th>
                        <th rowSpan="2" style={{ ...styles.th, width: '85px' }}>Nº CONTROL</th>
                        <th rowSpan="2" style={{ ...styles.th, width: '55px' }}>GRADO</th>
                        <th rowSpan="2" style={{ ...styles.th, textAlign: 'left', paddingLeft: '8px' }}>APELLIDO Y NOMBRE</th>
                        <th rowSpan="2" style={{ ...styles.th, width: '110px' }}>CUMPLE EBM COMO</th>
                        <th colSpan="3" style={{ ...styles.th, borderBottom: '1px solid #000' }}>HORAS DE VUELO</th>
                        <th rowSpan="2" style={{ ...styles.th, width: '85px' }}>TOTAL ACUMUL SARM</th>
                        <th rowSpan="2" style={{ ...styles.th, width: '85px' }}>TOTAL GENERAL</th>
                        <th rowSpan="2" style={{ ...styles.th, width: '100px' }}>TOTAL GENERAL AL 31Dic{anioAnterior}</th>
                    </tr>
                    <tr>
                        <th style={{ ...styles.thSub, width: '60px' }}>PILOTO</th>
                        <th style={{ ...styles.thSub, width: '60px' }}>COPILOTO</th>
                        <th style={{ ...styles.thSub, width: '75px' }}>INSTRUCTOR</th>
                    </tr>
                </thead>
                <tbody>
                    {datos.length > 0 ? (
                        datos.map((row, index) => (
                            <tr key={row._id || index}>
                                <td style={styles.tdCenter}>{index + 1}</td>
                                <td style={styles.tdCenter}>{row.nroControl || '-'}</td>
                                <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>{row.grado}</td>
                                <td style={styles.tdLeft}>{row.apellidoNombre}</td>
                                <td style={{ ...styles.tdCenter, textTransform: 'uppercase', fontSize: '9.5px' }}>{row.cumpleComo || 'COPILOTO'}</td>
                                <td style={styles.tdNum}>{row.hsPiloto > 0 ? row.hsPiloto.toFixed(1) : '-'}</td>
                                <td style={styles.tdNum}>{row.hsCopiloto > 0 ? row.hsCopiloto.toFixed(1) : '-'}</td>
                                <td style={styles.tdNum}>{row.hsInstructor > 0 ? row.hsInstructor.toFixed(1) : '-'}</td>
                                <td style={{ ...styles.tdNum, fontWeight: 'bold' }}>{row.totalAcumulSarm ? row.totalAcumulSarm.toFixed(1) : '0.0'}</td>
                                <td style={{ ...styles.tdNum, fontWeight: 'bold' }}>{row.totalGeneral ? row.totalGeneral.toFixed(1) : '0.0'}</td>
                                <td style={{ ...styles.tdNum, backgroundColor: '#fafafa' }}>{row.totalSarmAl31Dic ? row.totalSarmAl31Dic.toFixed(1) : '0.0'}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="11" style={{ ...styles.tdCenter, padding: '15px' }}>
                                No hay tripulantes cargados para el SARM y Trimestre seleccionado.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* CUADRO RESUMEN DE PILOTOS */}
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

            {/* SECCIÓN OBSERVACIONES */}
            <div style={styles.obsBox}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px', textDecoration: 'underline' }}>OBSERVACIONES:</div>
                <ul style={{ margin: 0, paddingLeft: '18px' }}>
                    {observaciones.map((obs, idx) => (
                        <li key={idx} style={{ fontSize: '10px', lineHeight: '1.3' }}>{obs}</li>
                    ))}
                </ul>
            </div>

            {/* SELLO REGLAMENTARIO DE SEGURIDAD INFERIOR (55mm x 10mm) */}
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
        fontSize: '10.5px',
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
        fontSize: '14px',
        letterSpacing: '1px',
        textTransform: 'uppercase',
        boxSizing: 'border-box'
    },
    headerContainer: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '10px'
    },
    headerLeftBlock: {
        textAlign: 'center',
        fontStyle: 'italic',
        lineHeight: '1.1'
    },
    entidad: {
        fontSize: '12px',
        fontWeight: 'bold'
    },
    unidadHeader: {
        fontSize: '11px',
        fontWeight: 'normal'
    },
    headerRightBlock: {
        textAlign: 'right',
        fontStyle: 'italic',
        maxWidth: '50%'
    },
    leyendaAno: {
        fontSize: '10px',
        fontWeight: 'bold'
    },
    titleContainer: {
        textAlign: 'center',
        margin: '10px 0 12px 0'
    },
    mainTitle: {
        margin: 0,
        fontSize: '12px',
        fontWeight: 'bold',
        letterSpacing: '0.5px',
        textTransform: 'uppercase'
    },
    metaContainer: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '10px',
        fontSize: '10.5px'
    },
    metaColLeft: {
        display: 'flex',
        flexDirection: 'column',
        gap: '3px'
    },
    metaColRight: {
        display: 'flex',
        flexDirection: 'column',
        gap: '3px',
        minWidth: '160px'
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
        fontSize: '9.5px'
    },
    th: {
        border: '1px solid #000000',
        padding: '5px 3px',
        textAlign: 'center',
        fontWeight: 'bold',
        backgroundColor: '#ffffff'
    },
    thSub: {
        border: '1px solid #000000',
        padding: '4px 2px',
        textAlign: 'center',
        fontWeight: 'bold',
        backgroundColor: '#ffffff'
    },
    tdCenter: {
        border: '1px solid #000000',
        padding: '4px 3px',
        textAlign: 'center'
    },
    tdLeft: {
        border: '1px solid #000000',
        padding: '4px 6px',
        textAlign: 'left',
        textTransform: 'uppercase'
    },
    tdNum: {
        border: '1px solid #000000',
        padding: '4px 5px',
        textAlign: 'right'
    },
    resumenBox: {
        display: 'flex',
        justifyContent: 'space-around',
        border: '1px solid #000000',
        padding: '6px 10px',
        marginBottom: '10px',
        fontSize: '10px'
    },
    resumenItem: {
        textAlign: 'center'
    },
    obsBox: {
        border: '1px solid #000000',
        padding: '8px 10px',
        fontSize: '10px',
        minHeight: '35px'
    }
};

export default EbmInformeOficial;