// offscreen.js

let modelsLoaded = false;

// Load face-api.js models
async function loadModels() {
    if (modelsLoaded) return;
    try {
        // Use relative path for models
        const modelPath = './models';
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
            faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelPath)
        ]);
        modelsLoaded = true;
        console.log("Offscreen models loaded successfully.");
    } catch (error) {
        console.error("Failed to load models in offscreen document:", error);
        throw error;
    }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'offscreenProcess') {
        console.log("Received offscreen process request with", request.imageDataUrls.length, "images");
        
        // The data is now in request.imageDataUrls
        processImages(request.imageDataUrls)
            .then(croppedFaces => {
                console.log("Processing complete, found", croppedFaces.length, "faces");
                sendResponse(croppedFaces);
            })
            .catch(err => {
                console.error('Offscreen processing error:', err);
                sendResponse([]); // Send empty array on failure
            });
        return true; // Keep channel open for async response
    }
});

// The core face detection logic
async function processImages(imageDataUrls) {
    try {
        await loadModels();
        if (!modelsLoaded) {
            throw new Error("Models are not loaded, cannot process images.");
        }
        
        const faceDataUrls = [];

        for (let i = 0; i < imageDataUrls.length; i++) {
            const dataUrl = imageDataUrls[i];
            console.log(`Processing image ${i + 1}/${imageDataUrls.length}`);
            
            try {
                // Create an HTMLImageElement from the data URL.
                const image = await new Promise((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous'; // Handle CORS issues
                    img.onload = () => resolve(img);
                    img.onerror = (err) => reject(new Error('Could not load image from data URL. It might be corrupted.'));
                    img.src = dataUrl;
                });
                
                // Detect faces in the loaded image
                const detections = await faceapi.detectAllFaces(image, new faceapi.TinyFaceDetectorOptions());
                console.log(`Found ${detections.length} faces in image ${i + 1}`);
                
                if (detections.length > 0) {
                    // Extract the detected faces into separate canvases
                    const faceCanvases = await faceapi.extractFaces(image, detections);
                    
                    // Convert each face canvas to a Data URI
                    faceCanvases.forEach(canvas => {
                        faceDataUrls.push(canvas.toDataURL('image/jpeg', 0.8));
                    });
                }
            } catch (error) {
                console.error(`Could not process image ${i + 1}:`, error);
                // Continue with next image instead of failing completely
            }
        }
        
        console.log(`Total faces found: ${faceDataUrls.length}`);
        return faceDataUrls;
    } catch (error) {
        console.error("Error in processImages:", error);
        throw error;
    }
}
