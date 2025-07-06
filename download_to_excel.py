import os
import base64
import re
import pickle
import pandas as pd
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request

SCOPES = ['https://www.googleapis.com/auth/gmail.modify']  # 'modify' lets you mark as read

def authenticate_gmail():
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

def get_unread_emails(service, query='is:unread'):
    results = service.users().messages().list(userId='me', q=query).execute()
    messages = results.get('messages', [])
    print(f"Found {len(messages)} unread emails.")
    return messages

def download_attachments_and_collect_meta(service, messages, download_folder='downloads', mark_as_read=True):
    if not os.path.exists(download_folder):
        os.makedirs(download_folder)
    data = []
    for msg in messages:
        msg_id = msg['id']
        message = service.users().messages().get(userId='me', id=msg_id).execute()
        headers = message['payload'].get('headers', [])
        subject = next((h['value'] for h in headers if h['name'] == 'Subject'), '')
        sender = next((h['value'] for h in headers if h['name'] == 'From'), '')
        date = next((h['value'] for h in headers if h['name'] == 'Date'), '')
        parts = message['payload'].get('parts', [])
        image_files = []
        for part in parts:
            filename = part.get('filename')
            if filename and ('image' in part['mimeType']):
                data_b64 = part['body'].get('data')
                if not data_b64:
                    att_id = part['body'].get('attachmentId')
                    att = service.users().messages().attachments().get(userId='me', messageId=msg_id, id=att_id).execute()
                    data_b64 = att['data']
                file_data = base64.urlsafe_b64decode(data_b64.encode('UTF-8'))
                clean_filename = re.sub(r'[^\w\-_\. ]', '_', filename)
                filepath = os.path.join(download_folder, clean_filename)
                with open(filepath, 'wb') as f:
                    f.write(file_data)
                image_files.append(filepath)
        if not image_files:
            image_files = ["No image"]
        data.append({
            'Sender': sender,
            'Date': date,
            'Subject': subject,
            'Images': ', '.join(image_files)
        })
        # Mark as read if desired
        if mark_as_read:
            service.users().messages().modify(userId='me', id=msg_id, body={'removeLabelIds': ['UNREAD']}).execute()
    return data

if __name__ == '__main__':
    service = authenticate_gmail()
    messages = get_unread_emails(service)
    if not messages:
        print("No unread emails found.")
    else:
        # Set mark_as_read=False if you want to keep emails unread
        data = download_attachments_and_collect_meta(service, messages, download_folder='downloads', mark_as_read=False)
        df = pd.DataFrame(data)
        df.to_excel('email_images.xlsx', index=False)
        print(f"Saved results to email_images.xlsx")