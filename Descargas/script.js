const scriptInyectable = `// Script inyectable: convierte tu herramienta en una interfaz flotante para cualquier página
(async function() {
  // Evitar inyecciones dobles
  if (document.getElementById('ordenador-imagenes')) return;
  // Cargar JSZip y FileSaver
  const zipLib = document.createElement('script');
  zipLib.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
  document.head.appendChild(zipLib);
  const saverLib = document.createElement('script');
  saverLib.src = 'https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js';
  document.head.appendChild(saverLib);
  await new Promise(resolve => zipLib.onload = resolve);
  await new Promise(resolve => saverLib.onload = resolve);
  // Estilos
  const style = document.createElement('style');
  style.textContent = \`
    #ordenador-imagenes {
      position: fixed;
      top: 50px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      background: white;
      padding: 15px;
      border-radius: 8px;
      box-shadow: 0 0 10px rgba(0,0,0,0.3);
      max-height: 80vh;
      overflow-y: auto;
      width: 90%;
      max-width: 1000px;
      font-family: sans-serif;
    }
    #ordenador-imagenes h3 {
      margin-top: 0;
    }
    #ordenador-imagenes .image-item {
      display: inline-block;
      width: 150px;
      margin: 10px;
      vertical-align: top;
    }
    #ordenador-imagenes .image-item img {
      max-width: 100%;
      border: 2px solid #333;
      border-radius: 4px;
    }
    #ordenador-imagenes input {
      width: 100%;
      margin-top: 5px;
    }
    #ordenador-imagenes .acciones {
      margin-top: 15px;
      text-align: center;
    }
    #ordenador-imagenes button {
      padding: 10px 20px;
      margin: 5px;
      font-size: 14px;
    }
  \`;
  document.head.appendChild(style);
  // Contenedor principal
  const contenedor = document.createElement('div');
  contenedor.id = 'ordenador-imagenes';
  contenedor.innerHTML = \`
    <h3>📦 Imágenes detectadas en esta página</h3>
    <div id="contenedor-imagenes"></div>
    <div class="acciones">
      <button id="boton-descarga">Descargar ZIP</button>
      <button onclick="document.getElementById('ordenador-imagenes').remove()">Cerrar</button>
    </div>
  \`;
  document.body.appendChild(contenedor);
  // Extraer imágenes del DOM
  const imgs = [...document.querySelectorAll('img, [data-src], [data-original]')];
  const contenedorImgs = contenedor.querySelector('#contenedor-imagenes');
  imgs.forEach((imgEl, index) => {
    const src = imgEl.src || imgEl.getAttribute('data-src') || imgEl.getAttribute('data-original');
    if (!src) return;
    const div = document.createElement('div');
    div.className = 'image-item';
    div.innerHTML = \`
      <img src="\${src}" data-original-name="\${src.split('/').pop().split('?')[0]}">
      <input type="text" value="\${String(index + 1).padStart(2, '0')}.jpg" />
    \`;
    contenedorImgs.appendChild(div);
  });
  // Descargar ZIP
  document.getElementById('boton-descarga').onclick = async () => {
    const zip = new JSZip();
    const items = contenedor.querySelectorAll('.image-item');
    for (const item of items) {
      const img = item.querySelector('img');
      const input = item.querySelector('input');
      try {
        const resp = await fetch(img.src);
        const blob = await resp.blob();
        zip.file(input.value, blob);
      } catch (e) {
        console.error('No se pudo descargar', img.src);
      }
    }
    const content = await zip.generateAsync({type: 'blob'});
    saveAs(content, 'imagenes.zip');
  };
})();`;

function copiarScript() {
    navigator.clipboard.writeText(scriptInyectable).then(() => {
        const button = document.getElementById('copyButton');
        const message = document.getElementById('copyMessage');
        
        button.textContent = '✅ ¡Copiado!';
        button.classList.add('copied');
        message.style.display = 'inline';
        
        setTimeout(() => {
            button.textContent = '📋 Copiar Script';
            button.classList.remove('copied');
            message.style.display = 'none';
        }, 2000);
    }).catch(err => {
        console.error('Error al copiar:', err);
        alert('Error al copiar al portapapeles. Intenta seleccionar y copiar manualmente.');
    });
}

async function descargarZip() {
    const zip = new JSZip();
    const imageItems = document.querySelectorAll('.image-item');
    
    // Mostrar mensaje de carga
    const loading = document.getElementById('loading');
    loading.style.display = 'block';
    loading.textContent = 'Preparando archivo ZIP...';

    try {
        for (const item of imageItems) {
            const img = item.querySelector('img');
            const input = item.querySelector('input');
            const fileName = input.value || img.getAttribute('data-original-name');
            
            // Obtener la imagen como blob
            const response = await fetch(img.src);
            const blob = await response.blob();
            
            // Añadir al ZIP
            zip.file(fileName, blob);
        }

        // Generar y descargar el ZIP
        const content = await zip.generateAsync({type: 'blob'});
        saveAs(content, 'imagenes_capitulo.zip');
        
        loading.style.display = 'none';
    } catch (error) {
        console.error('Error al crear ZIP:', error);
        loading.textContent = 'Error al crear el archivo ZIP';
        setTimeout(() => {
            loading.style.display = 'none';
        }, 3000);
    }
}

function procesarHTML() {
    const htmlInput = document.getElementById('htmlInput');
    const error = document.getElementById('error');
    const loading = document.getElementById('loading');
    const imageContainer = document.querySelector('.image-container');
    const downloadZipButton = document.getElementById('downloadZip');

    // Resetear estado
    error.style.display = 'none';
    loading.style.display = 'block';

    // Limpiar contenedor de imágenes y ocultar botón de descarga
    imageContainer.innerHTML = '';
    downloadZipButton.style.display = 'none';

    try {
        const html = htmlInput.value.trim();
        if (!html) {
            throw new Error('Por favor, pega el código HTML');
        }

        // Limpiar contenedor de imágenes
        imageContainer.innerHTML = '';
        
        // Crear un parser DOM
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Buscar todas las imágenes
        const images = doc.querySelectorAll('.chapter-img-box img, img[class*="chapter-img"]');
        
        if (images.length === 0) {
            throw new Error('No se encontraron imágenes del capítulo en el código HTML pegado');
        }

        // Procesar cada imagen encontrada
        images.forEach((imgElement, index) => {
            const imageUrl = imgElement.src || imgElement.getAttribute('src');
            if (!imageUrl) return;

            // Crear contenedor para la imagen
            const imageItem = document.createElement('div');
            imageItem.className = 'image-item';

            // Crear la imagen
            const img = document.createElement('img');
            img.src = imageUrl;
            const originalName = imageUrl.split('/').pop();
            img.setAttribute('data-original-name', originalName);

            // Crear input para el nombre
            const input = document.createElement('input');
            input.type = 'text';
            input.value = `${index + 1}.jpg`;
            input.placeholder = 'Nombre del archivo';

            // Añadir elementos al contenedor
            imageItem.appendChild(img);
            imageItem.appendChild(input);
            imageContainer.appendChild(imageItem);
        });

        // Mostrar botón de descarga ZIP
        downloadZipButton.style.display = 'block';
        loading.style.display = 'none';

    } catch (err) {
        console.error('Error:', err);
        error.textContent = err.message;
        error.style.display = 'block';
        loading.style.display = 'none';
    }
}