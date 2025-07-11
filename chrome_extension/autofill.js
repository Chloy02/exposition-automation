// autofill.js

console.log("Exposition Automator: Autofill script loaded.");

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

// FIX: More robust way to set input values for modern frameworks like React
function setReactInputValue(input, value) {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
    ).set;
    nativeInputValueSetter.call(input, value);
    const event = new Event('input', { bubbles: true });
    input.dispatchEvent(event);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fill_form") {
        console.log("Received data to fill:", request.data);
        
        try {
            // Fill Email Address
            const emailInput = document.querySelector('input[placeholder="person@example.com"]');
            if (emailInput && request.data.senderEmail) {
                setReactInputValue(emailInput, request.data.senderEmail);
            }

            // Fill Date
            const dateInput = document.querySelector('input[placeholder="mm / dd / yyyy"]');
            if (dateInput && request.data.date) {
                const date = new Date(request.data.date);
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const year = date.getFullYear();
                setReactInputValue(dateInput, `${month}/${day}/${year}`);
            }

             // Fill Time
             const timeInput = document.querySelector('input[placeholder="--:-- --"]');
             if(timeInput && request.data.date) {
                const date = new Date(request.data.date);
                const timeValue = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                setReactInputValue(timeInput, timeValue);
             }

            // Handle the file upload
            const fileInput = document.querySelector('input[type="file"]');
            if (fileInput && request.data.croppedFaces && request.data.croppedFaces.length > 0) {
                const firstFaceUrl = request.data.croppedFaces[0];
                const file = dataURLtoFile(firstFaceUrl, 'face.png');
                
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                fileInput.files = dataTransfer.files;
                
                fileInput.dispatchEvent(new Event('change', { bubbles: true }));
            }

            sendResponse({ status: "Form fill attempted successfully!" });

        } catch (error) {
            console.error("Error filling form:", error);
            sendResponse({ status: `Error: Failed to fill the form. ${error.message}` });
        }
    }
    return true;
});

