import os
import datetime
import pickle
import time
import opik
from typing import Dict, Any, List, Optional
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Configure Opik
opik.configure(use_local=False)

# If modifying these scopes, delete the file token.json.
SCOPES = ['https://www.googleapis.com/auth/calendar']

class GoogleCalendarIntegration:
    def __init__(self):
        self.name = "Google Calendar Integration"
        self.creds = None
        self.service = None
        self.credentials_path = os.path.join(os.path.dirname(__file__), 'credentials.json')
        self.token_path = os.path.join(os.path.dirname(__file__), 'token.json')

    def authenticate(self):
        """Shows basic usage of the Google Calendar API.
        Prints the start and name of the next 10 events on the user's calendar.
        """
        if os.path.exists(self.token_path):
            with open(self.token_path, 'rb') as token:
                self.creds = pickle.load(token)
        
        # If there are no (valid) credentials available, let the user log in.
        if not self.creds or not self.creds.valid:
            if self.creds and self.creds.expired and self.creds.refresh_token:
                try:
                    self.creds.refresh(Request())
                except Exception as e:
                    print(f"[GoogleCalendar] Refresh failed: {e}")
                    self.creds = None
            
            if not self.creds:
                if os.path.exists(self.credentials_path):
                    flow = InstalledAppFlow.from_client_secrets_file(
                        self.credentials_path, SCOPES)
                    self.creds = flow.run_local_server(port=0)
                else:
                    print("[GoogleCalendar] credentials.json not found. Authentication skipped.")
                    return

            # Save the credentials for the next run
            with open(self.token_path, 'wb') as token:
                pickle.dump(self.creds, token)

        try:
            self.service = build('calendar', 'v3', credentials=self.creds)
            print("[GoogleCalendar] Service built successfully.")
        except HttpError as err:
            print(f"[GoogleCalendar] Error building service: {err}")

    def _ensure_service(self):
        if not self.service:
            self.authenticate()
        if not self.service:
             # If still no service (e.g. no credentials.json), raise error or handle gracefully
             raise RuntimeError("Google Calendar Service not initialized. Check credentials.")

    @opik.track(name="calendar_create_event")
    def create_event(self, summary: str, start_time: str, end_time: str, description: str = "", location: str = "") -> Optional[Dict[str, Any]]:
        self._ensure_service()
        
        event = {
            'summary': summary,
            'location': location,
            'description': description,
            'start': {
                'dateTime': start_time, # ISO format '2023-01-01T09:00:00-07:00'
                'timeZone': 'UTC', # Adjust as needed or infer
            },
            'end': {
                'dateTime': end_time,
                'timeZone': 'UTC',
            },
        }

        try:
            event = self.service.events().insert(calendarId='primary', body=event).execute()
            print(f"[GoogleCalendar] Event created: {event.get('htmlLink')}")
            return event
        except HttpError as error:
            print(f"[GoogleCalendar] An error occurred: {error}")
            return None

    @opik.track(name="calendar_list_events")
    def list_events(self, max_results: int = 10) -> List[Dict[str, Any]]:
        self._ensure_service()
        try:
            now = datetime.datetime.utcnow().isoformat() + 'Z'  # 'Z' indicates UTC time
            print(f'[GoogleCalendar] Getting the upcoming {max_results} events')
            events_result = self.service.events().list(calendarId='primary', timeMin=now,
                                                    maxResults=max_results, singleEvents=True,
                                                    orderBy='startTime').execute()
            events = events_result.get('items', [])
            return events
        except HttpError as error:
            print(f"[GoogleCalendar] An error occurred: {error}")
            return []

    @opik.track(name="calendar_update_event")
    def update_event(self, event_id: str, body: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        self._ensure_service()
        try:
            updated_event = self.service.events().patch(calendarId='primary', eventId=event_id, body=body).execute()
            print(f"[GoogleCalendar] Event updated: {updated_event.get('htmlLink')}")
            return updated_event
        except HttpError as error:
            print(f"[GoogleCalendar] An error occurred: {error}")
            return None

    @opik.track(name="calendar_delete_event")
    def delete_event(self, event_id: str) -> bool:
        self._ensure_service()
        try:
            self.service.events().delete(calendarId='primary', eventId=event_id).execute()
            print(f"[GoogleCalendar] Event deleted: {event_id}")
            return True
        except HttpError as error:
            print(f"[GoogleCalendar] An error occurred: {error}")
            return False

    @opik.track(name="calendar_find_free_slots")
    def find_free_slots(self, time_min: str, time_max: str) -> List[Dict[str, Any]]:
        """
        Find free slots using the freebusy query.
        """
        self._ensure_service()
        body = {
            "timeMin": time_min,
            "timeMax": time_max,
            "timeZone": "UTC",
            "items": [{"id": "primary"}]
        }
        try:
            events_result = self.service.freebusy().query(body=body).execute()
            calendars = events_result.get('calendars', {})
            primary_busy = calendars.get('primary', {}).get('busy', [])
            # Logic to invert busy slots to free slots would go here
            # For now, returning the busy slots structure as raw data
            return primary_busy
        except HttpError as error:
            print(f"[GoogleCalendar] An error occurred: {error}")
            return []

    @opik.track(name="calendar_create_from_notion")
    def create_event_from_notion_task(self, notion_task: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Creates a calendar event from a Notion task object (simplified).
        Expects notion_task to have 'title', 'start_date', 'end_date' (optional).
        """
        title = notion_task.get('title', 'Untitled Task')
        start = notion_task.get('start_date')
        end = notion_task.get('end_date')
        
        if not start:
            print("[GoogleCalendar] No start date in Notion task.")
            return None
            
        # Default duration 1 hour if no end date
        if not end:
            # Parse start string to datetime, add 1 hour, convert back
            # This is simplified; robust parsing needed for real usage
            end = start # Placeholder
            
        return self.create_event(summary=title, start_time=start, end_time=end, description="Created from Notion")

# Singleton instance
google_calendar = GoogleCalendarIntegration()
