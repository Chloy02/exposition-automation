// popup.js

document.addEventListener('DOMContentLoaded', () => {
    const extractBtn = document.getElementById('extractBtn');
    const clearBtn = document.getElementById('clearBtn');
    const statusDiv = document.getElementById('status');
    const resultsTableBody = document.querySelector('#resultsTable tbody');

    loadAndRenderData();

    extractBtn.addEventListener('click', () => {
        statusDiv.textContent = 'Extracting email data...';
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: () => {
                        // This intermediate function helps bridge the async gap
                        // The result of extractEmailData (a promise) is resolved here
                        return extractEmailData(); 
                    }
                }, (injectionResults) => handleExtractionResult(injectionResults));
            }
        });
    });

    clearBtn.addEventListener('click', () => {
        chrome.storage.local.set({ emails: [] }, () => {
            resultsTableBody.innerHTML = '';
            statusDiv.textContent = 'Stored data has been cleared.';
        });
    });

    function handleExtractionResult(injectionResults) {
        if (chrome.runtime.lastError || !injectionResults || !injectionResults[0] || !injectionResults[0].result) {
            statusDiv.textContent = 'Could not extract data. Is a Gmail email open?';
            return;
        }
        const extractedData = injectionResults[0].result;
        statusDiv.textContent = 'Data extracted! Processing images...';
        saveAndProcessData(extractedData);
    }

    async function saveAndProcessData(newData) {
        const data = await chrome.storage.local.get({ emails: [] });
        const emails = data.emails || [];

        if (newData.images && newData.images.length > 0) {
            statusDiv.textContent = 'Detecting faces... (this may take a moment)';
            try {
                const response = await chrome.runtime.sendMessage({
                    action: 'processImages',
                    imageUrls: newData.images
                });

                if (response.success) {
                    newData.croppedFaces = response.croppedFaces;
                    statusDiv.textContent = `Extraction complete. Found ${newData.croppedFaces.length} face(s).`;
                } else {
                    throw new Error(response.error || 'Unknown error in background script.');
                }
            } catch (error) {
                console.error("Face detection failed:", error);
                statusDiv.textContent = 'Error: Face detection failed.';
            }
        } else {
            statusDiv.textContent = 'Extraction complete. No images found.';
        }

        emails.push(newData);
        await chrome.storage.local.set({ emails });
        loadAndRenderData();
    }

    function loadAndRenderData() {
        chrome.storage.local.get({ emails: [] }, (data) => {
            resultsTableBody.innerHTML = '';
            if (data.emails && data.emails.length > 0) {
                data.emails.forEach(email => addRowToTable(email));
                statusDiv.textContent = `Loaded ${data.emails.length} stored entries.`;
            } else {
                statusDiv.textContent = 'Ready to extract an email.';
            }
        });
    }

    function addRowToTable(emailData) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${emailData.senderEmail || 'N/A'}</td>
            <td>${new Date(emailData.date).toLocaleString()}</td>
            <td>${emailData.subject || 'N/A'}</td>
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
            container.textContent = '...';
        }
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

