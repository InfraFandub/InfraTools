// Obtener referencias a los elementos del DOM
const dropArea = document.getElementById('drop-area');
const fileElem = document.getElementById('fileElem');
const convertBtn = document.getElementById('convert-btn');
const outputFormatSelect = document.getElementById('output-format');
const previewArea = document.getElementById('preview-area');
const downloadAllBtn = document.getElementById('download-all-btn');
const noImagesMessage = document.getElementById('no-images-message');
const clearBtn = document.getElementById('clear-btn');

let selectedFiles = []; // Almacena los archivos de imagen seleccionados
let convertedImages = []; // Almacena los Blobs de las imágenes convertidas para la descarga ZIP

// --- Eventos de Arrastrar y Soltar ---
;['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

;['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false);
});

;['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false);
});

function highlight() {
    dropArea.classList.add('highlight');
}

function unhighlight() {
    dropArea.classList.remove('highlight');
}

dropArea.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

// --- Evento de Selección de Archivos por Clic ---
fileElem.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

// --- Función de Ordenamiento de Archivos Mejorada ---
function sortFiles() {
    selectedFiles.sort((a, b) => {
        // Función para extraer números del nombre del archivo
        const extractNumbers = (filename) => {
            // Remover la extensión del archivo
            const nameWithoutExtension = filename.split('.').slice(0, -1).join('.');
            
            // Buscar todos los números en el nombre (incluyendo 0)
            const numbers = nameWithoutExtension.match(/\d+/g);
            
            if (!numbers || numbers.length === 0) {
                return [999999]; // Si no hay números, va al final
            }
            
            // Convertir todos los números encontrados a enteros
            // parseInt maneja correctamente "0", "00", "000" etc.
            return numbers.map(num => {
                const parsed = parseInt(num, 10);
                return isNaN(parsed) ? 999999 : parsed;
            });
        };

        const numbersA = extractNumbers(a.name);
        const numbersB = extractNumbers(b.name);

        // Comparar número por número
        const maxLength = Math.max(numbersA.length, numbersB.length);
        
        for (let i = 0; i < maxLength; i++) {
            const numA = numbersA[i] !== undefined ? numbersA[i] : 999999;
            const numB = numbersB[i] !== undefined ? numbersB[i] : 999999;
            
            if (numA !== numB) {
                return numA - numB;
            }
        }

        // Si todos los números son iguales, ordenar alfabéticamente
        return a.name.localeCompare(b.name, undefined, { 
            numeric: true, 
            sensitivity: 'base' 
        });
    });
    
    displayPreviews(); // Volver a mostrar las previsualizaciones después de ordenar
}

// --- Manejo de Archivos Seleccionados ---
function handleFiles(files) {
    // Convertir FileList a Array y añadir a selectedFiles
    selectedFiles = [...selectedFiles, ...Array.from(files)];
    
    sortFiles(); // Llamar a la función de ordenamiento inmediatamente después de añadir archivos

    // Mostrar el botón de convertir si hay archivos
    if (selectedFiles.length > 0) {
        convertBtn.style.display = 'inline-block';
        noImagesMessage.style.display = 'none';
    }
}

// --- Mostrar Previsualizaciones de Imágenes (CORREGIDA) ---
async function displayPreviews() {
    // Limpiar el área de previsualización (excepto el título y mensaje)
    const existingCards = previewArea.querySelectorAll('.image-card');
    existingCards.forEach(card => card.remove());

    if (selectedFiles.length === 0) {
        noImagesMessage.style.display = 'block';
        downloadAllBtn.style.display = 'none';
        convertBtn.style.display = 'none'; // Ocultar botón de convertir si no hay imágenes
        return;
    } else {
        noImagesMessage.style.display = 'none';
    }

    // Procesar archivos de forma secuencial para mantener el orden
    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        try {
            const dataURL = await readFileAsDataURL(file);
            
            const imageCard = document.createElement('div');
            imageCard.classList.add('image-card');
            // Usar el nombre original del archivo como identificador único para la tarjeta
            imageCard.dataset.originalFilename = file.name; 
            // Añadir índice para mantener orden
            imageCard.dataset.index = i;

            const img = document.createElement('img');
            img.src = dataURL;
            img.alt = file.name;

            const originalName = document.createElement('p');
            originalName.textContent = `Original: ${file.name}`;

            const convertedName = document.createElement('p');
            convertedName.textContent = 'Convertida: Pendiente...';
            convertedName.classList.add('converted-name'); // Para actualizarlo después

            const downloadBtn = document.createElement('button');
            downloadBtn.textContent = 'Descargar';
            downloadBtn.classList.add('download-single-btn');
            downloadBtn.style.display = 'none'; // Ocultar hasta que se convierta

            imageCard.appendChild(img);
            imageCard.appendChild(originalName);
            imageCard.appendChild(convertedName);
            imageCard.appendChild(downloadBtn);
            previewArea.appendChild(imageCard);
            
        } catch (error) {
            console.error(`Error al cargar la imagen ${file.name}:`, error);
        }
    }
}

// Función helper para convertir FileReader en Promise
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(event) {
            resolve(event.target.result);
        };
        reader.onerror = function(event) {
            reject(new Error(`Error al leer el archivo: ${file.name}`));
        };
        reader.readAsDataURL(file);
    });
}

// --- Lógica de Conversión ---
convertBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) {
        alert('Por favor, selecciona al menos una imagen para convertir.');
        return;
    }

    convertedImages = []; // Reiniciar las imágenes convertidas para el ZIP
    downloadAllBtn.style.display = 'none'; // Ocultar el botón ZIP hasta que todo esté convertido

    const outputFormat = outputFormatSelect.value;
    let outputExtension = outputFormat.split('/')[1];
    
    if (outputExtension === 'jpeg') {
        outputExtension = 'jpg'; // Asegurar que la extensión sea .jpg
    }

    // Usar Promise.all para manejar las conversiones en paralelo y esperar a que todas terminen
    const conversionPromises = selectedFiles.map(async (file) => {
        // Encontrar la tarjeta de imagen específica usando el nombre de archivo original
        const imageCard = previewArea.querySelector(`[data-original-filename="${CSS.escape(file.name)}"]`);
        if (!imageCard) {
            console.error(`Error: No se encontró la tarjeta de imagen para ${file.name}`);
            return null; // Retorna null si la tarjeta no se encuentra
        }

        const convertedNameElem = imageCard.querySelector('.converted-name');
        const downloadSingleBtn = imageCard.querySelector('.download-single-btn');

        convertedNameElem.textContent = 'Convertida: Convirtiendo...';
        downloadSingleBtn.style.display = 'none';

        try {
            const convertedBlob = await convertImage(file, outputFormat);
            // Almacenar el Blob convertido directamente en la tarjeta de imagen
            imageCard.convertedBlob = convertedBlob; 

            const newName = `${file.name.split('.')[0]}.${outputExtension}`;
            convertedNameElem.textContent = `Convertida: ${newName}`;
            downloadSingleBtn.style.display = 'inline-block';
            // Asignar el controlador de clic para descargar la imagen individual
            downloadSingleBtn.onclick = () => downloadSingleImage(imageCard.convertedBlob, newName);
            
            return { // Retornar los datos para el array convertedImages (para el ZIP)
                blob: convertedBlob,
                originalName: file.name,
                newName: newName
            };

        } catch (error) {
            console.error(`Error al convertir imagen ${file.name}:`, error); // Log de error más específico
            alert(`Error al convertir ${file.name}. Consulta la consola del navegador para más detalles.`); // Alerta temporal para depuración
            convertedNameElem.textContent = 'Convertida: Error';
            downloadSingleBtn.style.display = 'none';
            return null; // Retorna null en caso de error
        }
    });

    // Esperar a que todas las promesas de conversión se resuelvan
    const results = await Promise.all(conversionPromises);
    // Filtrar los resultados nulos (errores) y actualizar convertedImages
    convertedImages = results.filter(result => result !== null);

    // Mostrar el botón de descarga ZIP si hay imágenes convertidas
    if (convertedImages.length > 0) {
        downloadAllBtn.style.display = 'inline-block';
    }
});

async function convertImage(file, outputFormat) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                // Ajuste de calidad para JPEG y WebP
                // PNG no usa este parámetro de calidad, por lo que no lo afecta.
                const quality = 0.80; // Calidad del 80%

                canvas.toBlob(resolve, outputFormat, quality);
            };
            img.onerror = (e) => {
                console.error("Error al cargar la imagen en el canvas:", e);
                reject(new Error("Error al cargar la imagen para conversión."));
            };
            img.src = event.target.result;
        };
        reader.onerror = (e) => {
            console.error("Error al leer el archivo:", e);
            reject(new Error("Error al leer el archivo de imagen."));
        };
        reader.readAsDataURL(file);
    });
}

// --- Descargar Imagen Individual ---
function downloadSingleImage(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// --- Descargar Todo en ZIP ---
downloadAllBtn.addEventListener('click', async () => {
    if (convertedImages.length === 0) {
        alert('No hay imágenes convertidas para descargar.');
        return;
    }

    const zip = new JSZip();
    const folder = zip.folder("español"); // Crea una nueva carpeta llamada "español"

    convertedImages.forEach(img => {
        // Añade cada imagen a la carpeta "español"
        folder.file(img.newName, img.blob); 
    });

    try {
        const content = await zip.generateAsync({ type: "blob" });
        downloadSingleImage(content, "imagenes_convertidas.zip");
    } catch (error) {
        console.error("Error al generar el ZIP:", error);
        alert('Hubo un error al crear el archivo ZIP.');
    }
});

// --- Función para Limpiar Imágenes ---
clearBtn.addEventListener('click', () => {
    selectedFiles = [];
    convertedImages = [];
    fileElem.value = ''; // Limpiar el input de archivo para poder seleccionar los mismos archivos de nuevo
    displayPreviews(); // Actualizar la interfaz para mostrar el mensaje de "no hay imágenes"
});

// Inicializar la vista
displayPreviews();