// offscreen.js

let modelsLoaded = false;

// Function to load models
async function loadModels() {
    if (modelsLoaded) return;
    const modelPath = chrome.runtime.getURL('/models');
    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelPath)
    ]);
    modelsLoaded = true;
    console.log("Offscreen models loaded successfully.");
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'offscreenProcess') {
        processImages(request.imageUrls)
            .then(croppedFaces => sendResponse(croppedFaces))
            .catch(err => {
                console.error('Offscreen processing error:', err);
                sendResponse([]);
            });
        return true;
    }
});

// The core face detection logic with a robust image loading fix
async function processImages(imageDataUrls) {
    await loadModels();
    const faceDataUrls = [];

    for (const dataUrl of imageDataUrls) {
        try {
            // FIX: Manually create an HTMLImageElement from the data URL.
            // This is more reliable than faceapi.fetchImage in a sandboxed environment.
            const image = await new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = (err) => reject(new Error('Could not load image from data URL.'));
                img.src = dataUrl;
            });
            
            const detections = await faceapi.detectAllFaces(image, new faceapi.TinyFaceDetectorOptions());
            const faceCanvases = await faceapi.extractFaces(image, detections);
            
            faceCanvases.forEach(canvas => {
                faceDataUrls.push(canvas.toDataURL());
            });

        } catch (error) {
            console.error(`Could not process an image`, error);
        }
    }
    setTimeout(() => self.close(), 10000); // Self-close after 10 seconds
    return faceDataUrls;
}

