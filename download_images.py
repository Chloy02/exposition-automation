# download_images.py
# This script downloads image attachments from unread emails in your Gmail inbox.
# It uses the Google account you log in with during the first authentication popup.
# To use a different account, delete 'token.pickle' and rerun the script.

import os
import base64
import re
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
import pickle

# Gmail API scope for read-only access
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

def authenticate_gmail():
    """
    Authenticates the user with Gmail API.
    Uses 'token.pickle' to remember your login. Delete it to re-authenticate with a different account.
    """
    creds = None
    if os.path.exists('token.pickle'):
        with open('token.pickle', 'rb') as token:
            creds = pickle.load(token)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        with open('token.pickle', 'wb') as token:
            pickle.dump(creds, token)
    return build('gmail', 'v1', credentials=creds)

def get_unread_emails(service, query='has:attachment is:unread'):
    """
    Gets unread emails with attachments.
    You can filter by sender by changing the query, e.g.:
    query = 'from:exposition@domain.com has:attachment is:unread'
    """
    print(f"Searching for emails with query: {query}")
    results = service.users().messages().list(userId='me', q=query).execute()
    messages = results.get('messages', [])
    print(f"Found {len(messages)} matching emails.")
    return messages

def download_attachments(service, messages, download_folder='downloads'):
    """
    Downloads image attachments from the given messages.
    Saves metadata for each image for later processing.
    """
    if not os.path.exists(download_folder):
        os.makedirs(download_folder)
    meta_list = []
    for msg in messages:
        msg_id = msg['id']
        message = service.users().messages().get(userId='me', id=msg_id).execute()
        headers = message['payload'].get('headers', [])
        subject = next((h['value'] for h in headers if h['name'] == 'Subject'), '')
        sender = next((h['value'] for h in headers if h['name'] == 'From'), '')
        date = next((h['value'] for h in headers if h['name'] == 'Date'), '')
        parts = message['payload'].get('parts', [])
        found_image = False
        for part in parts:
            filename = part.get('filename')
            if filename and ('image' in part['mimeType']):
                found_image = True
                data = part['body'].get('data')
                if not data:
                    att_id = part['body'].get('attachmentId')
                    att = service.users().messages().attachments().get(userId='me', messageId=msg_id, id=att_id).execute()
                    data = att['data']
                file_data = base64.urlsafe_b64decode(data.encode('UTF-8'))
                clean_filename = re.sub(r'[^\w\-_\. ]', '_', filename)
                filepath = os.path.join(download_folder, clean_filename)
                with open(filepath, 'wb') as f:
                    f.write(file_data)
                print(f"Downloaded: {filepath} | From: {sender} | Date: {date} | Subject: {subject}")
                meta_list.append({'filepath': filepath, 'sender': sender, 'date': date, 'subject': subject})
        if not found_image:
            print(f"No image attachments found in email from {sender} with subject '{subject}'")
    return meta_list

if __name__ == '__main__':
    # If you want to reset authentication, delete 'token.pickle' and rerun this script.
    service = authenticate_gmail()
    # To filter by sender, change the query below:
    messages = get_unread_emails(service, query='from:exposition@domain.com has:attachment is:unread')
    if not messages:
        print("No unread emails with image attachments found.")
    meta_list = download_attachments(service, messages)
    # Save metadata for next step
    import json
    with open('image_meta.json', 'w') as f:
        json.dump(meta_list, f, indent=2)
    print(f"Saved metadata for {len(meta_list)} images to image_meta.json.")