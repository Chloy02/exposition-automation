// popup.js (Updated for storage-based autofill)

document.addEventListener('DOMContentLoaded', () => {
    const extractBtn = document.getElementById('extractBtn');
    const clearBtn = document.getElementById('clearBtn');
    const statusDiv = document.getElementById('status');
    const resultsTableBody = document.querySelector('#resultsTable tbody');

    loadAndRenderData();

    extractBtn.addEventListener('click', () => {
        statusDiv.textContent = 'Extracting data from Gmail...';
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].url.includes("mail.google.com")) {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    files: ['content.js']
                }, (injectionResults) => {
                    if (chrome.runtime.lastError || !injectionResults || !injectionResults[0]) {
                        statusDiv.textContent = 'Error: Could not extract data. Is a Gmail email open?';
                        console.error("Injection error:", chrome.runtime.lastError || "No results from injection.");
                        return;
                    }
                    if (injectionResults[0].result === null) {
                         statusDiv.textContent = 'Could not find a valid email container on the page.';
                         return;
                    }
                    handleExtractionResult(injectionResults[0].result);
                });
            } else {
                statusDiv.textContent = 'Please open an email in Gmail first.';
            }
        });
    });

    clearBtn.addEventListener('click', () => {
        chrome.storage.local.set({ emails: [] }, () => {
            resultsTableBody.innerHTML = '';
            statusDiv.textContent = 'Stored data has been cleared.';
        });
    });

    function handleExtractionResult(extractedData) {
        statusDiv.textContent = 'Data extracted! Processing images...';
        saveAndProcessData(extractedData);
    }

    async function saveAndProcessData(newData) {
        const data = await chrome.storage.local.get({ emails: [] });
        let emails = data.emails || [];
        
        newData.croppedFaces = [];
        const existingEmailIndex = emails.findIndex(e => e.id === newData.id);
        if (existingEmailIndex > -1) {
            emails[existingEmailIndex] = newData;
        } else {
            emails.push(newData);
        }
        
        await chrome.storage.local.set({ emails });
        loadAndRenderData();

        if (newData.images && newData.images.length > 0) {
            statusDiv.textContent = 'Detecting faces... (this may take a moment)';
            try {
                const response = await chrome.runtime.sendMessage({
                    action: 'processImages',
                    imageDataUrls: newData.images
                });

                if (response.success) {
                    const emailIndex = emails.findIndex(e => e.id === newData.id);
                    if (emailIndex > -1) {
                        emails[emailIndex].croppedFaces = response.croppedFaces;
                    }
                    statusDiv.textContent = `Processing complete. Found ${response.croppedFaces.length} face(s).`;
                } else {
                    throw new Error(response.error || 'Unknown error in background script.');
                }
            } catch (error) {
                console.error("Face detection failed:", error);
                statusDiv.textContent = 'Error: Face detection failed. Check background logs.';
            }
            
            await chrome.storage.local.set({ emails });
            loadAndRenderData();
        } else {
            statusDiv.textContent = 'Extraction complete. No images to process.';
        }
    }

    function loadAndRenderData() {
        chrome.storage.local.get({ emails: [] }, (data) => {
            resultsTableBody.innerHTML = '';
            const emails = data.emails || [];
            if (emails.length > 0) {
                emails.forEach(email => addRowToTable(email));
                statusDiv.textContent = `Loaded ${emails.length} stored entries.`;
            } else {
                statusDiv.textContent = 'Ready to extract an email.';
            }
        });
    }

    function addRowToTable(emailData) {
        const row = document.createElement('tr');
        const sender = emailData.senderEmail || 'N/A';
        const date = emailData.date ? new Date(emailData.date).toLocaleString() : 'N/A';
        const subject = emailData.subject || 'N/A';

        row.innerHTML = `
            <td>${sender}</td>
            <td>${date}</td>
            <td>${subject}</td>
            <td class="image-cell"><div class="image-container original-images"></div></td>
            <td class="image-cell"><div class="image-container cropped-faces"></div></td>
            <td><button class="button-primary fill-form-btn" data-email-id="${emailData.id}">Auto-fill</button></td>
        `;

        const originalImagesContainer = row.querySelector('.original-images');
        if (emailData.images && emailData.images.length > 0) {
            emailData.images.forEach(dataUrl => {
                const img = document.createElement('img');
                img.src = dataUrl;
                originalImagesContainer.appendChild(img);
            });
        } else {
            originalImagesContainer.textContent = 'none';
        }

        const croppedFacesContainer = row.querySelector('.cropped-faces');
        if (emailData.croppedFaces && emailData.croppedFaces.length > 0) {
            emailData.croppedFaces.forEach(faceDataUrl => {
                const img = document.createElement('img');
                img.src = faceDataUrl;
                croppedFacesContainer.appendChild(img);
            });
        } else {
            croppedFacesContainer.textContent = '...';
        }
        resultsTableBody.prepend(row);
    }
    
    // Use a single event listener on the table body for all auto-fill buttons
    resultsTableBody.addEventListener('click', async (event) => {
        if (event.target && event.target.classList.contains('fill-form-btn')) {
            const emailId = event.target.dataset.emailId;
            const { emails } = await chrome.storage.local.get('emails');
            const emailData = emails.find(e => e.id === emailId);

            if (emailData) {
                // Save the specific data for autofill and create the tab
                await chrome.storage.local.set({ 'autofillData': emailData });
                chrome.tabs.create({ url: "https://face-recognise.vercel.app/add-image" });
            }
        }
    });
});
