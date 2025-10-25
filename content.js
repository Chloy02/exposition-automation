// content.js

// This is the function that will be injected into the Gmail page.
async function extractEmailData() {
  console.log("Starting email data extraction...");

  // Helper function to convert an image URL to a Data URI with compression
  const toDataURL = (url) => {
    console.log("Attempting to fetch image from:", url);
    return fetch(url, {
      method: "GET",
      credentials: "include", // Include cookies for authenticated requests
      headers: {
        Accept: "image/*,*/*;q=0.8",
      },
    })
      .then((response) => {
        console.log("Fetch response status:", response.status, "for URL:", url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Check if the response is actually an image
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.startsWith("image/")) {
          console.warn("Response is not an image, content-type:", contentType);
          // Try to proceed anyway, some servers don't set correct content-type
        }

        return response.blob();
      })
      .then((blob) => {
        console.log(
          "Successfully fetched blob, size:",
          blob.size,
          "type:",
          blob.type,
        );
        return new Promise((resolve, reject) => {
          // Create an image element to load the blob
          const img = new Image();
          const objectUrl = URL.createObjectURL(blob);

          img.onload = () => {
            // Create canvas to compress the image
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;

            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);

            // Convert to JPEG with 60% quality for storage savings
            const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.6);

            const originalSize = (blob.size / 1024).toFixed(2);
            const compressedSize = (
              (compressedDataUrl.length * 0.75) /
              1024
            ).toFixed(2);
            console.log(
              `Image compressed: ${originalSize}KB → ${compressedSize}KB (60% quality)`,
            );

            // Clean up
            URL.revokeObjectURL(objectUrl);

            resolve(compressedDataUrl);
          };

          img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Failed to load image for compression"));
          };

          img.src = objectUrl;
        });
      })
      .catch((error) => {
        console.error(`Failed to fetch and convert image: ${url}`, error);
        return null; // Return null if an image fails to load
      });
  };

  // Find the main container for the open email
  const emailContainer = document.querySelector("div.h7");
  if (!emailContainer) {
    console.log("No email container found (div.h7)");
    return null;
  }
  console.log("Found email container:", emailContainer);

  // --- Extract Metadata ---
  const senderElement = emailContainer.querySelector(".gD");
  const dateElement = emailContainer.querySelector(".g3");

  const senderEmail = senderElement
    ? senderElement.getAttribute("email")
    : "N/A";
  // Use the 'title' attribute for a more complete date string
  const date = dateElement
    ? dateElement.getAttribute("title")
    : new Date().toISOString();

  // Calculate adjusted time (received time - 25 minutes)
  let adjustedTime = null;
  try {
    const receivedDate = new Date(date);
    const adjustedDate = new Date(receivedDate.getTime() - 25 * 60 * 1000); // Subtract 25 minutes

    // Safety check: If adjusted time goes before midnight, set to midnight
    const midnight = new Date(receivedDate);
    midnight.setHours(0, 0, 0, 0);

    if (adjustedDate < midnight) {
      console.log(
        `⚠️ Adjusted time would be before midnight (${adjustedDate.toLocaleTimeString()}), setting to 12:00 AM`,
      );
      adjustedTime = midnight.getTime();
    } else {
      adjustedTime = adjustedDate.getTime();
    }

    const receivedTime = receivedDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const adjustedTimeFormatted = new Date(adjustedTime).toLocaleTimeString(
      "en-US",
      { hour: "2-digit", minute: "2-digit", hour12: true },
    );
    console.log(
      `📅 Time adjustment: ${receivedTime} → ${adjustedTimeFormatted} (25 min earlier)`,
    );
  } catch (error) {
    console.error("Error calculating adjusted time:", error);
    adjustedTime = new Date(date).getTime(); // Fallback to original
  }

  // --- Extract and Convert Images ---
  const fullImageUrls = [];
  const previewImageUrls = [];
  const seenUrls = new Set();

  // Look for image attachments in <a> tags with href attributes
  // Gmail attachments are typically in spans with specific classes or data attributes
  emailContainer.querySelectorAll("a[href]").forEach((link) => {
    const href = link.href;
    // Check if the link is an image attachment download link
    if (
      href &&
      (href.includes("attachment") ||
        href.includes("download_url") ||
        href.includes("view=att") ||
        href.includes("disp=attd") ||
        (href.includes("&th=") && href.includes("&attid="))) &&
      !seenUrls.has(href)
    ) {
      // Check if it's an image file by looking at various indicators
      const linkText = link.textContent.toLowerCase();
      const parentText =
        link.closest('span[role="listitem"]')?.textContent.toLowerCase() || "";
      const isImageAttachment =
        href.includes("image/") ||
        linkText.match(/\.(jpg|jpeg|png|gif|webp|heif|heic|bmp|tiff|svg)$/i) ||
        parentText.includes("image/") ||
        parentText.includes("jpg") ||
        parentText.includes("jpeg") ||
        parentText.includes("png") ||
        parentText.includes("gif") ||
        parentText.includes("webp") ||
        parentText.includes("heif") ||
        parentText.includes("heic") ||
        // Look for attachment containers that mention image types
        link.closest('[data-tooltip*="image"]') ||
        link.closest('[aria-label*="image"]');

      if (isImageAttachment) {
        // Determine if this is a full image or preview based on URL patterns
        const isFullImage =
          href.includes("disp=attd") ||
          href.includes("download_url") ||
          (!href.includes("view=fimg") && href.includes("view=att"));

        if (isFullImage) {
          fullImageUrls.push(href);
          console.log("Found FULL image attachment:", href);
        } else {
          previewImageUrls.push(href);
          console.log("Found PREVIEW image attachment:", href);
        }
        seenUrls.add(href);
        console.log("Link text:", linkText, "Parent text:", parentText);
      }
    }
  });

  // Also look specifically for attachment download links with common patterns
  emailContainer
    .querySelectorAll(
      'a[href*="view=att"], a[href*="disp=attd"], a[href*="download_url"]',
    )
    .forEach((link) => {
      const href = link.href;
      if (href && !seenUrls.has(href)) {
        // Check if this looks like an image attachment
        const linkContext =
          link.closest("span")?.textContent || link.textContent || "";
        if (
          linkContext.toLowerCase().includes("image/") ||
          linkContext.match(/\.(jpg|jpeg|png|gif|webp|heif|heic)/i)
        ) {
          // Categorize as full or preview image
          const isFullImage =
            href.includes("disp=attd") ||
            href.includes("download_url") ||
            (!href.includes("view=fimg") && href.includes("view=att"));

          if (isFullImage) {
            fullImageUrls.push(href);
            console.log("Found FULL attachment link:", href);
          } else {
            previewImageUrls.push(href);
            console.log("Found PREVIEW attachment link:", href);
          }
          seenUrls.add(href);
          console.log("Context:", linkContext);
        }
      }
    });

  // Check for inline images (these are usually previews)
  emailContainer.querySelectorAll("img").forEach((img) => {
    if (
      img.src &&
      img.src.includes("view=fimg") &&
      img.naturalWidth > 50 &&
      !seenUrls.has(img.src)
    ) {
      previewImageUrls.push(img.src);
      seenUrls.add(img.src);
      console.log("Found inline preview image:", img.src);
    }
  });

  // Prioritize full images over previews
  const imageUrls = fullImageUrls.length > 0 ? fullImageUrls : previewImageUrls;
  console.log(
    `Image selection: ${fullImageUrls.length} full images, ${previewImageUrls.length} previews. Using: ${imageUrls.length} images.`,
  );

  // Use Promise.all to fetch and convert all images concurrently
  console.log("Found", imageUrls.length, "potential image URLs:", imageUrls);
  const imageDataUrls = (await Promise.all(imageUrls.map(toDataURL))).filter(
    Boolean,
  );
  console.log(
    "Successfully converted",
    imageDataUrls.length,
    "images to data URLs",
  );

  const result = {
    senderEmail,
    date,
    adjustedTime, // Timestamp: received time - 25 minutes
    userEditedTime: null, // User can edit this later
    images: imageDataUrls, // This now contains Data URIs, not URLs
    id: `email_${Date.now()}`,
  };

  console.log("Email extraction completed:", {
    senderEmail,
    imageCount: imageDataUrls.length,
    id: result.id,
  });

  return result;
}

// The script returns the result of the function call, which executeScript will capture.
extractEmailData();
