const Filtrado_canvas = document.getElementById('imagen_filtrada');
const Original_canvas = document.getElementById('imagen_original');
const contextImgOrg = Original_canvas.getContext('2d');
const contextImgFil = Filtrado_canvas.getContext('2d');
const filtro_select = document.getElementById('filtro');
let imageUploaded = new Image();
let uploaded_image = null;
// Configurar carga de imagen y dibujo en canvas
imageUploaded.onload = () => {
    Original_canvas.width = Filtrado_canvas.width = imageUploaded.width;
    Original_canvas.height = Filtrado_canvas.height = imageUploaded.height;
    contextImgOrg.filter = 'grayscale(1)';
    contextImgOrg.drawImage(imageUploaded, 0, 0);
};
// Escuchar cambios en el input de imagen
document.querySelector('#image_input').addEventListener('change', function () {
    const reader = new FileReader();
    reader.onload = () => {
        uploaded_image = reader.result;
        console.log(uploaded_image);
        imageUploaded.src = uploaded_image;
    };
    reader.readAsDataURL(this.files[0]);
});
// Función para descargar el canvas
const downloadCanvas = () => {
    const dataURL = Filtrado_canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
    const link = document.createElement('a');
    link.download = 'my-image.png';
    link.href = dataURL;
    link.click();
};
function convertTomatrix(pixels) {
    let matrix = Array(imageUploaded.height)
        .fill()
        .map(() => Array(imageUploaded.width));
    let i = 0,
        j = 0;
    for (let k = 0; k < pixels.length; k += 4) {
        matrix[i][j] = pixels[k];
        j++;
        if (j >= imageUploaded.width) {
            j = 0;
            i++;
        }
    }
    return matrix;
}
function convertToPixels(matrix, pixels) {
    let x = 0;   

    for (const arr of matrix) {
        for (const value of arr) {
            pixels[x] = value;
            pixels[x + 1] = value;
            pixels[x + 2] = value;
            x += 4;
        }
    }
}
function getValues(matrix, x, y, matrixSize, addO = true) {
    let values = [];
    let halfSize = Math.floor(matrixSize / 2);

    for (let i = -halfSize; i <= halfSize; i++) {
        for (let j = -halfSize; j <= halfSize; j++) {
            const currentX = x + j;
            const currentY = y + i;
            // Verifica si la posición está fuera de los límites de la matriz
            if (currentX < 0 || currentX >= matrix[0].length || currentY < 0 || currentY >= matrix.length) {
                if (addO) values.push(0);
            } else {
                values.push(matrix[currentY][currentX]);
            }
        }
    }
    return values;
}
function submit() {
    let imgData = contextImgOrg.getImageData(0, 0, imageUploaded.width, imageUploaded.height);
    let matrix = convertTomatrix(imgData.data);
    let pixels = imgData.data;
    // Definir las máscaras en un objeto para un acceso más fácil
    const mascaras = {
        mediana: { matriz: null, size: 3 }, // No necesita una matriz para mediana
        media: { matriz: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], divisor: 9 },
        laplaciano: { matriz: [[0, 1, 0], [1, -4, 1], [0, 1, 0]], divisor: null }, // No necesita divisor
        sobel: { matriz: [[1, 0, -1], [2, 0, -2], [1, 0, -1]], divisor: null } // No necesita divisor
    };
    // Mapeo de índices a funciones y máscaras
    const opciones = [
        { funcion: filtroMediana, args: [matrix, 3] },
        { funcion: filtroMedia, args: [matrix, mascaras.media.matriz, mascaras.media.divisor] },
        { funcion: filtroLaplaciano, args: [matrix, mascaras.laplaciano.matriz] },
        { funcion: filtroLaplaciano, args: [matrix, mascaras.sobel.matriz] }
    ];
    // Ejecutar la función seleccionada
    if (filtro_select.selectedIndex >= 0 && filtro_select.selectedIndex < opciones.length) {
        let resultado = opciones[filtro_select.selectedIndex].funcion(...opciones[filtro_select.selectedIndex].args);
        convertToPixels(resultado, pixels);
    }
    contextImgFil.putImageData(imgData, 0, 0);
}
//***********************FILTROS***********************
function filtroMediana(matrix, matrixSize) {
    return matrix.map((row, y) => row.map((_, x) => {
        let values = getValues(matrix, x, y, matrixSize, false).sort((a, b) => a - b);
        let midIndex = Math.floor(values.length / 2);
        return values.length % 2 === 0 ? 
            Math.round((values[midIndex - 1] + values[midIndex]) / 2) : 
            values[midIndex];
    }));
}
function filtroMedia(matrix, mascara, divisor) {
    return matrix.map((row, y) => row.map((_, x) => {
        let values = getValues(matrix, x, y, mascara.length);
        let suma = values.reduce((acc, value, idx) => acc + value * mascara[Math.floor(idx / 3)][idx % 3], 0);
        return Math.round(suma / divisor);
    }));
}
function filtroLaplaciano(matrix, mascara) {
    let mayor = Number.MIN_SAFE_INTEGER;
    let menor = Number.MAX_SAFE_INTEGER;
    let matrixCopia = matrix.map((row, y) => row.map((_, x) => {
        let values = getValues(matrix, x, y, mascara.length);
        let laplacian = values.reduce((acc, value, idx) => acc + value * mascara[Math.floor(idx / 3)][idx % 3], 0);
        mayor = Math.max(mayor, laplacian);
        menor = Math.min(menor, laplacian);
        return laplacian;
    }));

    reescalarHistograma(matrixCopia, menor, mayor);
    return matrixCopia;
}
function reescalarHistograma(matrix, menor, mayor) {
    const m = 255 / (mayor - menor);
    const b = -m * menor;
    matrix.forEach(row => row.forEach((_, idx, arr) => {
        arr[idx] = Math.round(m * arr[idx] + b);
    }));
}