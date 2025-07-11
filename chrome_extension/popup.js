// popup.js

document.addEventListener('DOMContentLoaded', () => {
    const extractBtn = document.getElementById('extractBtn');
    const clearBtn = document.getElementById('clearBtn');
    const statusDiv = document.getElementById('status');
    const resultsTableBody = document.querySelector('#resultsTable tbody');

    let modelsLoaded = false;

    // --- Load Models ---
    const modelPath = chrome.runtime.getURL('/models');
    Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelPath)
    ]).then(() => {
        console.log("Face models loaded");
        modelsLoaded = true;
        statusDiv.textContent = 'Models loaded. Ready to extract.';
    }).catch(err => {
        console.error("Error loading face models:", err);
        statusDiv.textContent = 'Could not load face models. Ensure the models folder exists.';
    });
    
    loadAndRenderData();

    // --- Event Listeners ---

    extractBtn.addEventListener('click', () => {
        statusDiv.textContent = 'Extracting email data...';
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0) { statusDiv.textContent = 'No active tab found.'; return; }
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                files: ['content.js']
            }, (injectionResults) => handleExtractionResult(injectionResults));
        });
    });

    clearBtn.addEventListener('click', () => {
        chrome.storage.local.set({ emails: [] }, () => {
            resultsTableBody.innerHTML = '';
            statusDiv.textContent = 'Stored data has been cleared.';
        });
    });

    // --- Functions ---

    function handleExtractionResult(injectionResults) {
        if (chrome.runtime.lastError) {
            statusDiv.textContent = `Error: ${chrome.runtime.lastError.message}`;
            console.error(chrome.runtime.lastError);
            return;
        }
        if (!injectionResults || injectionResults.length === 0 || !injectionResults[0].result) {
            statusDiv.textContent = 'Could not extract data. Is a Gmail email open?';
            return;
        }
        const extractedData = injectionResults[0].result;
        statusDiv.textContent = 'Data extracted! Processing images...';
        saveAndProcessData(extractedData);
    }

    function loadAndRenderData() {
        chrome.storage.local.get({ emails: [] }, (data) => {
            resultsTableBody.innerHTML = '';
            if (data.emails && data.emails.length > 0) {
                data.emails.forEach(email => addRowToTable(email));
                statusDiv.textContent = `Loaded ${data.emails.length} stored entries.`;
            } else {
                statusDiv.textContent = 'No data stored. Extract an email to begin.';
            }
        });
    }

    async function saveAndProcessData(newData) {
        let emails = [];
        const data = await chrome.storage.local.get({ emails: [] });
        emails = data.emails || [];

        if (modelsLoaded && newData.images && newData.images.length > 0) {
            statusDiv.textContent = 'Detecting faces...';
            const faceCanvases = await cropFacesFromUrls(newData.images);
            newData.croppedFaces = faceCanvases.map(canvas => canvas.toDataURL());
            statusDiv.textContent = `Extraction complete. Found ${faceCanvases.length} face(s).`;
        } else {
            statusDiv.textContent = 'Extraction complete. Face cropping is disabled or no images found.';
        }

        emails.push(newData);
        await chrome.storage.local.set({ emails });
        loadAndRenderData(); // Re-render the whole table to ensure order and listeners
    }

    function addRowToTable(emailData) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${emailData.sender}</td>
            <td>${new Date(emailData.date).toLocaleString()}</td>
            <td>${emailData.subject}</td>
            <td class="image-cell"><div class="image-container original-images"></div></td>
            <td class="image-cell"><div class="image-container cropped-faces"></div></td>
            <td><button class="button-primary fill-form-btn">Auto-fill</button></td>
        `;

        const originalImagesContainer = row.querySelector('.original-images');
        if (emailData.images && emailData.images.length > 0) {
            emailData.images.forEach(url => {
                const img = document.createElement('img');
                img.src = url;
                originalImagesContainer.appendChild(img);
            });
        } else {
            originalImagesContainer.textContent = 'none';
        }

        const croppedFacesContainer = row.querySelector('.cropped-faces');
        renderCroppedFaces(croppedFacesContainer, emailData);

        row.querySelector('.fill-form-btn').addEventListener('click', () => {
            autoFillForm(emailData);
        });

        resultsTableBody.prepend(row);
        return row;
    }

    function renderCroppedFaces(container, emailData) {
        container.innerHTML = '';
        if (emailData.croppedFaces && emailData.croppedFaces.length > 0) {
            emailData.croppedFaces.forEach((faceDataUrl, index) => {
                const faceWrapper = document.createElement('div');
                faceWrapper.className = 'face-wrapper';
                
                const img = document.createElement('img');
                img.src = faceDataUrl;
                faceWrapper.appendChild(img);

                const actions = document.createElement('div');
                actions.className = 'face-actions';
                
                const copyBtn = document.createElement('button');
                copyBtn.textContent = 'Copy';
                copyBtn.onclick = () => copyImageToClipboard(faceDataUrl);
                actions.appendChild(copyBtn);

                const downloadBtn = document.createElement('button');
                downloadBtn.textContent = 'Save';
                downloadBtn.onclick = () => downloadImage(faceDataUrl, `face_${emailData.id}_${index}.png`);
                actions.appendChild(downloadBtn);

                faceWrapper.appendChild(actions);
                container.appendChild(faceWrapper);
            });
        } else {
            container.textContent = modelsLoaded ? '...' : 'disabled';
        }
    }

    async function cropFacesFromUrls(imageUrls) {
        const faceCanvases = [];
        for (const url of imageUrls) {
            try {
                const image = await faceapi.fetchImage(url);
                const detections = await faceapi.detectAllFaces(image, new faceapi.TinyFaceDetectorOptions());
                const canvases = await faceapi.extractFaces(image, detections);
                faceCanvases.push(...canvases);
            } catch (error) {
                console.error(`Could not process image from ${url}`, error);
            }
        }
        return faceCanvases;
    }

    function downloadImage(dataUrl, filename) {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        link.click();
    }

    async function copyImageToClipboard(dataUrl) {
        try {
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            await navigator.clipboard.write([
                new ClipboardItem({ [blob.type]: blob })
            ]);
            statusDiv.textContent = 'Image copied to clipboard!';
        } catch (error) {
            console.error('Failed to copy image: ', error);
            statusDiv.textContent = 'Error: Could not copy image.';
        }
    }

    function autoFillForm(emailData) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "fill_form",
                    data: emailData
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        statusDiv.textContent = 'Could not connect. Is the target site open?';
                    } else if (response) {
                        statusDiv.textContent = response.status;
                    }
                });
            }
        });
    }
});

