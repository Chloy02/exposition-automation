// autofill.js

console.log("Exposition Automator: Autofill script loaded.");

// Function to convert a data URL to a File object
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

// Listen for messages from the popup script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fill_form") {
        console.log("Received data to fill:", request.data);
        
        try {
            // Fill Email Address using the placeholder text
            const emailInput = document.querySelector('input[placeholder="person@example.com"]');
            if (emailInput) {
                const emailMatch = request.data.sender.match(/<(.+)>/);
                if (emailMatch && emailMatch[1]) {
                    emailInput.value = emailMatch[1];
                    emailInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }

            // Fill Date using the placeholder text
            const dateInput = document.querySelector('input[placeholder="mm / dd / yyyy"]');
            if (dateInput) {
                const date = new Date(request.data.date);
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const year = date.getFullYear();
                dateInput.value = `${month}/${day}/${year}`;
                dateInput.dispatchEvent(new Event('input', { bubbles: true }));
            }

             // Fill Time using the placeholder text
             const timeInput = document.querySelector('input[placeholder="--:-- --"]');
             if(timeInput) {
                const date = new Date(request.data.date);
                timeInput.value = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                timeInput.dispatchEvent(new Event('input', { bubbles: true }));
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
            sendResponse({ status: "Error: Failed to fill the form." });
        }
    }
    return true; // Keep the message channel open for the response
});

