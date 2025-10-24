// autofill.js (Updated to use chrome.storage)

console.log("Exposition Automator: Autofill script loaded.");

/**
 * Converts a Data URI into a File object.
 */
function dataURLtoFile(dataurl, filename) {
  let arr = dataurl.split(","),
    mime = arr[0].match(/:(.*?);/)[1],
    bstr = atob(arr[1]),
    n = bstr.length,
    u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

/**
 * Programmatically sets the value of an input field for React compatibility.
 */
function setReactInputValue(input, value) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  ).set;
  nativeInputValueSetter.call(input, value);
  const event = new Event("input", { bubbles: true });
  input.dispatchEvent(event);
}

/**
 * Waits for an element to be present in the DOM
 */
function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver((mutations, obs) => {
      const element = document.querySelector(selector);
      if (element) {
        obs.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
}

/**
 * The main function to fill the form with data.
 * @param {object} data - The email data object.
 */
async function fillForm(data) {
  console.log("Found data to auto-fill:", data);
  try {
    // Wait for the form to be fully loaded
    console.log("Waiting for form elements to load...");

    // --- Fill Email Address ---
    try {
      const emailInput = await waitForElement(
        'input[type="email"], input[placeholder="person@example.com"]',
      );
      if (emailInput && data.senderEmail) {
        setReactInputValue(emailInput, data.senderEmail);
        console.log("Email filled:", data.senderEmail);
      }
    } catch (error) {
      console.warn("Email input not found:", error.message);
    }

    // --- Fill Date ---
    try {
      const dateInput = await waitForElement(
        'input[type="date"], input[id="date"], input[id*="date" i], input[placeholder*="mm/dd/yyyy" i], input[placeholder*="date" i]',
      );
      if (dateInput && data.date) {
        const date = new Date(data.date);
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const year = date.getFullYear();

        // HTML5 date inputs (type="date") require YYYY-MM-DD format
        const inputType = dateInput.getAttribute("type") || "text";
        const formattedDate =
          inputType === "date"
            ? `${year}-${month}-${day}` // YYYY-MM-DD for type="date"
            : `${month}/${day}/${year}`; // MM/DD/YYYY for text inputs

        setReactInputValue(dateInput, formattedDate);
        console.log(`Date filled (type=${inputType}):`, formattedDate);
      }
    } catch (error) {
      console.warn("Date input not found:", error.message);
    }

    // --- Fill Time ---
    try {
      const timeInput = await waitForElement(
        'input[placeholder*="--:--"], input[type="time"], input[placeholder*="time" i]',
      );
      if (timeInput && data.date) {
        const date = new Date(data.date);
        const timeValue = date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
        setReactInputValue(timeInput, timeValue);
        console.log("Time filled:", timeValue);
      }
    } catch (error) {
      console.warn("Time input not found:", error.message);
    }

    // --- Handle the File Upload - Upload ALL cropped faces ---
    try {
      const fileInput = await waitForElement(
        'input[type="file"], input[id="image-upload"], input[id*="upload" i]',
      );
      if (fileInput && data.croppedFaces && data.croppedFaces.length > 0) {
        console.log(`Uploading ${data.croppedFaces.length} cropped face(s)...`);

        const dataTransfer = new DataTransfer();

        // Add ALL cropped faces to the file input
        data.croppedFaces.forEach((faceDataUrl, index) => {
          try {
            const file = dataURLtoFile(faceDataUrl, `face-${index + 1}.jpg`);
            dataTransfer.items.add(file);
            console.log(
              `Added face ${index + 1}: ${file.name} (${Math.round(file.size / 1024)}KB)`,
            );
          } catch (error) {
            console.error(`Failed to add face ${index + 1}:`, error);
          }
        });

        fileInput.files = dataTransfer.files;

        // Trigger React events
        fileInput.focus();
        fileInput.dispatchEvent(new Event("change", { bubbles: true }));
        fileInput.dispatchEvent(new Event("input", { bubbles: true }));
        fileInput.dispatchEvent(new Event("blur", { bubbles: true }));

        console.log(
          `✅ Successfully uploaded ${dataTransfer.files.length} face(s)`,
        );
      }
    } catch (error) {
      console.warn("File input not found:", error.message);
    }

    console.log("Form fill completed successfully.");
  } catch (error) {
    console.error("Error while filling the form:", error);
  }
}

// --- Script Entry Point ---
// Updated to not automatically trigger, only when manually called
console.log(
  "Exposition Automator: Autofill script loaded (manual trigger mode).",
);

// Make fillForm available globally for manual triggering
window.fillForm = fillForm;

// Only auto-trigger if there's autofillData AND a special flag
chrome.storage.local.get(["autofillData", "triggerAutofill"], (result) => {
  if (result.autofillData && result.triggerAutofill) {
    console.log(
      "Autofill data found with trigger flag, waiting for page to load...",
    );

    // Wait for the page to be fully loaded before attempting to fill
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        setTimeout(() => {
          fillForm(result.autofillData);
          // Clear both the data and the trigger flag
          chrome.storage.local.remove(["autofillData", "triggerAutofill"]);
        }, 1000);
      });
    } else {
      // Page is already loaded, wait a bit for React to render
      setTimeout(() => {
        fillForm(result.autofillData);
        // Clear both the data and the trigger flag
        chrome.storage.local.remove(["autofillData", "triggerAutofill"]);
      }, 1000);
    }
  } else {
    console.log("No autofill trigger found - waiting for manual activation.");
  }
});
