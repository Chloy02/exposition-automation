// popup.js (Updated for storage-based autofill)

document.addEventListener("DOMContentLoaded", () => {
  const extractBtn = document.getElementById("extractBtn");
  const debugBtn = document.getElementById("debugBtn");
  const testModelsBtn = document.getElementById("testModelsBtn");
  const clearBtn = document.getElementById("clearBtn");
  const statusDiv = document.getElementById("status");
  const resultsTableBody = document.querySelector("#resultsTable tbody");

  loadAndRenderData();

  extractBtn.addEventListener("click", () => {
    statusDiv.textContent = "Extracting data from Gmail...";
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url.includes("mail.google.com")) {
        chrome.scripting.executeScript(
          {
            target: { tabId: tabs[0].id },
            files: ["content.js"],
          },
          (injectionResults) => {
            if (
              chrome.runtime.lastError ||
              !injectionResults ||
              !injectionResults[0]
            ) {
              statusDiv.textContent =
                "Error: Could not extract data. Is a Gmail email open?";
              console.error(
                "Injection error:",
                chrome.runtime.lastError || "No results from injection.",
              );
              return;
            }
            if (injectionResults[0].result === null) {
              statusDiv.textContent =
                "Could not find a valid email container on the page. Make sure an email is fully opened.";
              return;
            }
            const result = injectionResults[0].result;
            statusDiv.textContent = `Found email with ${result.images.length} image(s). Processing...`;
            handleExtractionResult(result);
          },
        );
      } else {
        statusDiv.textContent = "Please open an email in Gmail first.";
      }
    });
  });

  debugBtn.addEventListener("click", () => {
    statusDiv.textContent = "Running debug script...";
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url.includes("mail.google.com")) {
        chrome.scripting.executeScript(
          {
            target: { tabId: tabs[0].id },
            files: ["debug_attachments.js"],
          },
          () => {
            if (chrome.runtime.lastError) {
              statusDiv.textContent = "Debug failed. Check console for errors.";
              console.error("Debug error:", chrome.runtime.lastError);
            } else {
              statusDiv.textContent =
                "Debug complete! Check browser console for detailed output.";
            }
          },
        );
      } else {
        statusDiv.textContent = "Please open an email in Gmail first.";
      }
    });
  });

  testModelsBtn.addEventListener("click", async () => {
    statusDiv.textContent = "Testing face detection models...";
    try {
      const response = await chrome.runtime.sendMessage({
        action: "testModels",
      });

      if (response.success) {
        statusDiv.textContent = "✅ Face detection models loaded successfully!";
      } else {
        statusDiv.textContent = `❌ Model loading failed: ${response.error || "Unknown error"}`;
      }
    } catch (error) {
      console.error("Model test error:", error);
      statusDiv.textContent =
        "❌ Model test failed. Check console for details.";
    }
  });

  clearBtn.addEventListener("click", () => {
    chrome.storage.local.set({ emails: [] }, () => {
      resultsTableBody.innerHTML = "";
      statusDiv.textContent = "Stored data has been cleared.";
    });
  });

  function handleExtractionResult(extractedData) {
    statusDiv.textContent = "Data extracted! Processing images...";
    saveAndProcessData(extractedData);
  }

  async function saveAndProcessData(newData) {
    const data = await chrome.storage.local.get({ emails: [] });
    let emails = data.emails || [];

    newData.croppedFaces = [];
    const existingEmailIndex = emails.findIndex((e) => e.id === newData.id);
    if (existingEmailIndex > -1) {
      emails[existingEmailIndex] = newData;
    } else {
      emails.push(newData);
    }

    await chrome.storage.local.set({ emails });
    loadAndRenderData();

    if (newData.images && newData.images.length > 0) {
      statusDiv.textContent =
        "Detecting faces using Haar Cascade... (this may take a moment)";
      try {
        const response = await chrome.runtime.sendMessage({
          action: "processImages",
          imageDataUrls: newData.images,
        });

        if (response.success) {
          const emailIndex = emails.findIndex((e) => e.id === newData.id);
          if (emailIndex > -1) {
            emails[emailIndex].croppedFaces = response.croppedFaces;
          }

          // Check if any faces were found
          if (response.croppedFaces.length > 0) {
            statusDiv.textContent = `✅ Processing complete. Found ${response.croppedFaces.length} face(s).`;
          } else {
            statusDiv.textContent =
              "⚠️ No faces detected in the images. Please check if images contain visible faces.";
            statusDiv.style.color = "#ff6b00"; // Orange warning color
            setTimeout(() => {
              statusDiv.style.color = ""; // Reset color after 5 seconds
            }, 5000);
          }
        } else {
          throw new Error(
            response.error || "Unknown error in background script.",
          );
        }
      } catch (error) {
        console.error("Face detection failed:", error);
        statusDiv.textContent =
          "❌ Error: Face detection failed. Check background logs.";
        statusDiv.style.color = "#d32f2f"; // Red error color
        setTimeout(() => {
          statusDiv.style.color = ""; // Reset color after 5 seconds
        }, 5000);
      }

      await chrome.storage.local.set({ emails });
      loadAndRenderData();
    } else {
      statusDiv.textContent = "Extraction complete. No images to process.";
    }
  }

  function loadAndRenderData() {
    chrome.storage.local.get({ emails: [] }, (data) => {
      resultsTableBody.innerHTML = "";
      const emails = data.emails || [];
      if (emails.length > 0) {
        emails.forEach((email) => addRowToTable(email));
        statusDiv.textContent = `Loaded ${emails.length} stored entries.`;
      } else {
        statusDiv.textContent = "Ready to extract an email.";
      }
    });
  }

  function addRowToTable(emailData) {
    const row = document.createElement("tr");
    const sender = emailData.senderEmail || "N/A";
    const date = emailData.date
      ? new Date(emailData.date).toLocaleString()
      : "N/A";
    const subject = emailData.subject || "N/A";

    row.innerHTML = `
            <td>${sender}</td>
            <td>${date}</td>
            <td>${subject}</td>
            <td class="image-cell"><div class="image-container original-images"></div></td>
            <td class="image-cell"><div class="image-container cropped-faces"></div></td>
            <td><button class="button-primary fill-form-btn" data-email-id="${emailData.id}">Auto-fill</button></td>
        `;

    const originalImagesContainer = row.querySelector(".original-images");
    if (emailData.images && emailData.images.length > 0) {
      emailData.images.forEach((dataUrl, index) => {
        const img = document.createElement("img");
        img.src = dataUrl;
        img.draggable = true;
        img.title = `Drag to drop this original image (Image ${index + 1})`;

        // Enable drag-and-drop functionality for original images too
        img.addEventListener("dragstart", (e) => {
          e.dataTransfer.effectAllowed = "copy";
          e.dataTransfer.setData("text/uri-list", dataUrl);
          e.dataTransfer.setData("text/plain", dataUrl);
          console.log(`Started dragging original image ${index + 1}`);
        });

        originalImagesContainer.appendChild(img);
      });
    } else {
      originalImagesContainer.textContent = "none";
    }

    const croppedFacesContainer = row.querySelector(".cropped-faces");
    if (emailData.croppedFaces && emailData.croppedFaces.length > 0) {
      emailData.croppedFaces.forEach((faceDataUrl, index) => {
        const img = document.createElement("img");
        img.src = faceDataUrl;
        img.draggable = true;
        img.title = `Drag to drop this cropped face (Face ${index + 1})`;

        // Enable drag-and-drop functionality
        img.addEventListener("dragstart", (e) => {
          e.dataTransfer.effectAllowed = "copy";
          e.dataTransfer.setData("text/uri-list", faceDataUrl);
          e.dataTransfer.setData("text/plain", faceDataUrl);
          console.log(`Started dragging face ${index + 1}`);
        });

        croppedFacesContainer.appendChild(img);
      });
    } else {
      croppedFacesContainer.textContent = "...";
    }
    resultsTableBody.prepend(row);
  }

  // Use a single event listener on the table body for all auto-fill buttons
  resultsTableBody.addEventListener("click", async (event) => {
    if (event.target && event.target.classList.contains("fill-form-btn")) {
      const emailId = event.target.dataset.emailId;
      const { emails } = await chrome.storage.local.get("emails");
      const emailData = emails.find((e) => e.id === emailId);

      if (emailData) {
        // Check if we're currently on the target website
        chrome.tabs.query(
          { active: true, currentWindow: true },
          async (tabs) => {
            if (tabs[0] && tabs[0].url.includes("face-recognise.vercel.app")) {
              // We're on the target site, trigger autofill
              statusDiv.textContent = "Auto-filling form...";

              try {
                // Try the new direct autofill method first
                await chrome.scripting.executeScript({
                  target: { tabId: tabs[0].id },
                  func: autofillForm,
                  args: [emailData],
                });
                statusDiv.textContent = "Form auto-filled successfully!";
              } catch (error) {
                console.error(
                  "Direct autofill failed, trying storage method:",
                  error,
                );
                // Fallback to storage-based autofill
                try {
                  await chrome.storage.local.set({ autofillData: emailData });
                  await chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: () => {
                      // Trigger the existing autofill.js logic
                      chrome.storage.local.get("autofillData", (result) => {
                        if (result.autofillData && window.fillForm) {
                          setTimeout(
                            () => window.fillForm(result.autofillData),
                            500,
                          );
                          chrome.storage.local.remove("autofillData");
                        }
                      });
                    },
                  });
                  statusDiv.textContent =
                    "Form auto-filled successfully (fallback method)!";
                } catch (fallbackError) {
                  console.error(
                    "Fallback autofill also failed:",
                    fallbackError,
                  );
                  statusDiv.textContent =
                    "Autofill failed. Check console for errors.";
                }
              }
            } else {
              // Save data and inform user to navigate to the site
              await chrome.storage.local.set({ autofillData: emailData });
              statusDiv.textContent =
                "Data saved! Navigate to face-recognise.vercel.app/add-image and click Auto-fill again.";
            }
          },
        );
      }
    }
  });
});

// Autofill function to be injected into the target website
function autofillForm(emailData) {
  console.log("Starting autofill with data:", emailData);

  // Convert Data URI to File object
  function dataURLtoFile(dataurl, filename) {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }

  // Wait for React components to load
  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      function check() {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
        } else if (Date.now() - startTime > timeout) {
          reject(
            new Error(`Element ${selector} not found within ${timeout}ms`),
          );
        } else {
          setTimeout(check, 100);
        }
      }
      check();
    });
  }

  // Function to simulate user input for React components
  function simulateInput(element, value) {
    // Store original value
    const originalValue = element.value;

    // Clear and focus
    element.value = "";
    element.focus();

    // Use React's input value setter
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    ).set;
    nativeInputValueSetter.call(element, value);

    // Trigger React events
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));

    // Trigger additional events for React forms
    element.dispatchEvent(new Event("blur", { bubbles: true }));

    console.log(
      `Filled field with selector, old value: "${originalValue}", new value: "${value}"`,
    );
  }

  // Function to format date - returns YYYY-MM-DD for type="date" or MM/DD/YYYY for text inputs
  function formatDate(dateString, inputType = "date") {
    try {
      const date = new Date(dateString);
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const year = date.getFullYear();

      // HTML5 date inputs require YYYY-MM-DD format
      if (inputType === "date") {
        return `${year}-${month}-${day}`;
      }
      // Text inputs use MM/DD/YYYY format
      return `${month}/${day}/${year}`;
    } catch (error) {
      console.error("Date formatting error:", error);
      const today = new Date();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      const year = today.getFullYear();

      if (inputType === "date") {
        return `${year}-${month}-${day}`;
      }
      return `${month}/${day}/${year}`;
    }
  }

  // Function to format time for --:-- format
  function formatTime(dateString) {
    try {
      const date = new Date(dateString);
      let hours = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      const formattedHours = String(hours).padStart(2, "0");
      return `${formattedHours}:${minutes} ${ampm}`;
    } catch (error) {
      console.error("Time formatting error:", error);
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      const formattedHours = String(hours).padStart(2, "0");
      return `${formattedHours}:${minutes} ${ampm}`;
    }
  }

  // Start autofill process
  setTimeout(async () => {
    try {
      console.log("Starting form fill process...");

      // Fill email field - try multiple selectors
      console.log("Looking for email field...");
      const emailSelectors = [
        'input[type="email"]',
        'input[placeholder*="person@example.com"]',
        'input[placeholder*="email" i]',
        'input[name*="email" i]',
        'input[id*="email" i]',
      ];

      let emailField = null;
      for (const selector of emailSelectors) {
        try {
          emailField = await waitForElement(selector, 2000);
          console.log(`Found email field with selector: ${selector}`);
          break;
        } catch (e) {
          console.log(`Email selector failed: ${selector}`);
        }
      }

      if (
        emailField &&
        emailData.senderEmail &&
        emailData.senderEmail !== "N/A"
      ) {
        simulateInput(emailField, emailData.senderEmail);
        console.log("Email filled:", emailData.senderEmail);
      } else {
        console.warn("Email field not found or no email data");
      }

      // Fill date field - try multiple selectors
      console.log("Looking for date field...");
      const dateSelectors = [
        'input[placeholder*="mm/dd/yyyy" i]',
        'input[type="date"]',
        'input[placeholder*="date" i]',
        'input[name*="date" i]',
        'input[id*="date" i]',
      ];

      let dateField = null;
      for (const selector of dateSelectors) {
        try {
          dateField = await waitForElement(selector, 2000);
          console.log(`Found date field with selector: ${selector}`);
          break;
        } catch (e) {
          console.log(`Date selector failed: ${selector}`);
        }
      }

      if (dateField && emailData.date) {
        // Detect input type and format accordingly
        const inputType = dateField.getAttribute("type") || "text";
        const formattedDate = formatDate(emailData.date, inputType);
        simulateInput(dateField, formattedDate);
        console.log(`Date filled (type=${inputType}):`, formattedDate);
      } else {
        console.warn("Date field not found or no date data");
        console.log("Available date data:", emailData.date);
      }

      // Fill time field - try multiple selectors
      console.log("Looking for time field...");
      const timeSelectors = [
        'input[placeholder*="--:--"]',
        'input[type="time"]',
        'input[placeholder*="time" i]',
        'input[name*="time" i]',
        'input[id*="time" i]',
      ];

      let timeField = null;
      for (const selector of timeSelectors) {
        try {
          timeField = await waitForElement(selector, 2000);
          console.log(`Found time field with selector: ${selector}`);
          break;
        } catch (e) {
          console.log(`Time selector failed: ${selector}`);
        }
      }

      if (timeField && emailData.date) {
        const formattedTime = formatTime(emailData.date);
        simulateInput(timeField, formattedTime);
        console.log("Time filled:", formattedTime);
      } else {
        console.warn("Time field not found or no time data");
      }

      // Handle image upload area - Upload ALL cropped faces
      console.log("Looking for image upload area...");
      const uploadSelectors = [
        'input[id="image-upload"]',
        'input[type="file"]',
        'input[id*="upload" i]',
        '[class*="upload" i]',
        '[data-testid*="upload" i]',
      ];

      let fileInput = null;
      for (const selector of uploadSelectors) {
        try {
          fileInput = await waitForElement(selector, 2000);
          console.log(`Found file input with selector: ${selector}`);
          break;
        } catch (e) {
          console.log(`Upload selector failed: ${selector}`);
        }
      }

      if (
        fileInput &&
        emailData.croppedFaces &&
        emailData.croppedFaces.length > 0
      ) {
        try {
          console.log(
            `Uploading ${emailData.croppedFaces.length} cropped face(s)...`,
          );

          const dataTransfer = new DataTransfer();

          // Add ALL cropped faces to the file input
          emailData.croppedFaces.forEach((faceDataUrl, index) => {
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

          // Set files to input
          fileInput.files = dataTransfer.files;

          // Trigger React events - multiple approaches for compatibility
          fileInput.focus();
          fileInput.dispatchEvent(new Event("change", { bubbles: true }));
          fileInput.dispatchEvent(new Event("input", { bubbles: true }));
          fileInput.dispatchEvent(new Event("blur", { bubbles: true }));

          console.log(
            `✅ Successfully uploaded ${dataTransfer.files.length} face(s) to file input`,
          );
        } catch (error) {
          console.error("Error uploading files:", error);
        }
      } else {
        console.warn("File input not found or no cropped faces available");
        console.log("Available data:", {
          fileInput: !!fileInput,
          croppedFaces: emailData.croppedFaces?.length || 0,
        });
      }

      console.log("Autofill completed successfully");
    } catch (error) {
      console.error("Autofill process error:", error);
      throw error;
    }
  }, 1500); // Wait 1.5 seconds for page to fully load
}
