# Exposition Email Automation

> **Status:** Initial Development & Proof of Concept

This project aims to automate the process of handling email submissions for an exposition. The goal is to read a Gmail inbox, download attached images, and organize the sender's information automatically.

---

## Core Functionality (Current)

The current proof of concept is the `download_to_excel.py` script. It is able to:

* Connect to a Gmail account using the Google Gmail API.
* Scan for and process unread emails.
* Extract the sender's email, date, and subject line.
* Download all image attachments from the emails.
* Save the collected data into an Excel file (`email_images.xlsx`).

> This project is in its very early stages. More features and setup instructions will be added as development progresses.
