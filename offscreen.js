// offscreen.js - Simple Face Detection Version

let faceDetector = null;
let detectorReady = false;

// Initialize the simple face detector
async function initializeFaceDetector() {
    if (detectorReady) return true;
    
    try {
        console.log("Initializing simple face detector...");
        
        // Create new face detector instance
        faceDetector = new SimpleFaceDetector();
        await faceDetector.init();
        
        detectorReady = true;
        console.log("✅ Simple face detector initialized successfully!");
        return true;
        
    } catch (error) {
        console.error("❌ Failed to initialize face detector:", error);
        return false;
    }
}

// Test function to verify face detector works
async function testFaceDetector() {
    try {
        console.log("=== Testing Simple Face Detector ===");
        
        // Initialize detector
        const success = await initializeFaceDetector();
        if (!success) {
            throw new Error("Failed to initialize face detector");
        }
        
        console.log("✅ Face detector test passed!");
        return true;
        
    } catch (error) {
        console.error("❌ Face detector test failed:", error);
        return false;
    }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'offscreenProcess') {
        console.log("Received offscreen process request with", request.imageDataUrls.length, "images");
        
        // Set up timeout to prevent hanging
        const timeout = setTimeout(() => {
            console.error("Processing timeout - sending partial results");
            sendResponse([]);
        }, 30000); // 30 second timeout
        
        // Process images with progress updates
        processImagesWithProgress(request.imageDataUrls, (progress) => {
            // Send progress updates (optional - for future enhancement)
            console.log(`Processing progress: ${progress.completed}/${progress.total} images`);
        })
            .then(croppedFaces => {
                clearTimeout(timeout);
                console.log("Processing complete, found", croppedFaces.length, "faces");
                sendResponse(croppedFaces);
            })
            .catch(err => {
                clearTimeout(timeout);
                console.error('Offscreen processing error:', err);
                sendResponse([]); // Send empty array on failure
            });
        return true; // Keep channel open for async response
    } else if (request.action === 'testModels') {
        console.log("Received face detector test request");
        testFaceDetector()
            .then(success => {
                sendResponse({ success, detectorReady });
            })
            .catch(err => {
                console.error('Face detector test error:', err);
                sendResponse({ success: false, error: err.message });
            });
        return true;
    }
});

// Progressive image processing with updates
async function processImagesWithProgress(imageDataUrls, progressCallback) {
    try {
        console.log("Starting progressive image processing with", imageDataUrls.length, "images");
        
        // Initialize simple face detector
        const detectorReady = await initializeFaceDetector();
        if (!detectorReady) {
            throw new Error("Face detector is not ready, cannot process images.");
        }
        
        const faceDataUrls = [];
        const totalImages = imageDataUrls.length;

        for (let i = 0; i < totalImages; i++) {
            const dataUrl = imageDataUrls[i];
            console.log(`Processing image ${i + 1}/${totalImages}`);
            
            // Send progress update
            if (progressCallback) {
                progressCallback({ completed: i, total: totalImages });
            }
            
            try {
                // Create an HTMLImageElement from the data URL with size logging
                const image = await new Promise((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => {
                        const sizeMB = (dataUrl.length * 0.75 / 1024 / 1024).toFixed(2); // Rough size estimate
                        console.log(`Image ${i + 1} loaded: ${img.width}x${img.height} (~${sizeMB}MB)`);
                        resolve(img);
                    };
                    img.onerror = (err) => {
                        console.error(`Failed to load image ${i + 1}:`, err);
                        reject(new Error('Could not load image from data URL'));
                    };
                    img.src = dataUrl;
                });
                
                // Process with timeout for individual images
                const imageProcessingPromise = processSingleImage(image, i + 1);
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Image processing timeout')), 10000)
                );
                
                const result = await Promise.race([imageProcessingPromise, timeoutPromise]);
                faceDataUrls.push(...result);
                
            } catch (error) {
                console.error(`Could not process image ${i + 1}:`, error);
                // Include original image as fallback on error
                faceDataUrls.push(imageDataUrls[i]);
            }
        }
        
        // Final progress update
        if (progressCallback) {
            progressCallback({ completed: totalImages, total: totalImages });
        }
        
        console.log(`Progressive processing completed. Total faces found: ${faceDataUrls.length}`);
        return faceDataUrls;
        
    } catch (error) {
        console.error("Error in processImagesWithProgress:", error);
        throw error;
    }
}

// Process a single image (extracted for better error handling)
async function processSingleImage(image, imageNumber) {
    console.log(`Starting face detection for image ${imageNumber}...`);
    console.log(`Image dimensions: ${image.width}x${image.height}`);
    
    try {
        const faces = await faceDetector.detectFaces(image);
        console.log(`Found ${faces.length} potential faces in image ${imageNumber}`);
        
        // Log face details for debugging
        faces.forEach((face, index) => {
            console.log(`Face ${index + 1}: x=${face.x}, y=${face.y}, w=${face.width}, h=${face.height}, confidence=${face.confidence}`);
        });
        
        if (faces.length > 0) {
            console.log(`Cropping ${faces.length} faces from image ${imageNumber}...`);
            const croppedFaces = await faceDetector.cropFaces(image, faces);
            
            croppedFaces.forEach((faceDataUrl, faceIndex) => {
                const sizeKB = Math.round(faceDataUrl.length * 0.75 / 1024);
                console.log(`Cropped face ${faceIndex + 1} from image ${imageNumber} (${sizeKB}KB)`);
            });
            
            return croppedFaces;
        } else {
            console.log(`No faces detected in image ${imageNumber}, using fallback crop`);
            // Create a center crop as fallback
            const fallbackCrop = createFallbackCrop(image);
            return [fallbackCrop];
        }
    } catch (error) {
        console.error(`Error processing image ${imageNumber}:`, error);
        // Create fallback crop on error
        const fallbackCrop = createFallbackCrop(image);
        return [fallbackCrop];
    }
}

// Create a smart center crop when no faces are detected
function createFallbackCrop(image) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Create a larger crop that's more likely to include a full person/face
    const { width, height } = image;
    
    // Use a more generous crop size - 60% of the smaller dimension
    const cropRatio = 0.6;
    const baseCropSize = Math.min(width, height) * cropRatio;
    const minCropSize = 300; // Minimum 300px
    const cropSize = Math.max(baseCropSize, minCropSize);
    
    // Position the crop in the upper-center area (where faces usually are)
    let cropX, cropY;
    
    if (width > height) {
        // Landscape: center horizontally, upper third vertically
        cropX = (width - cropSize) / 2;
        cropY = Math.max(0, height * 0.15); // Start at 15% from top
    } else {
        // Portrait: center horizontally, upper quarter vertically  
        cropX = Math.max(0, (width - cropSize) / 2);
        cropY = Math.max(0, height * 0.1); // Start at 10% from top
    }
    
    // Ensure crop doesn't exceed image boundaries
    const finalCropSize = Math.min(cropSize, width - cropX, height - cropY);
    
    canvas.width = finalCropSize;
    canvas.height = finalCropSize;
    
    ctx.drawImage(image, cropX, cropY, finalCropSize, finalCropSize, 0, 0, finalCropSize, finalCropSize);
    
    console.log(`Created fallback crop: ${finalCropSize}x${finalCropSize} from position (${cropX}, ${cropY})`);
    return canvas.toDataURL('image/jpeg', 0.85);
}

// Legacy function for backward compatibility
async function processImages(imageDataUrls) {
    return processImagesWithProgress(imageDataUrls, null);
}
