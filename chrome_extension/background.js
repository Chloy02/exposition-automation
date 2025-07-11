// background.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'processImages') {
        handleImageProcessing(request.imageUrls)
            .then(croppedFaces => sendResponse({ success: true, croppedFaces }))
            .catch(error => {
                console.error('Error in background image processing:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true; // Keep channel open for async response
    }
});

let creating;

async function hasOffscreenDocument() {
    const offscreenUrl = chrome.runtime.getURL('offscreen.html');
    const clients = await self.clients.matchAll();
    for (const client of clients) {
        if (client.url === offscreenUrl) {
            return true;
        }
    }
    return false;
}

async function handleImageProcessing(imageUrls) {
    if (!(await hasOffscreenDocument())) {
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

    const croppedFaces = await chrome.runtime.sendMessage({
        action: 'offscreenProcess',
        imageUrls: imageUrls,
    });
    
    return croppedFaces;
}

