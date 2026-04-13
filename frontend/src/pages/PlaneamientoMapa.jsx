import React from 'react';
import { MapContainer, TileLayer, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const { BaseLayer } = LayersControl;

const PlaneamientoMapa = () => {
    return (
        <div style={styles.mapWrapper}>
            <div style={styles.header}>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', letterSpacing: '3px' }}>PLANEAMIENTO MILITAR</div>
                <div style={styles.subHeader}>ANÁLISIS DE TERRENO Y COTAS</div>
            </div>

            <MapContainer 
                center={[-34.528, -58.641]} 
                zoom={6} 
                style={{ height: '100%', width: '100%', zIndex: 1 }}
                zoomControl={false}
            >
                <LayersControl position="topright">
                    {/* 1. CAPA MODO NOCTURNO */}
                    <BaseLayer checked name="🌑 Modo Nocturno">
                        <TileLayer 
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
                            attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                        />
                    </BaseLayer>

                    {/* 2. CAPA RELIEVE / SATELITAL */}
                    <BaseLayer name="🏔️ Relieve (Satelital)">
                        <TileLayer 
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" 
                            attribution='Tiles &copy; Esri &mdash; Source: Esri'
                        />
                    </BaseLayer>

                    {/* 3. CAPA POLÍTICO */}
                    <BaseLayer name="🗺️ Político">
                        <TileLayer 
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        />
                    </BaseLayer>

                    {/* 4. CAPA CURVAS DE NIVEL */}
                    <BaseLayer name="📈 Curvas de Nivel">
                        <TileLayer 
                            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" 
                            attribution='Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap'
                        />
                    </BaseLayer>
                </LayersControl>
            </MapContainer>

            <style>{`
                .leaflet-control-layers { 
                    background: #1a1a1a !important; 
                    color: white !important; 
                    border: 1px solid #00d4ff !important; 
                    font-family: monospace;
                    border-radius: 4px;
                }
                .leaflet-control-layers-list { padding: 5px; }
                .leaflet-control-layers-base label { margin-bottom: 5px; cursor: pointer; }
            `}</style>
        </div>
    );
};

const styles = {
    mapWrapper: { 
        width: '100%', 
        height: '100vh', 
        position: 'relative', 
        backgroundColor: '#050505', 
        overflow: 'hidden' 
    },
    header: { 
        position: 'absolute', 
        top: '20px', 
        left: '50%', 
        transform: 'translateX(-50%)', 
        zIndex: 1000, 
        background: 'rgba(10, 10, 10, 0.95)', 
        color: '#00d4ff', 
        padding: '12px 30px', 
        border: '1px solid #00d4ff', 
        textAlign: 'center', 
        borderRadius: '4px', 
        boxShadow: '0 0 20px rgba(0,0,0,0.8)',
        fontFamily: 'monospace'
    },
    subHeader: { 
        fontSize: '0.65rem', 
        color: '#bdc3c7', 
        marginTop: '4px', 
        borderTop: '1px solid #333', 
        paddingTop: '4px', 
        letterSpacing: '1px' 
    }
};

export default PlaneamientoMapa;