// background.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Listens for the message from popup.js
    if (request.action === 'processImages') {
        console.log("Background: Received processImages request with", request.imageDataUrls.length, "images");
        
        // The data is now in request.imageDataUrls
        handleImageProcessing(request.imageDataUrls)
            .then(croppedFaces => {
                console.log("Background: Processing complete, sending", croppedFaces.length, "faces back");
                sendResponse({ success: true, croppedFaces });
            })
            .catch(error => {
                console.error('Background: Error during offscreen processing:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true; // Keep the message channel open for the async response
    }
});

let creating; // Promise to prevent race conditions when creating the offscreen document

// Manages the creation and existence of the offscreen document
async function handleImageProcessing(imageDataUrls) {
    const offscreenUrl = chrome.runtime.getURL('offscreen.html');
    console.log("Background: Checking for existing offscreen document at", offscreenUrl);
    
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [offscreenUrl]
    });

    if (!existingContexts.length) {
        console.log("Background: No existing offscreen document, creating new one...");
        if (creating) {
            await creating;
        } else {
            creating = chrome.offscreen.createDocument({
                url: 'offscreen.html',
                reasons: ['BLOBS'],
                justification: 'Process images for face detection in a DOM environment',
            });
            await creating;
            creating = null;
        }
        console.log("Background: Offscreen document created successfully");
    } else {
        console.log("Background: Using existing offscreen document");
    }

    // Wait a moment for the offscreen document to be ready
    await new Promise(resolve => setTimeout(resolve, 500));

    // Send the data URIs to the offscreen document for processing
    console.log("Background: Sending data to offscreen document...");
    const croppedFaces = await chrome.runtime.sendMessage({
        action: 'offscreenProcess',
        imageDataUrls: imageDataUrls, // Forwarding the correct data
    });
    
    console.log("Background: Received response from offscreen document");
    
    // Close the offscreen document after a short delay to save memory
    setTimeout(() => {
        chrome.offscreen.closeDocument().then(() => {
            console.log("Background: Offscreen document closed");
        }).catch(err => {
            console.warn("Background: Error closing offscreen document:", err);
        });
    }, 10000);

    return croppedFaces;
}
