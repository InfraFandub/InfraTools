let imageFiles = [];

document.getElementById('imageInput').addEventListener('change', handleImageUpload);

function handleImageUpload(event) {
    const files = event.target.files;
    if (!files.length) return;

    // Filtrar solo archivos de imagen
    const newImageFiles = [];
    for (let file of files) {
        if (!file.type.startsWith('image/')) continue;
        newImageFiles.push(file);
    }

    // Ordenar por nombre (tratando números de forma natural)
    newImageFiles.sort((a, b) => {
        // Función para extraer número del nombre
        const getNumber = (filename) => {
            const match = filename.match(/(\d+)/);
            return match ? parseInt(match[1], 10) : 0;
        };

        const aNum = getNumber(a.name);
        const bNum = getNumber(b.name);
        
        // Comparar numéricamente
        if (aNum !== bNum) {
            return aNum - bNum;
        }
        
        // Si tienen el mismo número, comparar alfabéticamente
        return a.name.localeCompare(b.name, undefined, { numeric: true });
    });

    // Agregar al array principal
    imageFiles.push(...newImageFiles);
    renderImageList();
}

function renderImageList() {
    const imageListContainer = document.getElementById('imageList');
    imageListContainer.innerHTML = '';
    
    imageFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imageItem = createImageItem(e.target.result, index);
            imageListContainer.appendChild(imageItem);
        };
        reader.readAsDataURL(file);
    });
}

function createImageItem(imageUrl, index) {
    const div = document.createElement('div');
    div.className = 'image-item';
    div.draggable = true;
    div.dataset.index = index;

    const img = document.createElement('img');
    img.src = imageUrl;
    div.appendChild(img);

    div.addEventListener('dragstart', handleDragStart);
    div.addEventListener('dragover', handleDragOver);
    div.addEventListener('drop', handleDrop);
    div.addEventListener('dragenter', handleDragEnter);
    div.addEventListener('dragleave', handleDragLeave);
    div.addEventListener('dragend', handleDragEnd);

    return div;
}

let draggedIndex = null;

function handleDragStart(e) {
    draggedIndex = e.target.closest('.image-item').dataset.index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedIndex);
    setTimeout(() => {
        e.target.closest('.image-item').classList.add('dragging');
    }, 0);
}

function handleDragOver(e) {
    e.preventDefault();
}

function handleDragEnter(e) {
    e.preventDefault();
    const dropTarget = e.target.closest('.image-item');
    if (dropTarget && dropTarget.dataset.index !== draggedIndex) {
        dropTarget.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    e.target.closest('.image-item')?.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    const dropTarget = e.target.closest('.image-item');
    if (dropTarget) {
        const dropIndex = dropTarget.dataset.index;
        
        // Reordenar el array de archivos
        const [movedItem] = imageFiles.splice(draggedIndex, 1);
        imageFiles.splice(dropIndex, 0, movedItem);

        // Volver a renderizar la lista
        renderImageList();
    }
    
    document.querySelectorAll('.image-item').forEach(item => {
        item.classList.remove('dragging', 'drag-over');
    });
    draggedIndex = null;
}

function handleDragEnd(e) {
    document.querySelectorAll('.image-item').forEach(item => {
        item.classList.remove('dragging', 'drag-over');
    });
    draggedIndex = null;
}

async function fusionarImagenes() {
    if (imageFiles.length === 0) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    let totalHeight = 0;
    let maxWidth = 0;
    
    const images = [];
    for (const file of imageFiles) {
        const image = new Image();
        image.src = URL.createObjectURL(file);
        await new Promise(resolve => {
            image.onload = resolve;
        });
        images.push(image);
        totalHeight += image.height;
        maxWidth = Math.max(maxWidth, image.width);
    }

    canvas.width = maxWidth;
    canvas.height = totalHeight;
    
    let y = 0;
    for (let img of images) {
        ctx.drawImage(img, 0, y);
        y += img.height;
    }

    const resultContainer = document.getElementById('fusionResult');
    resultContainer.innerHTML = '';
    const resultImage = document.createElement('img');
    resultImage.src = canvas.toDataURL('image/jpeg');
    resultContainer.appendChild(resultImage);
    
    document.getElementById('descargarBtn').style.display = 'block';
}

function descargarImagen() {
    const resultImage = document.querySelector('#fusionResult img');
    if (!resultImage) return;

    const link = document.createElement('a');
    link.download = 'imagen_fusionada.jpg';
    link.href = resultImage.src;
    link.click();
}

function limpiar() {
    document.getElementById('imageList').innerHTML = '';
    document.getElementById('fusionResult').innerHTML = '';
    document.getElementById('descargarBtn').style.display = 'none';
    document.getElementById('imageInput').value = '';
    imageFiles = [];
}

function seleccionarArchivos() {
    document.getElementById('imageInput').click();
}