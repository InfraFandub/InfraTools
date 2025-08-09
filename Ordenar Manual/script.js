// Array to store image data: { file: File, name: string, url: string }
let images = [];
let currentIndex = -1;
let filteredImages = []; // Images currently displayed based on search
let currentFilter = '';
let currentSort = 'number-asc'; // Always sort by number ascending automatically

// DOM Elements
const fileInput = document.getElementById('fileInput');
const loadImagesButton = document.getElementById('loadImagesButton');
const searchInput = document.getElementById('search');
const prevButton = document.getElementById('prevButton');
const nextButton = document.getElementById('nextButton');
const newNameInput = document.getElementById('newName');
const renameButton = document.getElementById('renameButton');
const downloadButton = document.getElementById('downloadButton');
const imageCounterSpan = document.getElementById('imageCounter');
const currentFileNameSpan = document.getElementById('currentFileName');
const currentImageElement = document.getElementById('currentImage');
const thumbnailContainer = document.getElementById('thumbnailContainer');
const messageBox = document.getElementById('messageBox');
const messageText = document.getElementById('messageText');
const overlay = document.getElementById('overlay');

/**
 * Displays a custom message box.
 * @param {string} message - The message to display.
 */
function showMessageBox(message) {
    messageText.textContent = message;
    messageBox.classList.add('show');
    overlay.classList.add('show');
}

/**
 * Hides the custom message box.
 */
function hideMessageBox() {
    messageBox.classList.remove('show');
    overlay.classList.remove('show');
}

/**
 * Updates the UI elements based on the current image and application state.
 */
function updateUI() {
    const totalImages = filteredImages.length;
    imageCounterSpan.textContent = `${totalImages > 0 ? currentIndex + 1 : 0}/${totalImages}`;

    if (totalImages === 0) {
        currentImageElement.src = '';
        currentImageElement.alt = '';
		currentImageElement.style.display = 'none';
        currentFileNameSpan.textContent = 'Ninguna imagen cargada';
        prevButton.disabled = true;
        nextButton.disabled = true;
        newNameInput.disabled = true;
        renameButton.disabled = true;
        downloadButton.disabled = true;
    } else {
        const currentImageData = filteredImages[currentIndex];
        currentImageElement.src = currentImageData.url;
        currentImageElement.alt = currentImageData.name;
		currentImageElement.style.display = 'block';
        currentFileNameSpan.textContent = currentImageData.name;
        newNameInput.value = currentImageData.name.split('.').slice(0, -1).join('.'); // Pre-fill with name without extension
        newNameInput.disabled = false;
        renameButton.disabled = false;
        downloadButton.disabled = false;

        prevButton.disabled = currentIndex === 0;
        nextButton.disabled = currentIndex === totalImages - 1;
    }
    renderThumbnails();
}

/**
 * Renders the thumbnails in the thumbnail container.
 */
function renderThumbnails() {
    thumbnailContainer.innerHTML = ''; // Clear existing thumbnails
    filteredImages.forEach((imgData, index) => {
        const thumbDiv = document.createElement('div');
        thumbDiv.classList.add('thumbnail-item', 'relative', 'rounded-lg', 'overflow-hidden', 'shadow-sm');
        if (index === currentIndex) {
            thumbDiv.classList.add('selected');
        }
        thumbDiv.onclick = () => {
            currentIndex = index;
            updateUI();
        };

        const img = document.createElement('img');
        img.src = imgData.url;
        img.alt = imgData.name;
        img.classList.add('w-full', 'h-full', 'object-cover'); // Tailwind classes for image in thumbnail

        const nameOverlay = document.createElement('div');
        nameOverlay.classList.add('absolute', 'bottom-0', 'left-0', 'right-0', 'bg-black', 'bg-opacity-50', 'text-white', 'text-xs', 'p-1', 'truncate');
        nameOverlay.textContent = imgData.name;

        thumbDiv.appendChild(img);
        thumbDiv.appendChild(nameOverlay);
        thumbnailContainer.appendChild(thumbDiv);

        // Scroll to selected thumbnail
        if (index === currentIndex) {
            thumbDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    });
}

/**
 * Simplified numeric sort function for objects with a 'name' property.
 * Extracts the first sequence of digits from the filename for comparison.
 * @param {object} a - First image object.
 * @param {object} b - Second image object.
 * @returns {number} - Comparison result.
 */
function simplifiedNumericSort(a, b) {
    // Extract the first number found in the filename
    const numA = parseInt(a.name.match(/\d+/)?.[0] || '0', 10);
    const numB = parseInt(b.name.match(/\d+/)?.[0] || '0', 10);
    return numA - numB;
}

/**
 * Sorts the images based on the current sort option.
 * This function should be called on the `images` array.
 */
function sortImages() {
    console.log("Sorting images. Current sort option:", currentSort);
    console.log("Images before sort:", images.map(img => img.name));

    // Since currentSort is always 'number-asc', we directly apply this sort.
    images.sort(simplifiedNumericSort);

    console.log("Images after sort:", images.map(img => img.name));
}

/**
 * Applies the current search filter and sort order to the images.
 */
function applyFilterAndSort() {
    // Store the currently selected image object before re-filtering/sorting
    const previouslySelectedImageObject = currentIndex !== -1 && filteredImages.length > 0
        ? filteredImages[currentIndex]
        : null;

    // Sort the main 'images' array first
    sortImages();

    // Apply filter to the now sorted 'images' array
    if (currentFilter) {
        filteredImages = images.filter(img =>
            img.name.toLowerCase().includes(currentFilter.toLowerCase())
        );
    } else {
        filteredImages = [...images]; // Copy all images if no filter
    }

    // Find the new index of the previously selected image
    if (previouslySelectedImageObject) {
        const newIndex = filteredImages.findIndex(img => img.url === previouslySelectedImageObject.url);
        if (newIndex !== -1) {
            currentIndex = newIndex;
        } else {
            // If the previously selected image is no longer in the filtered list (e.g., due to a new filter)
            currentIndex = filteredImages.length > 0 ? 0 : -1; // Select first or none
        }
    } else {
        // No image was selected, or no images were loaded initially
        currentIndex = filteredImages.length > 0 ? 0 : -1; // Select first or none
    }

    updateUI();
}

// --- Event Listeners ---

// Load Images Button Click
loadImagesButton.addEventListener('click', () => {
    fileInput.click(); // Trigger the hidden file input click
});

// File Input Change (when files are selected)
fileInput.addEventListener('change', (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    images = []; // Clear previous images
    currentIndex = -1; // Reset index
    currentFilter = ''; // Clear any active filter
    searchInput.value = ''; // Clear search input

    files.forEach(file => {
        const url = URL.createObjectURL(file);
        images.push({
            file: file,
            name: file.name,
            url: url
        });
    });

    applyFilterAndSort(); // Apply initial filter and sort
    if (images.length > 0) {
        currentIndex = 0; // Select the first image
    }
    updateUI();
    showMessageBox(`Se cargaron ${images.length} imágenes.`);
});

// Search Input
searchInput.addEventListener('input', (event) => {
    currentFilter = event.target.value.trim();
    applyFilterAndSort();
});

// Previous Button
prevButton.addEventListener('click', () => {
    if (currentIndex > 0) {
        currentIndex--;
        updateUI();
    }
});

// Next Button
nextButton.addEventListener('click', () => {
    if (currentIndex < filteredImages.length - 1) {
        currentIndex++;
        updateUI();
    }
});

// Rename Button
renameButton.addEventListener('click', () => {
    if (currentIndex === -1 || filteredImages.length === 0) {
        showMessageBox('No hay imagen seleccionada para renombrar.');
        return;
    }

    const newName = newNameInput.value.trim();
    if (!newName) {
        showMessageBox('Por favor, introduce un nuevo nombre.');
        return;
    }

    // Store the currently selected image object before its name is updated and sorting happens
    const previouslySelectedImage = filteredImages[currentIndex];
    const originalFileExtension = previouslySelectedImage.name.split('.').pop();
    const fullNewName = `${newName}.${originalFileExtension}`;

    // Find the original image object in the main 'images' array and update its name
    const originalImageInMainArray = images.find(img => img.url === previouslySelectedImage.url);
    if (originalImageInMainArray) {
        originalImageInMainArray.name = fullNewName;
    }

    console.log("Renaming image. Current sort option before re-sort:", currentSort); // Log before re-sort
    applyFilterAndSort(); // Re-apply filter and sort to ensure renamed image is in correct place

    // After re-applying filter and sort, find the new index of the previously selected (now renamed) image
    const newCurrentIndex = filteredImages.findIndex(img => img.url === previouslySelectedImage.url);
    if (newCurrentIndex !== -1) {
        currentIndex = newCurrentIndex;
    } else {
        // This case should ideally not happen if the image is still in the filtered list
        // but if it does, it means the renamed image was filtered out or something went wrong.
        // Default to the first image if the renamed one isn't found in the new filtered list.
        currentIndex = filteredImages.length > 0 ? 0 : -1;
    }

    updateUI();
    // showMessageBox(`Imagen renombrada a "${fullNewName}".`);  // <-- This line has been removed
});

// Download All Button
downloadButton.addEventListener('click', async () => {
    if (images.length === 0) {
        showMessageBox('No hay imágenes para descargar.');
        return;
    }

    const zip = new JSZip();
    const downloadPromises = [];

    downloadButton.textContent = 'Preparando descarga...';
    downloadButton.disabled = true;

    for (const imgData of images) {
        downloadPromises.push(
            fetch(imgData.url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status} for ${imgData.url}`);
                    }
                    return response.blob();
                })
                .then(blob => {
                    zip.file(imgData.name, blob); // Use the (potentially renamed) image name
                })
                .catch(e => {
                    console.error(`Failed to add ${imgData.name} to zip:`, e);
                    // Log error but continue with other images
                })
        );
    }

    await Promise.allSettled(downloadPromises);

    if (Object.keys(zip.files).length === 0) {
        showMessageBox('No se pudieron añadir imágenes válidas al archivo ZIP.');
        downloadButton.textContent = 'Descargar Todas';
        downloadButton.disabled = false;
        return;
    }

    zip.generateAsync({ type: "blob" })
        .then(function (content) {
            saveAs(content, "imagenes_organizadas.zip");
            downloadButton.textContent = 'Descargar Todas';
            downloadButton.disabled = false;
            showMessageBox('Descarga completada.');
        })
        .catch(e => {
            console.error('Error generating ZIP:', e);
            showMessageBox('Ocurrió un error al generar el archivo ZIP.');
            downloadButton.textContent = 'Descargar Todas';
            downloadButton.disabled = false;
        });
});

// Initial UI update on page load
document.addEventListener('DOMContentLoaded', updateUI);