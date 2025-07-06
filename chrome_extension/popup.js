// Add current email to storage and update table
document.getElementById('extract').addEventListener('click', async () => {
    document.getElementById('status').innerText = "Extracting...";
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.scripting.executeScript({
        target: {tabId: tabs[0].id},
        function: extractOpenedEmail
      }, (results) => {
        if (results && results[0] && results[0].result) {
          const email = results[0].result;
          if (!email) {
            document.getElementById('status').innerText = "No email data found on this page.";
            return;
          }
          // Save to storage
          chrome.storage.local.get({emails: []}, function(data) {
            const emails = data.emails;
            emails.push(email);
            chrome.storage.local.set({emails: emails}, function() {
              document.getElementById('status').innerText = "Email added!";
              renderTable(emails);
            });
          });
        } else {
          document.getElementById('status').innerText = "Extraction failed.";
        }
      });
    });
  });
  
  // This function runs in the context of the opened Gmail email page
  function extractOpenedEmail() {
    // Sender email
    let sender = document.querySelector('span.gD')?.getAttribute('email') || "";
    // Subject
    let subject = document.querySelector('h2.hP')?.innerText || "";
    // Email body text
    let body = document.querySelector('div.a3s')?.innerText || "";
    // Try to extract date/time from body using regex (e.g., 10-12-2024, 10:15)
    let datetime = "";
    let dateMatch = body.match(/\b\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}\b/);
    let timeMatch = body.match(/\b\d{1,2}:\d{2}(?:\s?(?:AM|PM|am|pm))?\b/);
    if (dateMatch) datetime += dateMatch[0];
    if (timeMatch) datetime += (datetime ? ' ' : '') + timeMatch[0];
    // Find image URLs in the email body (inline images and attachments)
    let images = [];
    // Inline images
    document.querySelectorAll('div.a3s img').forEach(img => {
      if (img.src && !img.src.startsWith('data:')) images.push(img.src);
    });
    // Attachment images (look for links with .jpg/.png/.jpeg)
    document.querySelectorAll('div.aQH a').forEach(a => {
      if (a.href && (a.href.endsWith('.jpg') || a.href.endsWith('.png') || a.href.endsWith('.jpeg'))) {
        images.push(a.href);
      }
    });
    return { sender, subject, datetime, images };
  }

  // Clear all saved emails
  document.getElementById('clear').addEventListener('click', () => {
    chrome.storage.local.set({emails: []}, function() {
      document.getElementById('status').innerText = "All emails cleared.";
      renderTable([]);
    });
    });

  // Render table on popup open
  document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get({emails: []}, function(data) {
      renderTable(data.emails);
    });
  });

  // Render the table of saved emails
  function renderTable(emails) {
    const tbody = document.getElementById('emailTable').querySelector('tbody');
    tbody.innerHTML = '';
    emails.forEach(email => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${email.sender}</td>
        <td>${email.subject}</td>
        <td>${email.datetime}</td>
        <td>${email.images.map(img => `<a href='${img}' target='_blank'>img</a>`).join('<br>')}</td>
      `;
      tbody.appendChild(row);
    });
  }