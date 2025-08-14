// autofill.js (Updated to use chrome.storage)

console.log("Exposition Automator: Autofill script loaded.");

/**
 * Converts a Data URI into a File object.
 */
function dataURLtoFile(dataurl, filename) {
    let arr = dataurl.split(','),
        mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), 
        n = bstr.length, 
        u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}

/**
 * Programmatically sets the value of an input field for React compatibility.
 */
function setReactInputValue(input, value) {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
    ).set;
    nativeInputValueSetter.call(input, value);
    const event = new Event('input', { bubbles: true });
    input.dispatchEvent(event);
}

/**
 * Waits for an element to be present in the DOM
 */
function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const element = document.querySelector(selector);
        if (element) {
            resolve(element);
            return;
        }

        const observer = new MutationObserver((mutations, obs) => {
            const element = document.querySelector(selector);
            if (element) {
                obs.disconnect();
                resolve(element);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        }, timeout);
    });
}

/**
 * The main function to fill the form with data.
 * @param {object} data - The email data object.
 */
async function fillForm(data) {
    console.log("Found data to auto-fill:", data);
    try {
        // Wait for the form to be fully loaded
        console.log("Waiting for form elements to load...");
        
        // --- Fill Email Address ---
        try {
            const emailInput = await waitForElement('input[type="email"], input[placeholder="person@example.com"]');
            if (emailInput && data.senderEmail) {
                setReactInputValue(emailInput, data.senderEmail);
                console.log("Email filled:", data.senderEmail);
            }
        } catch (error) {
            console.warn("Email input not found:", error.message);
        }

        // --- Fill Date ---
        try {
            const dateInput = await waitForElement('input[placeholder*="mm"][placeholder*="dd"][placeholder*="yyyy"]');
            if (dateInput && data.date) {
                const date = new Date(data.date);
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const year = date.getFullYear();
                setReactInputValue(dateInput, `${month}/${day}/${year}`);
                console.log("Date filled:", `${month}/${day}/${year}`);
            }
        } catch (error) {
            console.warn("Date input not found:", error.message);
        }

        // --- Fill Time ---
        try {
            const timeInput = await waitForElement('input[placeholder*="--:--"]');
            if(timeInput && data.date) {
                const date = new Date(data.date);
                const timeValue = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                setReactInputValue(timeInput, timeValue);
                console.log("Time filled:", timeValue);
            }
        } catch (error) {
            console.warn("Time input not found:", error.message);
        }

        // --- Handle the File Upload ---
        try {
            const fileInput = await waitForElement('input[type="file"]');
            if (fileInput && data.croppedFaces && data.croppedFaces.length > 0) {
                const firstFaceUrl = data.croppedFaces[0];
                const file = dataURLtoFile(firstFaceUrl, 'face.png');
                
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                fileInput.files = dataTransfer.files;
                
                fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                fileInput.dispatchEvent(new Event('input', { bubbles: true }));
                console.log("File uploaded:", file.name);
            }
        } catch (error) {
            console.warn("File input not found:", error.message);
        }
        
        console.log("Form fill completed successfully.");
    } catch (error) {
        console.error("Error while filling the form:", error);
    }
}

// --- Script Entry Point ---
// When the script loads, check storage for autofill data.
chrome.storage.local.get('autofillData', (result) => {
    if (result.autofillData) {
        console.log("Autofill data found, waiting for page to load...");
        
        // Wait for the page to be fully loaded before attempting to fill
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => fillForm(result.autofillData), 1000);
            });
        } else {
            // Page is already loaded, wait a bit for React to render
            setTimeout(() => fillForm(result.autofillData), 1000);
        }
        
        // IMPORTANT: Remove the data from storage after using it to prevent
        // it from re-filling every time you visit the page.
        chrome.storage.local.remove('autofillData', () => {
            console.log("Autofill data has been used and cleared.");
        });
    } else {
        console.log("No autofill data found in storage.");
    }
});
