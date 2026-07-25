import React, { useState } from 'react';

const FichaAlumnoInstruccion = () => {
    // Alumno seleccionado por defecto o recibido por props
    const [alumno, setAlumno] = useState({
        id: '1',
        nombre: 'Tte. Juan Pérez',
        dni: '35.123.456',
        promocion: '2026',
        especialidad: 'Piloto de Aviación de Ejército',
        horasVoladasTotales: 342.5,
        estado: 'DESTACADO',
        psicotecnico: {
            fecha: '2026-02-15',
            especialista: 'Lic. M. Soria (Mat. 4589)',
            aptitud: 'APTO',
            atencionConcentracion: 9,
            toleranciaEstres: 8,
            tomaDecisiones: 9,
            trabajoEnEquipo: 9,
            estabilidadEmocional: 8,
            informe: 'El evaluado demuestra excelente templanza bajo presión, alta capacidad adaptativa frente a emergencias simuladas y óptima comunicación con la tripulación.'
        },
        fisico: {
            fecha: '2026-05-10',
            periodo: '1° Trimestre 2026',
            notaGlobal: 9.2,
            resistencia: '2800m (Nota: 9)',
            flexiones: '52 rep (Nota: 10)',
            abdominales: '60 rep (Nota: 9)'
        },
        promediosCompetenciasVuelo: [
            { competencia: 'Procedimientos Pre-Vuelo', nota: 4.8 },
            { competencia: 'Mantenimiento de Parámetros', nota: 4.5 },
            { competencia: 'Procedimientos de Emergencia', nota: 4.2 },
            { competencia: 'Navegación / Táctica', nota: 4.9 },
            { competencia: 'Aterrizaje y Viento Cruzado', nota: 4.6 }
        ],
        ultimasMaterias: [
            { materia: 'Aerodinámica y Performance', fecha: '2026-03-12', tipo: 'Parcial', nota: 9.5 },
            { materia: 'Navegación Aérea II', fecha: '2026-04-05', tipo: 'Trabajo Práctico', nota: 8.8 },
            { materia: 'Meteorología Aeronáutica', fecha: '2026-05-20', tipo: 'Final', nota: 9.0 }
        ]
    });

    const handleImprimir = () => {
        window.print();
    };

    return (
        <div style={styles.container}>
            {/* BARRA SUPERIOR DE ACCIONES (No se imprime en PDF) */}
            <div style={{ ...styles.actionBar, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="no-print">
                <h3 style={{ margin: 0, color: '#1b2a4a', fontSize: '1rem' }}>🎓 FICHA INDIVIDUAL DEL ALUMNO</h3>
                <button style={styles.btnPrint} onClick={handleImprimir}>
                    🖨️ Imprimir / Exportar PDF
                </button>
            </div>

            {/* CONTENEDOR DE FICHA IMPRIMIBLE */}
            <div style={styles.fichaCard} id="printableFicha">
                
                {/* ENCABEZADO Y CABECERA DEL TRIPULANTE */}
                <div style={styles.headerProfile}>
                    <div style={styles.avatarBox}>
                        <span style={{ fontSize: '2.5rem' }}>👨‍✈️</span>
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h2 style={styles.nombre}>{alumno.nombre}</h2>
                                <p style={styles.subtext}>DNI: {alumno.dni} | Promoción: {alumno.promocion}</p>
                                <span style={styles.badgeEspecialidad}>{alumno.especialidad}</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={styles.statHsBox}>
                                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#7f8c8d' }}>Horas de Vuelo</span>
                                    <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#1b2a4a', display: 'block' }}>{alumno.horasVoladasTotales} Hs</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* GRILLA DE CONTENIDO: COMPETENCIAS Y ACADÉMICO */}
                <div style={styles.grid2}>
                    
                    {/* COMPETENCIAS DE VUELO */}
                    <div style={styles.sectionBox}>
                        <h4 style={styles.sectionTitle}>✈️ Desempeño y Competencias de Vuelo (Escala 1 - 5)</h4>
                        <div style={{ marginTop: '10px' }}>
                            {alumno.promediosCompetenciasVuelo.map((c, i) => (
                                <div key={i} style={{ marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '3px' }}>
                                        <span>{c.competencia}</span>
                                        <span style={{ color: '#27ae60' }}>{c.nota} / 5</span>
                                    </div>
                                    <div style={styles.progressBarBg}>
                                        <div style={{ ...styles.progressBarFill, width: `${(c.nota / 5) * 100}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* EVALUACIÓN PSICOTÉCNICA */}
                    <div style={styles.sectionBox}>
                        <h4 style={styles.sectionTitle}>🧠 Informe Psicotécnico</h4>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <span style={{ fontSize: '0.75rem', color: '#7f8c8d' }}>Eval: {alumno.psicotecnico.especialista}</span>
                            <span style={styles.badgeApto}>🟢 {alumno.psicotecnico.aptitud}</span>
                        </div>
                        
                        <div style={styles.metricGridMini}>
                            <div>
                                <span style={styles.miniLabel}>Atención/Conc:</span>
                                <strong>{alumno.psicotecnico.atencionConcentracion}/10</strong>
                            </div>
                            <div>
                                <span style={styles.miniLabel}>Tol. Estrés:</span>
                                <strong>{alumno.psicotecnico.toleranciaEstres}/10</strong>
                            </div>
                            <div>
                                <span style={styles.miniLabel}>Toma Decis:</span>
                                <strong>{alumno.psicotecnico.tomaDecisiones}/10</strong>
                            </div>
                            <div>
                                <span style={styles.miniLabel}>Trab. Equipo:</span>
                                <strong>{alumno.psicotecnico.trabajoEnEquipo}/10</strong>
                            </div>
                        </div>

                        <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '4px', borderLeft: '3px solid #3498db', marginTop: '10px', fontSize: '0.75rem', fontStyle: 'italic', color: '#334155' }}>
                            "{alumno.psicotecnico.informe}"
                        </div>
                    </div>

                </div>

                {/* RENDIMIENTO ACADÉMICO Y FÍSICO MILITAR */}
                <div style={{ ...styles.grid2, marginTop: '15px' }}>
                    
                    {/* ACADÉMICO */}
                    <div style={styles.sectionBox}>
                        <h4 style={styles.sectionTitle}>📚 Registro Académico Reciente</h4>
                        <table style={styles.table}>
                            <thead>
                                <tr style={styles.thRow}>
                                    <th style={styles.th}>Materia</th>
                                    <th style={styles.th}>Tipo</th>
                                    <th style={styles.th}>Fecha</th>
                                    <th style={styles.th}>Nota</th>
                                </tr>
                            </thead>
                            <tbody>
                                {alumno.ultimasMaterias.map((m, idx) => (
                                    <tr key={idx} style={styles.tr}>
                                        <td style={{ ...styles.td, fontWeight: 'bold' }}>{m.materia}</td>
                                        <td style={styles.td}>{m.tipo}</td>
                                        <td style={styles.td}>{m.fecha}</td>
                                        <td style={{ ...styles.td, fontWeight: 'bold', color: '#27ae60', textAlign: 'center' }}>{m.nota}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* FÍSICO MILITAR */}
                    <div style={styles.sectionBox}>
                        <h4 style={styles.sectionTitle}>🏋️ Adiestramiento Físico Militar</h4>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.8rem' }}>
                            <span><strong>Período:</strong> {alumno.fisico.periodo}</span>
                            <span style={{ color: '#27ae60', fontWeight: 'bold' }}>Global: {alumno.fisico.notaGlobal} / 10</span>
                        </div>
                        <ul style={styles.listFisico}>
                            <li>🏃 <strong>Resistencia Aeróbica:</strong> {alumno.fisico.resistencia}</li>
                            <li>💪 <strong>Flexiones de Brazo:</strong> {alumno.fisico.flexiones}</li>
                            <li>🤸 <strong>Abdominales:</strong> {alumno.fisico.abdominales}</li>
                        </ul>
                    </div>

                </div>

            </div>
        </div>
    );
};

const styles = {
    container: { padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f4f6f9', minHeight: '100vh' },
    actionBar: { backgroundColor: '#fff', padding: '12px 20px', borderRadius: '6px', border: '1px solid #dcdfe6', marginBottom: '15px' },
    btnPrint: { backgroundColor: '#1b2a4a', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' },
    fichaCard: { background: '#fff', padding: '25px', borderRadius: '6px', border: '1px solid #dcdfe6', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' },
    headerProfile: { display: 'flex', gap: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '20px', marginBottom: '20px', alignItems: 'center' },
    avatarBox: { background: '#e2e8f0', width: '70px', height: '70px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    nombre: { margin: 0, fontSize: '1.3rem', color: '#1b2a4a', fontWeight: 'bold' },
    subtext: { margin: '3px 0 8px 0', fontSize: '0.8rem', color: '#64748b' },
    badgeEspecialidad: { background: '#e0e7ff', color: '#3730a3', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' },
    statHsBox: { background: '#f8fafc', padding: '8px 15px', borderRadius: '6px', border: '1px solid #cbd5e1' },
    grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' },
    sectionBox: { background: '#fff', padding: '15px', borderRadius: '6px', border: '1px solid #e2e8f0' },
    sectionTitle: { fontSize: '0.85rem', color: '#1b2a4a', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginTop: 0, marginBottom: '12px' },
    progressBarBg: { height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' },
    progressBarFill: { height: '100%', background: '#27ae60', borderRadius: '4px', transition: 'width 0.4s ease' },
    badgeApto: { background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' },
    metricGridMini: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.75rem', background: '#f1f5f9', padding: '8px', borderRadius: '4px' },
    miniLabel: { display: 'block', color: '#64748b', fontSize: '0.65rem' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' },
    thRow: { background: '#f8fafc', textAlign: 'left' },
    th: { padding: '6px 8px', color: '#475569', fontWeight: 'bold', borderBottom: '1px solid #cbd5e1' },
    tr: { borderBottom: '1px solid #f1f5f9' },
    td: { padding: '6px 8px', color: '#334155' },
    listFisico: { paddingLeft: '18px', margin: 0, fontSize: '0.8rem', lineHeight: '1.8', color: '#334155' }
};

export default FichaAlumnoInstruccion;