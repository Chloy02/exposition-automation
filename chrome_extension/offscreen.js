// offscreen.js

let modelsLoaded = false;

// Load face-api.js models
async function loadModels() {
    if (modelsLoaded) return;
    const modelPath = chrome.runtime.getURL('/models');
    try {
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
            faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelPath)
        ]);
        modelsLoaded = true;
        console.log("Offscreen models loaded successfully.");
    } catch (error) {
        console.error("Failed to load models in offscreen document.", error);
    }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'offscreenProcess') {
        // The data is now in request.imageDataUrls
        processImages(request.imageDataUrls)
            .then(croppedFaces => sendResponse(croppedFaces))
            .catch(err => {
                console.error('Offscreen processing error:', err);
                sendResponse([]); // Send empty array on failure
            });
        return true; // Keep channel open for async response
    }
});

// The core face detection logic
async function processImages(imageDataUrls) {
    await loadModels();
    if (!modelsLoaded) {
        throw new Error("Models are not loaded, cannot process images.");
    }
    const faceDataUrls = [];

    for (const dataUrl of imageDataUrls) {
        try {
            // Create an HTMLImageElement from the data URL.
            const image = await new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = (err) => reject(new Error('Could not load image from data URL. It might be corrupted.'));
                img.src = dataUrl;
            });
            
            // Detect faces in the loaded image
            const detections = await faceapi.detectAllFaces(image, new faceapi.TinyFaceDetectorOptions());
            if (detections.length > 0) {
                // Extract the detected faces into separate canvases
                const faceCanvases = await faceapi.extractFaces(image, detections);
                
                // Convert each face canvas to a Data URI
                faceCanvases.forEach(canvas => {
                    faceDataUrls.push(canvas.toDataURL('image/jpeg'));
                });
            }
        } catch (error) {
            console.error(`Could not process an image:`, error);
        }
    }
    return faceDataUrls;
}
