// trackingFaceDetection.js - Face Detection using tracking.js (Haar Cascade/Viola-Jones)

class TrackingFaceDetector {
  constructor() {
    this.ready = false;
    this.tracker = null;
  }

  // Initialize the face detector with tracking.js
  async init() {
    try {
      console.log("Initializing tracking.js face detector...");

      // Check if tracking.js is loaded
      if (typeof tracking === "undefined") {
        throw new Error("tracking.js library not loaded");
      }

      // Create face tracker using Haar Cascade
      this.tracker = new tracking.ObjectTracker("face");

      // Configure tracker settings for better detection
      this.tracker.setInitialScale(1.0); // Start scale for detection
      this.tracker.setStepSize(1.5); // Step size for sliding window
      this.tracker.setEdgesDensity(0.1); // Edge density threshold

      this.ready = true;
      console.log("✅ Tracking.js face detector initialized successfully!");
      return true;
    } catch (error) {
      console.error(
        "❌ Failed to initialize tracking.js face detector:",
        error,
      );
      this.ready = false;
      return false;
    }
  }

  // Detect faces in an image element
  async detectFaces(imageElement) {
    if (!this.ready) {
      throw new Error("Face detector not initialized. Call init() first.");
    }

    try {
      console.log(
        `Starting face detection on ${imageElement.width}x${imageElement.height} image...`,
      );

      // Optimize image size for faster detection
      const optimizedImage = this.optimizeImageForDetection(imageElement);
      const scaleX = imageElement.width / optimizedImage.width;
      const scaleY = imageElement.height / optimizedImage.height;

      // Detect faces using tracking.js
      const faces = await this.detectFacesInternal(optimizedImage);

      // Scale face coordinates back to original image size
      const scaledFaces = faces.map((face) => ({
        x: Math.round(face.x * scaleX),
        y: Math.round(face.y * scaleY),
        width: Math.round(face.width * scaleX),
        height: Math.round(face.height * scaleY),
        confidence: 1.0, // tracking.js doesn't provide confidence scores
      }));

      console.log(
        `✅ Face detection complete: found ${scaledFaces.length} face(s)`,
      );
      scaledFaces.forEach((face, i) => {
        console.log(
          `  Face ${i + 1}: x=${face.x}, y=${face.y}, w=${face.width}, h=${face.height}`,
        );
      });

      return scaledFaces;
    } catch (error) {
      console.error("❌ Face detection error:", error);
      return [];
    }
  }

  // Internal face detection using tracking.js
  detectFacesInternal(imageElement) {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        canvas.width = imageElement.width;
        canvas.height = imageElement.height;
        ctx.drawImage(imageElement, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const detectedFaces = [];

        // Set up tracking event handler
        const trackHandler = (event) => {
          console.log(`Tracking.js detected ${event.data.length} face(s)`);
          event.data.forEach((rect) => {
            detectedFaces.push({
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
            });
          });
        };

        // Attach event handler
        this.tracker.on("track", trackHandler);

        // Track faces in the image
        tracking.track(canvas, this.tracker);

        // Wait a bit for tracking to complete (tracking.js is synchronous but we need to let events fire)
        setTimeout(() => {
          this.tracker.removeListener("track", trackHandler);
          resolve(detectedFaces);
        }, 100);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Optimize image size for faster detection
  optimizeImageForDetection(imageElement) {
    const maxDimension = 800; // Balance between speed and accuracy
    const { width, height } = imageElement;

    console.log(`Original image size: ${width}x${height}`);

    // If image is already small enough, use as-is
    if (width <= maxDimension && height <= maxDimension) {
      console.log("Image size optimal, using original");
      return imageElement;
    }

    // Calculate new dimensions maintaining aspect ratio
    let newWidth, newHeight;
    if (width > height) {
      newWidth = maxDimension;
      newHeight = Math.round((height * maxDimension) / width);
    } else {
      newHeight = maxDimension;
      newWidth = Math.round((width * maxDimension) / height);
    }

    // Create optimized canvas
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    canvas.width = newWidth;
    canvas.height = newHeight;

    // Draw resized image with high quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(imageElement, 0, 0, newWidth, newHeight);

    console.log(`Optimized image to ${newWidth}x${newHeight} for detection`);
    return canvas;
  }

  // Crop faces from the original image with padding
  async cropFaces(imageElement, faces) {
    if (faces.length === 0) {
      console.log("No faces to crop");
      return [];
    }

    const croppedFaces = [];

    for (let i = 0; i < faces.length; i++) {
      const face = faces[i];

      // Add generous padding around detected face (40%)
      const paddingPercent = 0.4;
      const paddingX = face.width * paddingPercent;
      const paddingY = face.height * paddingPercent;

      // Calculate padded coordinates
      let cropX = Math.max(0, face.x - paddingX);
      let cropY = Math.max(0, face.y - paddingY);
      let cropWidth = Math.min(
        imageElement.width - cropX,
        face.width + 2 * paddingX,
      );
      let cropHeight = Math.min(
        imageElement.height - cropY,
        face.height + 2 * paddingY,
      );

      // Ensure minimum crop size
      const minSize = 150;
      if (cropWidth < minSize) {
        const diff = minSize - cropWidth;
        cropX = Math.max(0, cropX - diff / 2);
        cropWidth = Math.min(minSize, imageElement.width - cropX);
      }
      if (cropHeight < minSize) {
        const diff = minSize - cropHeight;
        cropY = Math.max(0, cropY - diff / 2);
        cropHeight = Math.min(minSize, imageElement.height - cropY);
      }

      // Create canvas for cropped face
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      canvas.width = cropWidth;
      canvas.height = cropHeight;

      // Draw cropped face
      ctx.drawImage(
        imageElement,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight,
      );

      // Convert to data URL with good quality
      const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
      croppedFaces.push(croppedDataUrl);

      console.log(
        `✅ Cropped face ${i + 1}/${faces.length}: ${cropWidth}x${cropHeight} at (${cropX}, ${cropY})`,
      );
    }

    return croppedFaces;
  }

  // Create a fallback crop when no faces are detected
  createFallbackCrop(imageElement) {
    console.log("Creating fallback crop (no faces detected)");

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    const { width, height } = imageElement;

    // Create a smart center crop - 60% of smaller dimension
    const cropRatio = 0.6;
    const baseCropSize = Math.min(width, height) * cropRatio;
    const minCropSize = 300; // Minimum 300px
    const cropSize = Math.max(baseCropSize, minCropSize);

    // Position the crop in upper-center area (where faces usually are)
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

    ctx.drawImage(
      imageElement,
      cropX,
      cropY,
      finalCropSize,
      finalCropSize,
      0,
      0,
      finalCropSize,
      finalCropSize,
    );

    console.log(
      `Created fallback crop: ${finalCropSize}x${finalCropSize} from position (${cropX}, ${cropY})`,
    );
    return canvas.toDataURL("image/jpeg", 0.85);
  }
}

// Export for use in other scripts
if (typeof module !== "undefined" && module.exports) {
  module.exports = TrackingFaceDetector;
} else {
  window.TrackingFaceDetector = TrackingFaceDetector;
}
