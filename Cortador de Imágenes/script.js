document.addEventListener('DOMContentLoaded', () => {
    // Obtener referencias a los elementos del DOM
    const imageUpload = document.getElementById('imageUpload');
    const horizontalSlicesInput = document.getElementById('horizontalSlicesInput');
    const applyDivisionsBtn = document.getElementById('applyDivisionsBtn');
    const massDownloadZipBtn = document.getElementById('massDownloadZipBtn');
    const clearImagesBtn = document.getElementById('clearImagesBtn');
    const resultsContainer = document.getElementById('resultsContainer');
    const messageArea = document.getElementById('messageArea'); // Mensajes generales (abajo)
    const actionStatusMessage = document.getElementById('actionStatusMessage'); // Mensajes de acción (arriba)
    const globalLoadingOverlay = document.getElementById('globalLoadingOverlay');

    // Mapa para almacenar los canvases de las franjas de cada imagen, por su ID único
    const slicedCanvasesMap = new Map(); 

    /**
     * Muestra un mensaje en el área de mensajes general (abajo).
     * @param {string} message - El mensaje a mostrar.
     * @param {boolean} isError - Si el mensaje es un error (true) o informativo (false).
     */
    function showMessage(message, isError = false) {
        messageArea.textContent = message;
        messageArea.classList.remove('hidden', 'text-red-600', 'text-green-600');
        if (isError) {
            messageArea.classList.add('text-red-600');
        } else {
            messageArea.classList.add('text-green-600');
        }
        messageArea.classList.remove('hidden');
    }

    /**
     * Oculta el mensaje del área de mensajes general.
     */
    function hideMessage() {
        messageArea.classList.add('hidden');
        messageArea.textContent = '';
    }

    /**
     * Muestra un mensaje en el área de estado de acciones (arriba).
     * @param {string} message - El mensaje a mostrar.
     * @param {boolean} isError - Si el mensaje es un error (true) o informativo (false).
     */
    function showActionStatusMessage(message, isError = false) {
        actionStatusMessage.textContent = message;
        actionStatusMessage.classList.remove('hidden', 'text-red-600', 'text-green-600', 'text-gray-700');
        if (isError) {
            actionStatusMessage.classList.add('text-red-600');
        } else {
            actionStatusMessage.classList.add('text-green-600');
        }
        actionStatusMessage.classList.remove('hidden');
    }

    /**
     * Oculta el mensaje del área de estado de acciones.
     */
    function hideActionStatusMessage() {
        actionStatusMessage.classList.add('hidden');
        actionStatusMessage.textContent = '';
    }

    /**
     * Muestra u oculta un indicador de carga específico.
     * @param {HTMLElement} loadingElement - El elemento de carga a mostrar/ocultar.
     * @param {boolean} show - True para mostrar, false para ocultar.
     */
    function toggleLoading(loadingElement, show) {
        if (show) {
            loadingElement.classList.remove('hidden');
            if (loadingElement === globalLoadingOverlay) {
                globalLoadingOverlay.style.display = 'flex';
            }
        } else {
            loadingElement.classList.add('hidden');
            if (loadingElement === globalLoadingOverlay) {
                globalLoadingOverlay.style.display = ''; 
            }
        }
    }

    /**
     * Habilita o deshabilita un botón de descarga específico.
     * @param {boolean} enable - True para habilitar, false para deshabilitar.
     * @param {HTMLElement} downloadButton - El botón de descarga a habilitar/deshabilitar.
     */
    function toggleDownloadButton(enable, downloadButton) {
        downloadButton.disabled = !enable;
        if (enable) {
            downloadButton.classList.remove('btn-disabled');
        } else {
            downloadButton.classList.add('btn-disabled');
        }
    }

    /**
     * Habilita o deshabilita el botón de descarga masiva.
     * @param {boolean} enable - True para habilitar, false para deshabilitar.
     */
    function toggleMassDownloadButton(enable) {
        massDownloadZipBtn.disabled = !enable;
        if (enable) {
            massDownloadZipBtn.classList.remove('btn-disabled');
        } else {
            massDownloadZipBtn.classList.add('btn-disabled');
        }
    }

    /**
     * Carga la imagen seleccionada por el usuario.
     * @param {File} file - El objeto File de la imagen.
     * @returns {Promise<HTMLImageElement>} Una promesa que resuelve con el elemento de imagen.
     */
    function loadImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const reader = new FileReader();

            reader.onload = (e) => {
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error(`Error al cargar la imagen "${file.name}". Asegúrate de que es un formato de imagen válido.`));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error(`Error al leer el archivo "${file.name}".`));
            reader.readAsDataURL(file);
        });
    }

    /**
     * Divide la imagen en franjas horizontales y genera canvases para cada franja.
     * @param {HTMLImageElement} img - El elemento de imagen original.
     * @param {number} horizontalSlices - El número de franjas horizontales.
     * @returns {HTMLCanvasElement[]} Un array de elementos canvas, cada uno con una franja de la imagen.
     */
    function generateSlicedCanvases(img, horizontalSlices) {
        if (horizontalSlices < 1) {
            console.error('El número de divisiones horizontales debe ser al menos 1.');
            return [];
        }

        const naturalImgWidth = img.naturalWidth;
        const naturalImgHeight = img.naturalHeight;
        const pieceWidth = naturalImgWidth;
        const pieceHeight = naturalImgHeight / horizontalSlices;

        const canvases = [];

        for (let i = 0; i < horizontalSlices; i++) {
            const canvas = document.createElement('canvas');
            canvas.width = pieceWidth;
            canvas.height = pieceHeight;
            const ctx = canvas.getContext('2d');
            
            ctx.drawImage(
                img,
                0,                                      // Coordenada X de inicio en la imagen original
                i * (naturalImgHeight / horizontalSlices), // Coordenada Y de inicio en la imagen original
                naturalImgWidth,                        // Ancho del trozo a cortar de la imagen original
                (naturalImgHeight / horizontalSlices),  // Alto del trozo a cortar de la imagen original
                0,                                      // Coordenada X de destino en el canvas
                0,                                      // Coordenada Y de destino en el canvas
                pieceWidth,                             // Ancho del trozo en el canvas
                pieceHeight                             // Alto del trozo en el canvas
            );
            canvases.push(canvas);
        }
        return canvases;
    }

    /**
     * Procesa un archivo de imagen, lo carga, genera las franjas y actualiza la UI.
     * @param {File} file - El objeto File de la imagen.
     * @param {number} horizontalSlices - El número de divisiones horizontales.
     */
    async function processImageFile(file, horizontalSlices) {
        const fileId = file.name; // Usar el nombre del archivo como ID único

        // Crear una nueva sección para cada imagen
        const imageResultSection = document.createElement('div');
        imageResultSection.classList.add('image-result-section', 'relative'); 

        const imageThumbnail = document.createElement('img');
        imageThumbnail.alt = `Imagen ${file.name}`;
        imageThumbnail.classList.add('w-full', 'h-48', 'object-contain', 'mb-4'); 

        const originalFileName = document.createElement('p');
        originalFileName.classList.add('text-sm', 'text-gray-600', 'mb-1');
        originalFileName.textContent = `Original: ${file.name}`;
        imageResultSection.appendChild(originalFileName);

        const convertedStatus = document.createElement('p');
        convertedStatus.classList.add('text-sm', 'text-gray-600', 'mb-4');
        convertedStatus.textContent = `Convertida: Pendiente...`;
        imageResultSection.appendChild(convertedStatus);

        const downloadBtn = document.createElement('button');
        downloadBtn.classList.add('w-full', 'bg-green-600', 'text-white', 'py-2', 'px-4', 'rounded-md', 'hover:bg-green-700', 'transition', 'duration-300', 'ease-in-out', 'shadow-md', 'btn-disabled');
        downloadBtn.textContent = `Descargar (ZIP)`; 
        downloadBtn.disabled = true; 
        imageResultSection.appendChild(downloadBtn);

        const loadingOverlay = document.createElement('div');
        loadingOverlay.classList.add('loading-overlay', 'hidden');
        loadingOverlay.innerHTML = '<p class="text-lg text-blue-600 font-semibold">Procesando...</p>';
        imageResultSection.appendChild(loadingOverlay);

        resultsContainer.appendChild(imageResultSection);

        toggleLoading(loadingOverlay, true);
        try {
            const img = await loadImage(file);
            imageThumbnail.src = img.src; 
            imageResultSection.insertBefore(imageThumbnail, originalFileName); 

            const generatedCanvases = generateSlicedCanvases(img, horizontalSlices);
            slicedCanvasesMap.set(fileId, { 
                originalFileName: file.name, 
                originalImage: img, // Almacenar la imagen original
                canvases: generatedCanvases 
            });

            convertedStatus.textContent = `Convertida: Lista (${horizontalSlices})`; 
            toggleDownloadButton(true, downloadBtn);
            downloadBtn.addEventListener('click', () => downloadIndividualPuzzleAsZip(fileId, file.name.split('.')[0], loadingOverlay));

        } catch (error) {
            showMessage(error.message, true); // Usar el mensaje general para errores de carga
            imageResultSection.remove(); 
        } finally {
            toggleLoading(loadingOverlay, false);
        }
    }

    /**
     * Descarga las franjas de una imagen específica como un archivo ZIP.
     * @param {string} fileId - El ID único de la imagen (normalmente su nombre de archivo).
     * @param {string} fileNamePrefix - Prefijo para los nombres de archivo dentro del ZIP.
     * @param {HTMLElement} targetLoadingOverlay - El overlay de carga específico para esta descarga.
     */
    async function downloadIndividualPuzzleAsZip(fileId, fileNamePrefix, targetLoadingOverlay) {
        const imageData = slicedCanvasesMap.get(fileId);
        if (!imageData || imageData.canvases.length === 0) {
            showMessage(`No hay franjas generadas para "${fileNamePrefix}" para descargar.`, true);
            return;
        }

        toggleLoading(targetLoadingOverlay, true);
        hideMessage(); // Ocultar mensaje general

        const zip = new JSZip();
        let pieceCount = 0;

        imageData.canvases.forEach((canvas, index) => {
            try {
                const dataURL = canvas.toDataURL('image/png');
                if (dataURL === 'data:,') { 
                    console.warn(`Canvas para ${fileNamePrefix} pieza ${index + 1} no pudo generar Data URL. Podría ser un problema de CORS.`);
                    return; 
                }
                const base64Data = dataURL.split(',')[1];
                // CAMBIO AQUÍ: Nombres de archivo como "nombre_original-1.png", "nombre_original-2.png", etc.
                zip.file(`${fileNamePrefix}-${index + 1}.png`, base64Data, { base64: true });
                pieceCount++;
            } catch (error) {
                console.error(`Error al añadir la franja ${index + 1} al ZIP para ${fileNamePrefix}:`, error);
            }
        });

        if (pieceCount === 0) {
            showMessage(`No se pudieron procesar las franjas para la descarga de ${fileNamePrefix}.`, true);
            toggleLoading(targetLoadingOverlay, false);
            return;
        }

        try {
            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, `${fileNamePrefix}.zip`); 
        } catch (error) {
            showMessage(`Error al generar o descargar el archivo ZIP para ${fileNamePrefix}.`, true);
            console.error('Error al generar ZIP:', error);
        } finally {
            toggleLoading(targetLoadingOverlay, false);
        }
    }

    /**
     * Descarga todas las franjas de todas las imágenes cargadas como un único archivo ZIP.
     */
    async function downloadAllPuzzlesAsZip() {
        if (slicedCanvasesMap.size === 0) {
            showMessage('No hay imágenes procesadas para la descarga masiva.', true);
            return;
        }

        toggleLoading(globalLoadingOverlay, true); // Mostrar overlay de carga global
        hideMessage(); // Ocultar mensaje general
        hideActionStatusMessage(); // Ocultar mensaje de acción
        console.log('Iniciando descarga masiva ZIP...'); 

        // Envuelve la lógica de generación del ZIP en un setTimeout para permitir que el UI se actualice
        setTimeout(async () => {
            const zip = new JSZip();
            let totalPieceCount = 0;
            let hasErrorsAddingPieces = false; 
            let imageCounter = 1; 

            for (const [fileId, imageData] of slicedCanvasesMap.entries()) {
                for (let sliceIndex = 0; sliceIndex < imageData.canvases.length; sliceIndex++) {
                    const canvas = imageData.canvases[sliceIndex];
                    try {
                        const dataURL = canvas.toDataURL('image/png');
                        if (dataURL === 'data:,') { 
                            console.warn(`Canvas para ${imageData.originalFileName} pieza ${sliceIndex + 1} no pudo generar Data URL. Podría ser un problema de CORS.`);
                            hasErrorsAddingPieces = true;
                            continue; 
                        }
                        const base64Data = dataURL.split(',')[1];
                        zip.file(`${imageCounter}-${sliceIndex + 1}.png`, base64Data, { base64: true });
                        totalPieceCount++;
                    } catch (error) {
                        console.error(`Error al añadir la franja ${sliceIndex + 1} de ${imageData.originalFileName} al ZIP masivo:`, error);
                        hasErrorsAddingPieces = true;
                    }
                }
                imageCounter++; 
            }

            if (totalPieceCount === 0) {
                let errorMessage = 'No se pudieron procesar franjas para la descarga masiva.';
                if (hasErrorsAddingPieces) {
                    errorMessage += ' Asegúrate de que las imágenes se cargaron y procesaron correctamente. Revisa la consola para errores de CORS.';
                }
                showMessage(errorMessage, true);
                toggleLoading(globalLoadingOverlay, false); 
                console.log('Descarga masiva ZIP finalizada: No se procesaron piezas o hubo errores críticos.');
                return;
            }

            try {
                console.log(`Generando ZIP con ${totalPieceCount} piezas...`); 
                const content = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 9 } });
                console.log('ZIP generado. Iniciando descarga...'); 
                saveAs(content, "Descarga_Masiva.zip");
                showMessage(`Se han descargado ${totalPieceCount} franjas de ${slicedCanvasesMap.size} imágenes en "Descarga_Masiva.zip".`);
                console.log('Descarga masiva ZIP completada.'); 
            } catch (error) {
                showMessage('Error al generar o descargar el archivo ZIP masivo. Consulta la consola para más detalles. El archivo podría ser demasiado grande.', true);
                console.error('Error al generar ZIP masivo:', error);
            } finally {
                toggleLoading(globalLoadingOverlay, false); 
            }
        }, 0); // El setTimeout con 0ms de retardo
    }

    // Evento para cuando se selecciona un archivo de imagen
    imageUpload.addEventListener('change', async (event) => {
        const files = event.target.files;
        if (files.length === 0) {
            resultsContainer.innerHTML = ''; 
            showMessage('No se han seleccionado imágenes.', true);
            toggleMassDownloadButton(false); 
            return;
        }

        resultsContainer.innerHTML = ''; 
        hideMessage();
        hideActionStatusMessage(); 
        slicedCanvasesMap.clear(); 
        toggleMassDownloadButton(false); 

        const horizontalSlices = parseInt(horizontalSlicesInput.value, 10);
        if (isNaN(horizontalSlices) || horizontalSlices < 1) {
            showMessage('Por favor, introduce un número válido de divisiones horizontales (al menos 1).', true);
            return;
        }

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            await processImageFile(file, horizontalSlices); 
        }

        if (slicedCanvasesMap.size > 0) {
            toggleMassDownloadButton(true);
        } else {
            toggleMassDownloadButton(false);
        }
    });

    // Evento para el botón "Aplicar"
    applyDivisionsBtn.addEventListener('click', async () => {
        if (slicedCanvasesMap.size === 0) {
            showActionStatusMessage('Primero carga imágenes para aplicar divisiones.', true);
            return;
        }

        const horizontalSlices = parseInt(horizontalSlicesInput.value, 10);
        if (isNaN(horizontalSlices) || horizontalSlices < 1) {
            showActionStatusMessage('Por favor, introduce un número válido de divisiones horizontales (al menos 1).', true);
            return;
        }

        // Limpiar el contenedor de resultados y el mapa antes de reprocesar
        resultsContainer.innerHTML = '';
        const tempMap = new Map(slicedCanvasesMap); // Copiar el mapa para iterar
        slicedCanvasesMap.clear(); // Limpiar el original

        toggleMassDownloadButton(false); // Deshabilitar durante el reprocesamiento
        hideActionStatusMessage(); // Ocultar mensaje de acción antes de iniciar

        let processedCount = 0;
        for (const [fileId, imageData] of tempMap.entries()) {
            // Crear un objeto File temporal a partir de la imagen original para poder pasarlo a processImageFile
            // Esto es necesario porque processImageFile espera un objeto File, no un HTMLImageElement
            const originalBlob = await fetch(imageData.originalImage.src).then(r => r.blob());
            const tempFile = new File([originalBlob], imageData.originalFileName, { type: originalBlob.type });
            await processImageFile(tempFile, horizontalSlices);
            processedCount++;
        }

        if (slicedCanvasesMap.size > 0) {
            toggleMassDownloadButton(true);
        } else {
            toggleMassDownloadButton(false);
        }
        showActionStatusMessage(`Divisiones aplicadas a ${processedCount} imágenes.`, false);
    });


    // Evento para el botón "Limpiar Imágenes"
    clearImagesBtn.addEventListener('click', () => {
        resultsContainer.innerHTML = ''; // Eliminar todas las secciones de imagen
        slicedCanvasesMap.clear(); // Limpiar el mapa de imágenes procesadas
        imageUpload.value = ''; // Resetear el input de archivo
        toggleMassDownloadButton(false); // Deshabilitar el botón de descarga masiva
        hideMessage(); // Ocultar cualquier mensaje general
        showActionStatusMessage('Todas las imágenes han sido limpiadas.', false); // Mostrar mensaje en el área de acción
    });

    // Evento para el botón de descarga masiva
    massDownloadZipBtn.addEventListener('click', downloadAllPuzzlesAsZip);
});
