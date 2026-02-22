import os
import pickle
import io
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

# Scopes required for Drive API
SCOPES = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.readonly'
]

class DriveAgent:
    def __init__(self, credentials_path='backend/config/credentials.json', token_path='backend/config/token_drive.pickle'):
        self.creds = None
        self.credentials_path = credentials_path
        self.token_path = token_path
        self.service = None
        self.service = None
        self.enabled = False
        try:
            self._authenticate()
            self.enabled = True
        except Exception as e:
            print(f"❌ Drive Agent Init Failed (Disabled): {e}")

    def _authenticate(self):
        """Authenticates the user using OAuth 2.0."""
        if os.path.exists(self.token_path):
            with open(self.token_path, 'rb') as token:
                self.creds = pickle.load(token)
        
        if not self.creds or not self.creds.valid:
            if self.creds and self.creds.expired and self.creds.refresh_token:
                self.creds.refresh(Request())
            else:
                if not os.path.exists(self.credentials_path):
                    raise FileNotFoundError(f"Credentials file not found at {self.credentials_path}")
                
                flow = InstalledAppFlow.from_client_secrets_file(
                    self.credentials_path, SCOPES)
                self.creds = flow.run_local_server(port=0)
            
            with open(self.token_path, 'wb') as token:
                pickle.dump(self.creds, token)

        self.service = build('drive', 'v3', credentials=self.creds)

    def list_files(self, page_size=10):
        """Lists files in Google Drive."""
        try:
            results = self.service.files().list(
                pageSize=page_size, fields="nextPageToken, files(id, name, mimeType)").execute()
            items = results.get('files', [])
            return items
        except Exception as e:
            return {'error': str(e)}

    def upload_file(self, file_path, mime_type=None):
        """Uploads a file to Google Drive."""
        try:
            if not os.path.exists(file_path):
                return {'status': 'error', 'message': 'File not found'}
            
            file_metadata = {'name': os.path.basename(file_path)}
            media = MediaFileUpload(file_path, mimetype=mime_type)
            
            file = self.service.files().create(body=file_metadata, media_body=media, fields='id').execute()
            return {'status': 'success', 'file_id': file.get('id'), 'message': f"Uploaded {os.path.basename(file_path)}"}
        except Exception as e:
            return {'status': 'error', 'message': str(e)}

if __name__ == '__main__':
    # Test
    try:
        agent = DriveAgent()
        print("Drive Files:", agent.list_files(5))
    except Exception as e:
        print(f"Error: {e}")
