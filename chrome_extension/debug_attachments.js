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
            
            console.log(`🔗 Link ${index + 1}:`, {
                href: href,
                text: text,
                parentText: parentText,
                isImageLike: parentText.toLowerCase().includes('image/') || 
                           text.match(/\.(jpg|jpeg|png|gif|webp|heif|heic)/i)
            });
        }
    });
    
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
    
    // Look for specific Gmail attachment selectors
    const specificSelectors = [
        'a[href*="view=att"]',
        'a[href*="disp=attd"]', 
        'a[href*="download_url"]',
        'span[role="listitem"] a',
        '.aZo a',
        '.aQH a'
    ];
    
    specificSelectors.forEach(selector => {
        const elements = emailContainer.querySelectorAll(selector);
        if (elements.length > 0) {
            console.log(`🎯 Selector "${selector}" found ${elements.length} elements:`, elements);
        }
    });
    
    console.log('=== END DEBUG ===');
}

// Run the debug function
debugAttachments();
