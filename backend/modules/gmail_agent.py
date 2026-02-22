import os
import pickle
import base64
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from email.mime.text import MIMEText

# Scopes required for Gmail API
SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.compose'
]

class GmailAgent:
    def __init__(self, credentials_path='backend/config/credentials.json', token_path='backend/config/token_gmail.pickle'):
        self.creds = None
        self.credentials_path = credentials_path
        self.token_path = token_path
        self.service = None
        self.enabled = False
        try:
            self._authenticate()
            self.enabled = True
        except Exception as e:
            print(f"❌ Gmail Agent Init Failed (Disabled): {e}")

    def _authenticate(self):
        """Authenticates the user using OAuth 2.0."""
        if os.path.exists(self.token_path):
            with open(self.token_path, 'rb') as token:
                self.creds = pickle.load(token)
        
        # If there are no (valid) credentials available, let the user log in.
        if not self.creds or not self.creds.valid:
            if self.creds and self.creds.expired and self.creds.refresh_token:
                self.creds.refresh(Request())
            else:
                if not os.path.exists(self.credentials_path):
                    raise FileNotFoundError(f"Credentials file not found at {self.credentials_path}")
                
                flow = InstalledAppFlow.from_client_secrets_file(
                    self.credentials_path, SCOPES)
                self.creds = flow.run_local_server(port=0)
            
            # Save the credentials for the next run
            with open(self.token_path, 'wb') as token:
                pickle.dump(self.creds, token)

        self.service = build('gmail', 'v1', credentials=self.creds)

    def get_unread_emails(self, max_results=5):
        """Retrieves unread emails."""
        try:
            results = self.service.users().messages().list(userId='me', labelIds=['UNREAD'], maxResults=max_results).execute()
            messages = results.get('messages', [])
            
            email_list = []
            if not messages:
                return []

            for message in messages:
                msg = self.service.users().messages().get(userId='me', id=message['id']).execute()
                headers = msg['payload']['headers']
                subject = next((h['value'] for h in headers if h['name'] == 'Subject'), 'No Subject')
                sender = next((h['value'] for h in headers if h['name'] == 'From'), 'Unknown')
                snippet = msg.get('snippet', '')
                
                email_list.append({
                    'id': message['id'],
                    'subject': subject,
                    'sender': sender,
                    'snippet': snippet
                })
            return email_list
        except Exception as e:
            return {'error': str(e)}

    def create_draft(self, to, subject, body):
        """Creates a draft email."""
        try:
            message = MIMEText(body)
            message['to'] = to
            message['subject'] = subject
            raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
            body = {'message': {'raw': raw}}
            
            draft = self.service.users().drafts().create(userId='me', body=body).execute()
            return {'status': 'success', 'draft_id': draft['id'], 'message': 'Draft created successfully'}
        except Exception as e:
            return {'status': 'error', 'message': str(e)}

    def send_email(self, to, subject, body):
        """Sends an email immediately."""
        try:
            message = MIMEText(body)
            message['to'] = to
            message['subject'] = subject
            raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
            body = {'raw': raw}
            
            sent_message = self.service.users().messages().send(userId='me', body=body).execute()
            return {'status': 'success', 'message_id': sent_message['id'], 'message': 'Email sent successfully'}
        except Exception as e:
            return {'status': 'error', 'message': str(e)}

if __name__ == '__main__':
    # Test
    try:
        agent = GmailAgent()
        print("Unread emails:", agent.get_unread_emails(1))
    except Exception as e:
        print(f"Error: {e}")
