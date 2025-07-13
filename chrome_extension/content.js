// content.js

// This is the function that will be injected into the Gmail page.
async function extractEmailData() {
    // Helper function to convert an image URL to a Data URI
    const toDataURL = url => fetch(url)
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok.');
            return response.blob();
        })
        .then(blob => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        }))
        .catch(error => {
            console.error(`Failed to fetch and convert image: ${url}`, error);
            return null; // Return null if an image fails to load
        });

    // Find the main container for the open email
    const emailContainer = document.querySelector('div.h7');
    if (!emailContainer) return null;

    // --- Extract Metadata ---
    const senderElement = emailContainer.querySelector('.gD');
    const subjectElement = emailContainer.querySelector('.hP');
    const dateElement = emailContainer.querySelector('.g3');

    const senderEmail = senderElement ? senderElement.getAttribute('email') : 'N/A';
    const subject = subjectElement ? subjectElement.innerText.trim() : 'N/A';
    // Use the 'title' attribute for a more complete date string
    const date = dateElement ? dateElement.getAttribute('title') : new Date().toISOString();

    // --- Extract and Convert Images ---
    const imageUrls = [];
    const seenUrls = new Set();
    // Find all images, but filter for those likely to be user content
    emailContainer.querySelectorAll('img').forEach(img => {
        if (img.src && img.src.includes('view=fimg') && img.naturalWidth > 50 && !seenUrls.has(img.src)) {
            imageUrls.push(img.src);
            seenUrls.add(img.src);
        }
    });

    // Use Promise.all to fetch and convert all images concurrently
    const imageDataUrls = (await Promise.all(imageUrls.map(toDataURL))).filter(Boolean);

    return {
        senderEmail,
        date,
        subject,
        images: imageDataUrls, // This now contains Data URIs, not URLs
        id: `email_${Date.now()}`
    };
}

// The script returns the result of the function call, which executeScript will capture.
extractEmailData();
