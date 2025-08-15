// Simple Face Detection using basic image processing
// This is a lightweight face detection that works without external models

class SimpleFaceDetector {
    constructor() {
        this.canvas = null;
        this.ctx = null;
    }

    // Initialize the detector
    init() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        return Promise.resolve();
    }

    // Detect faces in an image using basic computer vision techniques
    async detectFaces(imageElement) {
        try {
            console.log("Starting simple face detection...");
            
            // Optimize for large images - resize if too big
            const optimizedImage = this.optimizeImageForProcessing(imageElement);
            
            // Set up canvas with optimized image
            this.canvas.width = optimizedImage.width;
            this.canvas.height = optimizedImage.height;
            this.ctx.drawImage(optimizedImage, 0, 0);
            
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            const faces = this.findFaceRegions(imageData);
            
            // Scale face coordinates back to original image size if we resized
            const scaleX = imageElement.width / optimizedImage.width;
            const scaleY = imageElement.height / optimizedImage.height;
            
            const scaledFaces = faces.map(face => ({
                x: Math.round(face.x * scaleX),
                y: Math.round(face.y * scaleY),
                width: Math.round(face.width * scaleX),
                height: Math.round(face.height * scaleY),
                confidence: face.confidence
            }));
            
            console.log(`Simple face detection found ${scaledFaces.length} potential face regions`);
            return scaledFaces;
            
        } catch (error) {
            console.error("Simple face detection error:", error);
            return [];
        }
    }

    // Optimize image size for faster processing
    optimizeImageForProcessing(imageElement) {
        const maxDimension = 1000; // Increased from 800px for better detection
        const { width, height } = imageElement;
        
        // If image is small enough, use as-is
        if (width <= maxDimension && height <= maxDimension) {
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
        const optimizedCanvas = document.createElement('canvas');
        const optimizedCtx = optimizedCanvas.getContext('2d');
        optimizedCanvas.width = newWidth;
        optimizedCanvas.height = newHeight;
        
        // Draw resized image with smooth scaling
        optimizedCtx.imageSmoothingEnabled = true;
        optimizedCtx.imageSmoothingQuality = 'high';
        optimizedCtx.drawImage(imageElement, 0, 0, newWidth, newHeight);
        
        console.log(`Optimized image from ${width}x${height} to ${newWidth}x${newHeight} for processing`);
        return optimizedCanvas;
    }

    // Basic face detection using skin tone detection and geometric analysis
    findFaceRegions(imageData) {
        const { data, width, height } = imageData;
        const faces = [];
        
        // Convert to grayscale and find skin-tone regions
        const skinRegions = this.findSkinRegions(data, width, height);
        
        // Group skin regions into potential face areas
        const faceAreas = this.groupSkinRegions(skinRegions, width, height);
        
        // Filter and validate face areas
        for (const area of faceAreas) {
            if (this.validateFaceArea(area, width, height)) {
                faces.push({
                    x: area.minX,
                    y: area.minY,
                    width: area.maxX - area.minX,
                    height: area.maxY - area.minY,
                    confidence: area.confidence
                });
            }
        }
        
        // If no faces found using skin detection, try fallback methods
        if (faces.length === 0) {
            console.log("No faces found with skin detection, trying fallback...");
            const fallbackFaces = this.fallbackFaceDetection(width, height);
            faces.push(...fallbackFaces);
        }
        
        return faces;
    }

    // Detect skin-tone regions (optimized for speed)
    findSkinRegions(data, width, height) {
        const skinPixels = [];
        const step = 4; // Process every 4th pixel for speed
        
        for (let y = 0; y < height; y += step) {
            for (let x = 0; x < width; x += step) {
                const index = (y * width + x) * 4;
                const r = data[index];
                const g = data[index + 1];
                const b = data[index + 2];
                
                if (this.isSkinTone(r, g, b)) {
                    skinPixels.push({ x, y });
                }
            }
        }
        
        return skinPixels;
    }

    // Check if RGB values represent skin tone
    isSkinTone(r, g, b) {
        // Multiple skin tone detection algorithms
        
        // Algorithm 1: Basic RGB ranges
        const basic = (r > 95 && g > 40 && b > 20 && 
                      Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
                      Math.abs(r - g) > 15 && r > g && r > b);
        
        // Algorithm 2: Normalized RGB
        const sum = r + g + b;
        if (sum === 0) return false;
        
        const rNorm = r / sum;
        const gNorm = g / sum;
        const bNorm = b / sum;
        
        const normalized = (rNorm > 0.36 && rNorm < 0.465 && 
                           gNorm > 0.28 && gNorm < 0.363 &&
                           bNorm > 0.18 && bNorm < 0.30);
        
        // Algorithm 3: HSV-based detection
        const hsv = this.rgbToHsv(r, g, b);
        const hsvBased = (hsv.h >= 0 && hsv.h <= 35 && 
                         hsv.s >= 0.15 && hsv.s <= 0.7 &&
                         hsv.v >= 0.35 && hsv.v <= 0.95);
        
        return basic || normalized || hsvBased;
    }

    // Convert RGB to HSV
    rgbToHsv(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const diff = max - min;

        let h = 0;
        if (diff !== 0) {
            if (max === r) h = ((g - b) / diff) % 6;
            else if (max === g) h = (b - r) / diff + 2;
            else h = (r - g) / diff + 4;
        }
        h = Math.round(h * 60);
        if (h < 0) h += 360;

        const s = max === 0 ? 0 : diff / max;
        const v = max;

        return { h, s, v };
    }

    // Group nearby skin pixels into regions
    groupSkinRegions(skinPixels, width, height) {
        const regions = [];
        const visited = new Set();
        
        for (const pixel of skinPixels) {
            const key = `${pixel.x},${pixel.y}`;
            if (visited.has(key)) continue;
            
            const region = this.floodFill(skinPixels, pixel, visited, width, height);
            if (region.pixels.length > 50) { // Minimum size for a potential face region
                regions.push(region);
            }
        }
        
        return regions;
    }

    // Flood fill to find connected skin regions
    floodFill(skinPixels, startPixel, visited, width, height) {
        const stack = [startPixel];
        const regionPixels = [];
        let minX = width, maxX = 0, minY = height, maxY = 0;
        
        const skinPixelSet = new Set(skinPixels.map(p => `${p.x},${p.y}`));
        
        while (stack.length > 0) {
            const pixel = stack.pop();
            const key = `${pixel.x},${pixel.y}`;
            
            if (visited.has(key)) continue;
            visited.add(key);
            
            regionPixels.push(pixel);
            minX = Math.min(minX, pixel.x);
            maxX = Math.max(maxX, pixel.x);
            minY = Math.min(minY, pixel.y);
            maxY = Math.max(maxY, pixel.y);
            
            // Check 8-connected neighbors
            for (let dx = -2; dx <= 2; dx += 2) {
                for (let dy = -2; dy <= 2; dy += 2) {
                    if (dx === 0 && dy === 0) continue;
                    
                    const nx = pixel.x + dx;
                    const ny = pixel.y + dy;
                    const nKey = `${nx},${ny}`;
                    
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height &&
                        !visited.has(nKey) && skinPixelSet.has(nKey)) {
                        stack.push({ x: nx, y: ny });
                    }
                }
            }
        }
        
        return {
            pixels: regionPixels,
            minX, maxX, minY, maxY,
            confidence: Math.min(regionPixels.length / 1000, 1.0) // Confidence based on region size
        };
    }

    // Validate if a region could be a face
    validateFaceArea(area, width, height) {
        const faceWidth = area.maxX - area.minX;
        const faceHeight = area.maxY - area.minY;
        
        // Face should be reasonably sized
        if (faceWidth < 30 || faceHeight < 30) return false;
        if (faceWidth > width * 0.8 || faceHeight > height * 0.8) return false;
        
        // Face should have reasonable aspect ratio (faces are usually taller than wide)
        const aspectRatio = faceHeight / faceWidth;
        if (aspectRatio < 0.8 || aspectRatio > 2.0) return false;
        
        // Face should not be too small relative to image
        const faceArea = faceWidth * faceHeight;
        const imageArea = width * height;
        if (faceArea < imageArea * 0.01) return false; // At least 1% of image
        
        return true;
    }

    // Fallback detection when skin detection fails
    fallbackFaceDetection(width, height) {
        console.log("Using fallback face detection...");
        
        // If no faces detected, assume there might be a face in the center-top area
        // This is a common composition in photos
        const centerX = width / 2;
        const topY = height * 0.2; // Top 20% of image
        
        const faceWidth = Math.min(width * 0.3, 200); // 30% of width or 200px max
        const faceHeight = Math.min(height * 0.4, 250); // 40% of height or 250px max
        
        return [{
            x: Math.max(0, centerX - faceWidth / 2),
            y: Math.max(0, topY - faceHeight / 2),
            width: faceWidth,
            height: faceHeight,
            confidence: 0.3 // Low confidence for fallback
        }];
    }

    // Crop faces from image with generous padding
    async cropFaces(imageElement, faces) {
        const croppedFaces = [];
        
        for (let i = 0; i < faces.length; i++) {
            const face = faces[i];
            
            // Add generous padding around the detected face for better results
            const paddingPercent = 0.4; // 40% padding - much more generous
            const paddingX = face.width * paddingPercent;
            const paddingY = face.height * paddingPercent;
            
            // Calculate padded coordinates
            const paddedX = Math.max(0, face.x - paddingX);
            const paddedY = Math.max(0, face.y - paddingY);
            const paddedWidth = Math.min(imageElement.width - paddedX, face.width + 2 * paddingX);
            const paddedHeight = Math.min(imageElement.height - paddedY, face.height + 2 * paddingY);
            
            // Ensure minimum crop size
            const minSize = 150;
            const finalWidth = Math.max(paddedWidth, minSize);
            const finalHeight = Math.max(paddedHeight, minSize);
            
            // Re-center if we expanded to minimum size
            const finalX = Math.max(0, paddedX - (finalWidth - paddedWidth) / 2);
            const finalY = Math.max(0, paddedY - (finalHeight - paddedHeight) / 2);
            
            // Create canvas for cropped face
            const faceCanvas = document.createElement('canvas');
            const faceCtx = faceCanvas.getContext('2d');
            
            faceCanvas.width = finalWidth;
            faceCanvas.height = finalHeight;
            
            // Draw cropped face
            faceCtx.drawImage(
                imageElement,
                finalX, finalY, finalWidth, finalHeight,
                0, 0, finalWidth, finalHeight
            );
            
            // Convert to data URL with good quality
            const croppedDataUrl = faceCanvas.toDataURL('image/jpeg', 0.85);
            croppedFaces.push(croppedDataUrl);
            
            console.log(`Cropped face ${i + 1} with generous padding (${finalWidth}x${finalHeight}) and confidence ${face.confidence.toFixed(2)}`);
        }
        
        return croppedFaces;
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SimpleFaceDetector;
} else {
    window.SimpleFaceDetector = SimpleFaceDetector;
}
