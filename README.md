# Exposition Email Automation 📧

> **Status:** Active Development & Functional

This project provides a browser-based solution to automate the process of handling email submissions for an exposition. It has evolved from a local Python script into a robust Chrome extension that extracts submission data from Gmail, uses machine learning to crop faces from images, and automates data entry on a target website.

---

## ✨ Core Functionality (Chrome Extension)

The extension provides a complete, in-browser workflow for handling image submissions:

* **Email Data Extraction**: When viewing an email in Gmail, the extension can be triggered to scrape key information, including:
    * Sender's Email Address
    * Date and Time of the email
    * Subject Line
    * Attached or embedded images

* **Automated Face Detection**: Using `face-api.js`, the extension automatically detects and crops faces from the extracted images.

* **Interactive UI**: A clean popup interface allows you to:
    * View all extracted data in an organized table.
    * See thumbnails of original and cropped images.
    * Copy or Save individual cropped faces with a single click.
    * Clear all stored data to start fresh.

* **Auto-fill Web Forms**: With the "Auto-fill" feature, the extension can populate a form on a target website (`https://face-recognise.vercel.app`) with the sender's email, date, time, and the primary cropped face, streamlining the data entry process.

---

## 🛠️ Setup and Installation

To get the extension running in your browser, follow these steps:

**1. Clone the Repository**

If you haven't already, get the project files on your local machine.

```bash
git clone [https://github.com/Chloy02/exposition-automation.git](https://github.com/Chloy02/exposition-automation.git)
