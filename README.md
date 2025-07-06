# Exposition Email Automation

> **Status:** Initial Development Phase

This project automates the process of handling email submissions for an exposition. It reads a Gmail inbox, downloads attached images, and organizes the sender's information into an Excel spreadsheet.

---

## Core Features (Current)

The main functionality is handled by the `download_to_excel.py` script, which:

* Connects to a Gmail account using the **Google Gmail API**.
* Scans for and processes unread emails.
* Extracts key metadata:
    * Sender's Email
    * Date of Receipt
    * Email Subject
* Downloads all image attachments from each email.
* Saves all the extracted information neatly into an Excel file named `email_images.xlsx`.

---

## Getting Started

### Prerequisites

* Python 3.x
* A Google Cloud project with the **Gmail API** enabled.

### Setup

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/your-username/your-repo-name.git](https://github.com/your-username/your-repo-name.git)
    cd your-repo-name
    ```

2.  **Install required Python libraries:**
    ```bash
    pip install --upgrade google-api-python-client google-auth-httplib2 google-auth-oauthlib openpyxl
    ```

3.  **Add your credentials:**
    * Download your **`credentials.json`** file from your Google Cloud project.
    * Place it in the root directory of this project.

4.  **First Run & Authorization:**
    * The first time you run the script, you will be prompted to authorize access to your Gmail account via a browser window.
    * Completing this step will create a **`token.pickle`** file in the directory. This file stores your authorization so you don't have to log in every time.

### Running the Script

To start processing your emails, run the following command in your terminal:
```bash
python download_to_excel.py
