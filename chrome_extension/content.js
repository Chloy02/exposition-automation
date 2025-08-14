// content.js

// This is the function that will be injected into the Gmail page.
async function extractEmailData() {
    console.log('Starting email data extraction...');
    
    // Helper function to convert an image URL to a Data URI
    const toDataURL = url => {
        console.log('Attempting to fetch image from:', url);
        return fetch(url, {
            method: 'GET',
            credentials: 'include', // Include cookies for authenticated requests
            headers: {
                'Accept': 'image/*,*/*;q=0.8'
            }
        })
        .then(response => {
            console.log('Fetch response status:', response.status, 'for URL:', url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            // Check if the response is actually an image
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.startsWith('image/')) {
                console.warn('Response is not an image, content-type:', contentType);
                // Try to proceed anyway, some servers don't set correct content-type
            }
            
            return response.blob();
        })
        .then(blob => {
            console.log('Successfully fetched blob, size:', blob.size, 'type:', blob.type);
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    console.log('Successfully converted to data URL');
                    resolve(reader.result);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        })
        .catch(error => {
            console.error(`Failed to fetch and convert image: ${url}`, error);
            return null; // Return null if an image fails to load
        });
    };

    // Find the main container for the open email
    const emailContainer = document.querySelector('div.h7');
    if (!emailContainer) {
        console.log('No email container found (div.h7)');
        return null;
    }
    console.log('Found email container:', emailContainer);

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
    
    // Look for image attachments in <a> tags with href attributes
    // Gmail attachments are typically in spans with specific classes or data attributes
    emailContainer.querySelectorAll('a[href]').forEach(link => {
        const href = link.href;
        // Check if the link is an image attachment download link
        if (href && 
            (href.includes('attachment') || 
             href.includes('download_url') || 
             href.includes('view=att') ||
             href.includes('disp=attd') ||
             href.includes('&th=') && href.includes('&attid=')) &&
            !seenUrls.has(href)) {
            
            // Check if it's an image file by looking at various indicators
            const linkText = link.textContent.toLowerCase();
            const parentText = link.closest('span[role="listitem"]')?.textContent.toLowerCase() || '';
            const isImageAttachment = 
                href.includes('image/') || 
                linkText.match(/\.(jpg|jpeg|png|gif|webp|heif|heic|bmp|tiff|svg)$/i) ||
                parentText.includes('image/') ||
                parentText.includes('jpg') ||
                parentText.includes('jpeg') ||
                parentText.includes('png') ||
                parentText.includes('gif') ||
                parentText.includes('webp') ||
                parentText.includes('heif') ||
                parentText.includes('heic') ||
                // Look for attachment containers that mention image types
                link.closest('[data-tooltip*="image"]') ||
                link.closest('[aria-label*="image"]');
            
            if (isImageAttachment) {
                imageUrls.push(href);
                seenUrls.add(href);
                console.log('Found image attachment:', href);
                console.log('Link text:', linkText, 'Parent text:', parentText);
            }
        }
    });
    
    // Also look specifically for attachment download links with common patterns
    emailContainer.querySelectorAll('a[href*="view=att"], a[href*="disp=attd"], a[href*="download_url"]').forEach(link => {
        const href = link.href;
        if (href && !seenUrls.has(href)) {
            // Check if this looks like an image attachment
            const linkContext = link.closest('span')?.textContent || link.textContent || '';
            if (linkContext.toLowerCase().includes('image/') || 
                linkContext.match(/\.(jpg|jpeg|png|gif|webp|heif|heic)/i)) {
                imageUrls.push(href);
                seenUrls.add(href);
                console.log('Found attachment link:', href);
                console.log('Context:', linkContext);
            }
        }
    });
    
    // Also check for inline images (keeping the original logic as backup)
    emailContainer.querySelectorAll('img').forEach(img => {
        if (img.src && img.src.includes('view=fimg') && img.naturalWidth > 50 && !seenUrls.has(img.src)) {
            imageUrls.push(img.src);
            seenUrls.add(img.src);
            console.log('Found inline image:', img.src);
        }
    });

    // Use Promise.all to fetch and convert all images concurrently
    console.log('Found', imageUrls.length, 'potential image URLs:', imageUrls);
    const imageDataUrls = (await Promise.all(imageUrls.map(toDataURL))).filter(Boolean);
    console.log('Successfully converted', imageDataUrls.length, 'images to data URLs');

    const result = {
        senderEmail,
        date,
        subject,
        images: imageDataUrls, // This now contains Data URIs, not URLs
        id: `email_${Date.now()}`
    };
    
    console.log('Email extraction completed:', {
        senderEmail,
        subject,
        imageCount: imageDataUrls.length,
        id: result.id
    });

    return result;
}

// The script returns the result of the function call, which executeScript will capture.
extractEmailData();
