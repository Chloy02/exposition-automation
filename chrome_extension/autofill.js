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
 * The main function to fill the form with data.
 * @param {object} data - The email data object.
 */
function fillForm(data) {
    console.log("Found data to auto-fill:", data);
    try {
        // --- Fill Email Address ---
        const emailInput = document.querySelector('input[type="email"], input[placeholder="person@example.com"]');
        if (emailInput && data.senderEmail) {
            setReactInputValue(emailInput, data.senderEmail);
        }

        // --- Fill Date ---
        const dateInput = document.querySelector('input[placeholder*="mm"][placeholder*="dd"][placeholder*="yyyy"]');
        if (dateInput && data.date) {
            const date = new Date(data.date);
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const year = date.getFullYear();
            setReactInputValue(dateInput, `${month}/${day}/${year}`);
        }

        // --- Fill Time ---
        const timeInput = document.querySelector('input[placeholder*="--:--"]');
        if(timeInput && data.date) {
            const date = new Date(data.date);
            const timeValue = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            setReactInputValue(timeInput, timeValue);
        }

        // --- Handle the File Upload ---
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput && data.croppedFaces && data.croppedFaces.length > 0) {
            const firstFaceUrl = data.croppedFaces[0];
            const file = dataURLtoFile(firstFaceUrl, 'face.png');
            
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInput.files = dataTransfer.files;
            
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
            fileInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        console.log("Form fill completed.");
    } catch (error) {
        console.error("Error while filling the form:", error);
    }
}

// --- Script Entry Point ---
// When the script loads, check storage for autofill data.
chrome.storage.local.get('autofillData', (result) => {
    if (result.autofillData) {
        // If data exists, fill the form with it.
        fillForm(result.autofillData);
        
        // IMPORTANT: Remove the data from storage after using it to prevent
        // it from re-filling every time you visit the page.
        chrome.storage.local.remove('autofillData', () => {
            console.log("Autofill data has been used and cleared.");
        });
    } else {
        console.log("No autofill data found in storage.");
    }
});
