// offscreen.js - Face Detection using tracking.js (Haar Cascade/Viola-Jones)

let faceDetector = null;
let detectorReady = false;

// Initialize the tracking.js face detector
async function initializeFaceDetector() {
  if (detectorReady) return true;

  try {
    console.log("Initializing tracking.js face detector...");

    // Create new face detector instance
    faceDetector = new TrackingFaceDetector();
    await faceDetector.init();

    detectorReady = true;
    console.log("✅ Tracking.js face detector initialized successfully!");
    return true;
  } catch (error) {
    console.error("❌ Failed to initialize face detector:", error);
    return false;
  }
}

// Test function to verify face detector works
async function testFaceDetector() {
  try {
    console.log("=== Testing Tracking.js Face Detector ===");

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
  if (request.action === "offscreenProcess") {
    console.log(
      "Received offscreen process request with",
      request.imageDataUrls.length,
      "images",
    );

    // Set up timeout to prevent hanging
    const timeout = setTimeout(() => {
      console.error("Processing timeout - sending partial results");
      sendResponse([]);
    }, 60000); // 60 second timeout (increased for large images)

    // Process images with progress updates
    processImagesWithProgress(request.imageDataUrls, (progress) => {
      console.log(
        `Processing progress: ${progress.completed}/${progress.total} images`,
      );
    })
      .then((croppedFaces) => {
        clearTimeout(timeout);
        console.log("Processing complete, found", croppedFaces.length, "faces");
        sendResponse(croppedFaces);
      })
      .catch((err) => {
        clearTimeout(timeout);
        console.error("Offscreen processing error:", err);
        sendResponse([]); // Send empty array on failure
      });
    return true; // Keep channel open for async response
  } else if (request.action === "testModels") {
    console.log("Received face detector test request");
    testFaceDetector()
      .then((success) => {
        sendResponse({ success, detectorReady });
      })
      .catch((err) => {
        console.error("Face detector test error:", err);
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }
});

// Progressive image processing with updates
async function processImagesWithProgress(imageDataUrls, progressCallback) {
  try {
    console.log(
      "Starting progressive image processing with",
      imageDataUrls.length,
      "images",
    );

    // Initialize tracking.js face detector
    const detectorReady = await initializeFaceDetector();
    if (!detectorReady) {
      throw new Error("Face detector is not ready, cannot process images.");
    }

    const faceDataUrls = [];
    const totalImages = imageDataUrls.length;

    for (let i = 0; i < totalImages; i++) {
      const dataUrl = imageDataUrls[i];
      console.log(`\n=== Processing image ${i + 1}/${totalImages} ===`);

      // Send progress update
      if (progressCallback) {
        progressCallback({ completed: i, total: totalImages });
      }

      try {
        // Create an HTMLImageElement from the data URL
        const image = await new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            const sizeMB = ((dataUrl.length * 0.75) / 1024 / 1024).toFixed(2);
            console.log(
              `Image ${i + 1} loaded: ${img.width}x${img.height} (~${sizeMB}MB)`,
            );
            resolve(img);
          };
          img.onerror = (err) => {
            console.error(`Failed to load image ${i + 1}:`, err);
            reject(new Error("Could not load image from data URL"));
          };
          img.src = dataUrl;
        });

        // Process with timeout for individual images
        const imageProcessingPromise = processSingleImage(image, i + 1);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Image processing timeout")),
            30000,
          ),
        );

        const result = await Promise.race([
          imageProcessingPromise,
          timeoutPromise,
        ]);

        if (result && result.length > 0) {
          faceDataUrls.push(...result);
          console.log(`✅ Image ${i + 1}: Found ${result.length} face(s)`);
        } else {
          console.log(`⚠️ Image ${i + 1}: No faces detected`);
          // Ask user what to do when no faces are detected
          // For now, we'll skip the image (don't add fallback)
        }
      } catch (error) {
        console.error(`❌ Could not process image ${i + 1}:`, error);
        // Don't add fallback on error - user wanted notification when no faces found
      }
    }

    // Final progress update
    if (progressCallback) {
      progressCallback({ completed: totalImages, total: totalImages });
    }

    console.log(`\n=== Processing Complete ===`);
    console.log(`Total images processed: ${totalImages}`);
    console.log(`Total faces found: ${faceDataUrls.length}`);

    // If no faces found in any image, notify user
    if (faceDataUrls.length === 0) {
      console.warn("⚠️ NO FACES DETECTED in any of the images!");
      console.warn("User should be notified that no faces were found.");
    }

    return faceDataUrls;
  } catch (error) {
    console.error("Error in processImagesWithProgress:", error);
    throw error;
  }
}

// Process a single image
async function processSingleImage(image, imageNumber) {
  console.log(`Starting face detection for image ${imageNumber}...`);
  console.log(`Image dimensions: ${image.width}x${image.height}`);

  try {
    // Detect faces using tracking.js
    const faces = await faceDetector.detectFaces(image);

    if (faces.length > 0) {
      console.log(`Found ${faces.length} face(s) in image ${imageNumber}`);

      // Log face details
      faces.forEach((face, index) => {
        console.log(
          `  Face ${index + 1}: x=${face.x}, y=${face.y}, w=${face.width}, h=${face.height}`,
        );
      });

      // Crop all detected faces
      console.log(
        `Cropping ${faces.length} face(s) from image ${imageNumber}...`,
      );
      const croppedFaces = await faceDetector.cropFaces(image, faces);

      croppedFaces.forEach((faceDataUrl, faceIndex) => {
        const sizeKB = Math.round((faceDataUrl.length * 0.75) / 1024);
        console.log(`  Cropped face ${faceIndex + 1}: ${sizeKB}KB`);
      });

      return croppedFaces;
    } else {
      console.log(`No faces detected in image ${imageNumber}`);
      // Return empty array - don't create fallback (user wants notification)
      return [];
    }
  } catch (error) {
    console.error(`Error processing image ${imageNumber}:`, error);
    return [];
  }
}

// Legacy function for backward compatibility
async function processImages(imageDataUrls) {
  return processImagesWithProgress(imageDataUrls, null);
}

console.log(
  "Offscreen worker loaded and ready for face detection using tracking.js",
);
