import React, { useState } from 'react';
import { MapContainer, TileLayer, LayersControl, Marker, Polyline, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Corregir iconos de Leaflet por defecto
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const { BaseLayer } = LayersControl;

// Componente para manejar los clicks en el mapa
const MapEvents = ({ setPuntos }) => {
    useMapEvents({
        click(e) {
            setPuntos(prev => [...prev, e.latlng]);
        },
    });
    return null;
};

const PlaneamientoMapa = () => {
    const [puntos, setPuntos] = useState([]);

    // Función para limpiar la navegación
    const limpiarNavegacion = () => setPuntos([]);

    // Cálculo de distancia total
    const calcularDistanciaTotal = () => {
        let total = 0;
        for (let i = 0; i < puntos.length - 1; i++) {
            total += puntos[i].distanceTo(puntos[i + 1]);
        }
        return (total / 1000).toFixed(2); // Retorna en Kilómetros
    };

    return (
        <div style={styles.mapWrapper}>
            <div style={styles.header}>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', letterSpacing: '3px' }}>PLANEAMIENTO MILITAR</div>
                <div style={styles.subHeader}>
                    {puntos.length > 1 
                        ? `DISTANCIA TOTAL: ${calcularDistanciaTotal()} KM` 
                        : "ANÁLISIS DE TERRENO Y COTAS"}
                </div>
                {puntos.length > 0 && (
                    <button onClick={limpiarNavegacion} style={styles.btnLimpiar}>
                        LIMPIAR RUTA
                    </button>
                )}
            </div>

            <MapContainer 
                center={[-34.528, -58.641]} 
                zoom={12} 
                style={{ height: '100%', width: '100%', zIndex: 1 }}
                zoomControl={false}
            >
                <MapEvents setPuntos={setPuntos} />

                <LayersControl position="topright">
                    <BaseLayer checked name="🌑 Modo Nocturno">
                        <TileLayer 
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
                            attribution='&copy; CARTO'
                        />
                    </BaseLayer>

                    <BaseLayer name="🏔️ Relieve (Satelital)">
                        <TileLayer 
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" 
                            attribution='Esri'
                        />
                    </BaseLayer>

                    <BaseLayer name="🗺️ Político">
                        <TileLayer 
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                            attribution='&copy; OpenStreetMap'
                        />
                    </BaseLayer>

                    <BaseLayer name="📈 Curvas de Nivel">
                        <TileLayer 
                            url="https://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png" 
                            attribution='&copy; Thunderforest'
                        />
                    </BaseLayer>
                </LayersControl>

                {/* Dibujar Marcadores */}
                {puntos.map((pos, idx) => (
                    <Marker key={idx} position={pos}>
                        <Popup>Punto {idx + 1}<br/>Lat: {pos.lat.toFixed(4)}<br/>Lng: {pos.lng.toFixed(4)}</Popup>
                    </Marker>
                ))}

                {/* Dibujar Línea de Navegación */}
                {puntos.length > 1 && (
                    <Polyline positions={puntos} color="#00d4ff" weight={3} dashArray="10, 10" />
                )}
            </MapContainer>

            <style>{`
                .leaflet-control-layers { 
                    background: #1a1a1a !important; 
                    color: white !important; 
                    border: 1px solid #00d4ff !important; 
                    font-family: monospace;
                    border-radius: 4px;
                }
            `}</style>
        </div>
    );
};

const styles = {
    mapWrapper: { width: '100%', height: '100vh', position: 'relative', backgroundColor: '#050505', overflow: 'hidden' },
    header: { 
        position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, 
        background: 'rgba(10, 10, 10, 0.95)', color: '#00d4ff', padding: '12px 30px', 
        border: '1px solid #00d4ff', textAlign: 'center', borderRadius: '4px', fontFamily: 'monospace'
    },
    subHeader: { fontSize: '0.65rem', color: '#bdc3c7', marginTop: '4px', borderTop: '1px solid #333', paddingTop: '4px', letterSpacing: '1px' },
    btnLimpiar: {
        marginTop: '8px', background: 'transparent', border: '1px solid #ff4444', color: '#ff4444',
        cursor: 'pointer', fontSize: '0.6rem', padding: '2px 10px', borderRadius: '2px', fontFamily: 'monospace'
    }
};

export default PlaneamientoMapa;