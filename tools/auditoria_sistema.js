const fs = require('fs');
const path = require('path');

// Configuración de carpetas a ignorar por seguridad y rendimiento
const IGNORE_DIRS = ['node_modules', '.git', 'build', 'dist'];
const EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];

/**
 * ESCÁNER DE DEPENDENCIAS - ESTÁNDAR DE SEGURIDAD AE
 * Este script mapea las conexiones entre archivos del sistema.
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
    console.log("=== INICIANDO AUDITORÍA DE INTERCONEXIONES TÁCTICAS ===");
    const rootDir = path.join(__dirname, '../'); // Ajusta según la ubicación del script
    const allFiles = scanDirectory(rootDir);
    const graph = {};

    allFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf-8');
        const fileName = path.relative(rootDir, file);
        
        // Regex para capturar imports y requires
        const importRegex = /(?:import|require)\s*\(?['"](.+?)['"]\)?/g;
        let match;
        const dependencies = [];

        while ((match = importRegex.exec(content)) !== null) {
            // Limpiamos la ruta del import para que sea legible
            dependencies.push(match[1]);
        }

        if (dependencies.length > 0) {
            graph[fileName] = dependencies;
        }
    });

    // Reporte Final
    console.log(`\nArchivos analizados: ${allFiles.length}`);
    console.log("--------------------------------------------------");
    
    for (const [file, deps] of Object.entries(graph)) {
        console.log(`\n📄 [ARCHIVO]: ${file}`);
        deps.forEach(dep => {
            console.log(`   └── 🔗 Conecta con: ${dep}`);
        });
    }
    
    console.log("\n=== FIN DE AUDITORÍA ===");
}

analyzeConnections();