const fs = require('fs');
const path = require('path');

// Configuración de carpetas a ignorar por seguridad y rendimiento
const IGNORE_DIRS = ['node_modules', '.git', 'build', 'dist'];
const EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];

/**
 * ESCÁNER DE DEPENDENCIAS - ESTÁNDAR DE SEGURIDAD AE
 * Versión 2.0: Soporte mejorado para Imports de React (SINCRO JOKER)
 */

function scanDirectory(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            if (!IGNORE_DIRS.includes(file)) {
                scanDirectory(filePath, fileList);
            }
        } else if (EXTENSIONS.includes(path.extname(file))) {
            fileList.push(filePath);
        }
    });
    return fileList;
}

function analyzeConnections() {
    console.log("=== INICIANDO AUDITORÍA DE INTERCONEXIONES TÁCTICAS (V2.0) ===");
    // Ajuste de ruta raíz: sube un nivel desde 'tools/' para llegar a la raíz del proyecto
    const rootDir = path.resolve(__dirname, '..'); 
    const allFiles = scanDirectory(rootDir);
    const graph = {};

    allFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf-8');
        const fileName = path.relative(rootDir, file);
        
        /**
         * REGEX TÁCTICA OPTIMIZADA:
         * 1. Captura 'require("...")'
         * 2. Captura 'import ... from "..."'
         * 3. Captura 'import "..."'
         */
        const importRegex = /(?:import|require).*?['"](.+?)['"]/g;
        
        let match;
        const dependencies = new Set(); // Usamos Set para evitar duplicados en el mismo archivo

        while ((match = importRegex.exec(content)) !== null) {
            // Limpiamos la ruta para omitir librerías de node_modules y solo ver archivos locales
            const depPath = match[1];
            dependencies.add(depPath);
        }

        if (dependencies.size > 0) {
            graph[fileName] = Array.from(dependencies);
        }
    });

    // Reporte Final
    console.log(`\nArchivos analizados: ${allFiles.length}`);
    console.log("--------------------------------------------------");
    
    // Ordenamos alfabéticamente para facilitar la lectura
    const sortedFiles = Object.keys(graph).sort();

    sortedFiles.forEach(file => {
        console.log(`\n📄 [ARCHIVO]: ${file}`);
        graph[file].forEach(dep => {
            console.log(`   └── 🔗 Conecta con: ${dep}`);
        });
    });
    
    console.log("\n=== FIN DE AUDITORÍA ===");
}

analyzeConnections();