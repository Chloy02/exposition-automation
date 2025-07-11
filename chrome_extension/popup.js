// popup.js

document.addEventListener('DOMContentLoaded', () => {
    const extractBtn = document.getElementById('extractBtn');
    const clearBtn = document.getElementById('clearBtn');
    const statusDiv = document.getElementById('status');
    const resultsTableBody = document.querySelector('#resultsTable tbody');

    let modelsLoaded = false; 

    // --- Example of how you would load models ---
    Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models')
    ]).then(() => {
        console.log("Face models loaded");
        modelsLoaded = true;
        statusDiv.textContent = 'Models loaded. Ready to extract.';
    }).catch(err => {
        console.error("Error loading face models:", err);
        statusDiv.textContent = 'Could not load face models.';
    });
    


    // Load and display stored data when the popup opens
    loadAndRenderData();

    // --- Event Listeners ---

    extractBtn.addEventListener('click', () => {
        statusDiv.textContent = 'Extracting email data...';
        // Query the active tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0) {
                statusDiv.textContent = 'No active tab found.';
                return;
            }
            // Execute the content script in the active tab
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                files: ['content.js']
            }, (injectionResults) => {
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
            });
        });
    });

    clearBtn.addEventListener('click', () => {
        chrome.storage.local.set({ emails: [] }, () => {
            resultsTableBody.innerHTML = '';
            statusDiv.textContent = 'Stored data has been cleared.';
        });
    });

    // --- Functions ---

    function loadAndRenderData() {
        chrome.storage.local.get({ emails: [] }, (data) => {
            resultsTableBody.innerHTML = ''; // Clear existing table
            if (data.emails && data.emails.length > 0) {
                data.emails.forEach(email => addRowToTable(email));
                statusDiv.textContent = `Loaded ${data.emails.length} stored entries.`;
            } else {
                statusDiv.textContent = 'No data stored. Extract an email to begin.';
            }
        });
    }

    async function saveAndProcessData(newData) {
        // Get existing data from storage
        chrome.storage.local.get({ emails: [] }, async (data) => {
            const emails = data.emails || [];

            // Add new data and save back to storage
            emails.push(newData);
            chrome.storage.local.set({ emails: emails }, () => {
                console.log('Email data saved.');
            });

            // Add the new row to the table immediately
            const row = addRowToTable(newData);
            
            // Process images for face detection (if models were loaded)
            if (modelsLoaded && newData.images && newData.images.length > 0) {
                statusDiv.textContent = 'Detecting faces...';
                const croppedFacesContainer = row.querySelector('.cropped-faces');
                croppedFacesContainer.textContent = 'detecting...';

                const faceImages = await cropFacesFromUrls(newData.images);
                
                croppedFacesContainer.innerHTML = ''; // Clear 'detecting...'
                if (faceImages.length > 0) {
                    faceImages.forEach(faceUrl => {
                        const img = document.createElement('img');
                        img.src = faceUrl;
                        croppedFacesContainer.appendChild(img);
                    });
                     statusDiv.textContent = `Extraction complete. Found ${faceImages.length} face(s).`;
                } else {
                    croppedFacesContainer.textContent = 'none';
                    statusDiv.textContent = 'Extraction complete. No faces found.';
                }
                // Here you would update the storage again with the cropped face data if needed
            } else {
                 statusDiv.textContent = 'Extraction complete. Face cropping disabled.';
            }
        });
    }

    function addRowToTable(emailData) {
        const row = document.createElement('tr');

        const senderCell = document.createElement('td');
        senderCell.textContent = emailData.sender;
        row.appendChild(senderCell);

        const dateCell = document.createElement('td');
        dateCell.textContent = new Date(emailData.date).toLocaleString();
        row.appendChild(dateCell);

        const subjectCell = document.createElement('td');
        subjectCell.textContent = emailData.subject;
        row.appendChild(subjectCell);

        // Cell for original images
        const imagesCell = document.createElement('td');
        const imageContainer = document.createElement('div');
        imageContainer.className = 'image-container';
        if (emailData.images && emailData.images.length > 0) {
            emailData.images.forEach(url => {
                const img = document.createElement('img');
                img.src = url;
                imageContainer.appendChild(img);
            });
        } else {
            imageContainer.textContent = 'none';
        }
        imagesCell.appendChild(imageContainer);
        row.appendChild(imagesCell);

        // Cell for cropped faces
        const croppedFacesCell = document.createElement('td');
        const croppedFacesContainer = document.createElement('div');
        croppedFacesContainer.className = 'image-container cropped-faces';
        // Initially empty, will be populated by face detection
        croppedFacesContainer.textContent = modelsLoaded ? '...' : 'disabled';
        croppedFacesCell.appendChild(croppedFacesContainer);
        row.appendChild(croppedFacesCell);

        // Prepend the new row to the table body
        resultsTableBody.prepend(row);
        return row;
    }

    async function cropFacesFromUrls(imageUrls) {
        const faceImages = [];
        for (const url of imageUrls) {
            try {
                const image = await faceapi.fetchImage(url);
                const detections = await faceapi.detectAllFaces(image, new faceapi.TinyFaceDetectorOptions());

                for (const detection of detections) {
                    const faceCanvas = await faceapi.extractFaces(image, [detection]);
                    if (faceCanvas.length > 0) {
                        faceImages.push(faceCanvas[0].toDataURL());
                    }
                }
            } catch (error) {
                console.error(`Could not process image from ${url}`, error);
            }
        }
        return faceImages;
    }
});

