// background.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Listens for the message from popup.js
    if (request.action === 'processImages') {
        // The data is now in request.imageDataUrls
        handleImageProcessing(request.imageDataUrls)
            .then(croppedFaces => sendResponse({ success: true, croppedFaces }))
            .catch(error => {
                console.error('Error during offscreen processing:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true; // Keep the message channel open for the async response
    }
});

let creating; // Promise to prevent race conditions when creating the offscreen document

// Manages the creation and existence of the offscreen document
async function handleImageProcessing(imageDataUrls) {
    const offscreenUrl = chrome.runtime.getURL('offscreen.html');
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [offscreenUrl]
    });

    if (!existingContexts.length) {
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
    }

    // Send the data URIs to the offscreen document for processing
    const croppedFaces = await chrome.runtime.sendMessage({
        action: 'offscreenProcess',
        imageDataUrls: imageDataUrls, // Forwarding the correct data
    });
    
    // Close the offscreen document after a short delay to save memory
    setTimeout(() => chrome.offscreen.closeDocument(), 10000);

    return croppedFaces;
}
