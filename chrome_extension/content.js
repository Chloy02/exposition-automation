// content.js

async function extractEmailData() {
    const emailContainer = document.querySelector('div.h7');
    if (!emailContainer) return null;

    const senderElement = emailContainer.querySelector('.gD');
    const senderEmail = senderElement ? senderElement.getAttribute('email') : 'N/A';
    const senderName = senderElement ? senderElement.innerText.trim() : 'N/A';
    const subjectElement = emailContainer.querySelector('.hP');
    const subject = subjectElement ? subjectElement.innerText.trim() : 'N/A';
    const dateElement = emailContainer.querySelector('.g3');
    const date = dateElement ? dateElement.getAttribute('title') : 'N/A';

    const imageUrls = [];
    const seenUrls = new Set();
    emailContainer.querySelectorAll('img').forEach(img => {
        if (img.src && img.src.includes('view=fimg') && img.naturalWidth > 50 && !seenUrls.has(img.src)) {
            imageUrls.push(img.src);
            seenUrls.add(img.src);
        }
    });

    const imagePromises = imageUrls.map(url =>
        fetch(url)
            .then(response => response.blob())
            .then(blob => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            }))
            .catch(error => null)
    );

    const imageDataUrls = (await Promise.all(imagePromises)).filter(Boolean);

    return {
        senderName,
        senderEmail,
        date,
        subject,
        images: imageDataUrls,
        id: `email_${Date.now()}`
    };
}

extractEmailData();

