// background.js

// This script runs in the background.
// For this version, it doesn't need to do much, but it's required by the manifest.

// Listen for the extension being installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log('Exposition Email Automator extension installed.');
});

// In the future, you could add listeners for messages between
// the popup and content scripts here if more complex communication is needed.
// For example:
// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   console.log("Message received in background:", request);
//   // Process message and optionally send a response
//   sendResponse({ status: "Message received" });
//   return true; // Indicates you wish to send a response asynchronously
// });

