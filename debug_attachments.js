// Debug script to help identify Gmail attachment structure
// Run this in the browser console while viewing an email with attachments

function debugAttachments() {
    console.log('=== DEBUG: Gmail Attachment Detection ===');
    
    const emailContainer = document.querySelector('div.h7');
    if (!emailContainer) {
        console.log('❌ No email container found (div.h7)');
        return;
    }
    console.log('✅ Found email container:', emailContainer);
    
    // Look for all links in the email
    const allLinks = emailContainer.querySelectorAll('a[href]');
    console.log(`📎 Found ${allLinks.length} total links in email`);
    
    const fullImageUrls = [];
    const previewImageUrls = [];
    
    allLinks.forEach((link, index) => {
        const href = link.href;
        const text = link.textContent.trim();
        const parentText = link.closest('span')?.textContent || '';
        
        // Check if it looks like an attachment
        if (href.includes('attachment') || 
            href.includes('download_url') || 
            href.includes('view=att') ||
            href.includes('disp=attd') ||
            (href.includes('&th=') && href.includes('&attid='))) {
            
            const isFullImage = href.includes('disp=attd') || 
                              href.includes('download_url') || 
                              (!href.includes('view=fimg') && href.includes('view=att'));
            
            const isImageLike = parentText.toLowerCase().includes('image/') || 
                               text.match(/\.(jpg|jpeg|png|gif|webp|heif|heic)/i) ||
                               href.includes('image/');
            
            if (isImageLike) {
                if (isFullImage) {
                    fullImageUrls.push(href);
                    console.log(`🖼️ FULL IMAGE ${fullImageUrls.length}:`, {
                        href: href,
                        text: text,
                        parentText: parentText,
                        linkElement: link
                    });
                } else {
                    previewImageUrls.push(href);
                    console.log(`🔍 PREVIEW IMAGE ${previewImageUrls.length}:`, {
                        href: href,
                        text: text,
                        parentText: parentText,
                        linkElement: link
                    });
                }
            }
        }
    });
    
    // Also check for inline images
    const inlineImages = emailContainer.querySelectorAll('img');
    console.log(`�️ Found ${inlineImages.length} inline images`);
    
    inlineImages.forEach((img, index) => {
        if (img.src && img.src.includes('view=fimg') && img.naturalWidth > 50) {
            console.log(`� Inline Image ${index + 1}:`, {
                src: img.src,
                dimensions: `${img.naturalWidth}x${img.naturalHeight}`,
                element: img
            });
        }
    });
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Full Images: ${fullImageUrls.length}`);
    console.log(`   Preview Images: ${previewImageUrls.length}`);
    console.log(`   Selection Logic: ${fullImageUrls.length > 0 ? 'Will use FULL images' : 'Will use PREVIEW images'}`);
    console.log(`   Final Count: ${fullImageUrls.length > 0 ? fullImageUrls.length : previewImageUrls.length}`);
    
    // Look for attachment containers
    const attachmentContainers = emailContainer.querySelectorAll('[role="listitem"], .aZo, .aQH, [data-tooltip]');
    console.log(`📋 Found ${attachmentContainers.length} potential attachment containers`);
    
    attachmentContainers.forEach((container, index) => {
        const links = container.querySelectorAll('a[href]');
        if (links.length > 0) {
            console.log(`📦 Container ${index + 1}:`, {
                element: container,
                text: container.textContent.trim(),
                links: Array.from(links).map(l => l.href)
            });
        }
    });
    
    console.log('=== END DEBUG ===');
}

// Run the debug function
debugAttachments();
