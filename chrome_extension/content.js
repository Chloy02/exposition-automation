// content.js

// This function is executed in the context of the Gmail page
// to extract information from the currently opened email.
function extractEmailData() {
    // NOTE: These selectors are based on Gmail's current HTML structure
    // and may need to be updated if Gmail changes its layout.

    // Find the main container for the opened email view
    const emailContainer = document.querySelector('.h7');
    if (!emailContainer) {
        console.log("Could not find the main email container.");
        return null;
    }

    // Extract Sender's Name and Email
    const senderElement = emailContainer.querySelector('.gD');
    const senderName = senderElement ? senderElement.innerText.trim() : 'N/A';
    const senderEmail = senderElement ? senderElement.getAttribute('email') : 'N/A';

    // Extract Subject
    const subjectElement = emailContainer.querySelector('.hP');
    const subject = subjectElement ? subjectElement.innerText.trim() : 'N/A';

    // Extract Date and Time
    const dateElement = emailContainer.querySelector('.g3');
    const date = dateElement ? dateElement.getAttribute('title') : 'N/A';

    // Extract Image URLs from attachments
    const images = [];
    const attachmentElements = emailContainer.querySelectorAll('.aZo'); // Selector for attachment thumbnails
    attachmentElements.forEach(el => {
        // The background-image style contains the URL of the thumbnail
        const bgImage = el.style.backgroundImage;
        if (bgImage && bgImage.includes('url("')) {
            // Extract the URL from the 'url("...")' string
            const url = bgImage.split('url("')[1].split('")')[0];
            // Gmail attachment URLs often need 's512' or similar changed for full size
            // For now, we'll take the thumbnail URL as it's readily available
            images.push(url);
        }
    });

    // Also look for inline images in the email body
    const inlineImageElements = emailContainer.querySelectorAll('.a3s img');
    inlineImageElements.forEach(img => {
        // Exclude small images that are likely icons or signature fluff
        if (img.src && !img.src.startsWith('data:') && img.width > 50 && img.height > 50) {
            images.push(img.src);
        }
    });


    return {
        sender: `${senderName} <${senderEmail}>`,
        date: date,
        subject: subject,
        images: images,
        id: `email_${Date.now()}` // Unique ID for this extraction
    };
}

// This is the entry point when the script is executed by the popup.
// We call the function and it implicitly returns the result.
extractEmailData();

