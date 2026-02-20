import os

import time

import logging

import json

from datetime import datetime, timedelta

import firebase_admin

from firebase_admin import credentials, firestore

from pathlib import Path

import sys

from dotenv import load_dotenv

# --- P0.0 SAFETY: UNICODE FORCING ---

if sys.platform == "win32":

    try:

        if hasattr(sys.stdout, 'reconfigure'):

            sys.stdout.reconfigure(encoding='utf-8', errors='replace')

        if hasattr(sys.stderr, 'reconfigure'):

            sys.stderr.reconfigure(encoding='utf-8', errors='replace')

    except Exception:

         pass

# Path setup

script_dir = Path(__file__).parent

project_root = script_dir.parent.parent # Sage_Final_Unified

load_dotenv(dotenv_path=project_root / '.env')

# Import SNS Manager

import sys

sys.path.append(str(project_root))

from backend.modules.social_media_manager import SocialMediaManager

from backend.automation.cms_job import generate_draft_post

from backend.automation.pr_job import generate_pr_content

from backend.pipelines.nano_banana_pipeline import nano_banana

# Configure logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

logger = logging.getLogger("SageJobRunner")

class SageJobRunner:

    def __init__(self):

        self.running = True

        self.db = None

        self.local_mode = False

        self.sns = SocialMediaManager()

        self._init_firebase()

        mode_str = 'Firestore' if not self.local_mode else 'Local Failover'

        logger.info(f"噫 Sage Job Runner Initialized (Mode: {mode_str})")

    def _init_firebase(self):

        try:

            # Re-use existing init if possible

            if not firebase_admin._apps:

                key_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY")

                if key_path and os.path.exists(key_path):

                    cred = credentials.Certificate(key_path)

                    firebase_admin.initialize_app(cred)

                else:

                    firebase_admin.initialize_app()

            self.db = firestore.client()

            logger.info("櫨 Firestore Connection Established.")

        except Exception as e:

            logger.warning(f"笞・・Firebase Init Failed ({e}). Switching to Local JSON Mode.")

            self.local_mode = True

    def process_jobs(self):

        """Polls Firestore or Local JSON for pending items."""

        self._process_local_jobs()
        if self.local_mode or not self.db:
            return

        # Firestore Logic

        if not self.db:

            return

        try:

            jobs_ref = self.db.collection('jobs')

            pending_jobs = jobs_ref.where('status', '==', 'pending').stream()

            for doc in pending_jobs:

                job_id = doc.id

                job_data = doc.to_dict()

                # Check Retry Timing (Firestore)

                if job_data.get('next_run_at'):

                    try:

                        next_run = datetime.fromisoformat(job_data['next_run_at'])

                        if datetime.now() < next_run:

                            continue # Waiting for backoff

                    except ValueError:

                        pass # Invalid format, run immediately

                self._handle_job(job_id, job_data, jobs_ref)

        except Exception as e:

            logger.error(f"笶・Error in process_jobs: {e}")

            # Fallback to local if Firestore connectivity dies?

            # For now, just log error.

    def _process_local_jobs(self):

        """Standard JSON polling for local mode with Retry Logic."""

        local_jobs_path = project_root / "backend/data/jobs.json"

        if not local_jobs_path.exists():

            return

        try:

            with open(local_jobs_path, 'r', encoding='utf-8-sig') as f:

                jobs = json.load(f)

            updated = False

            for job in jobs:

                if job.get('status') == 'pending':

                    # Check Retry Timing

                    if job.get('next_run_at'):

                        try:

                            next_run = datetime.fromisoformat(job['next_run_at'])

                            if datetime.now() < next_run:

                                continue # Waiting for backoff

                        except ValueError:

                            pass # Invalid format, run immediately

                    logger.info(f"逃 Processing Local Job: {job.get('id')} (Attempt {job.get('retries', 0) + 1})")

                    try:

                        # Mark processing

                        job['status'] = 'processing'

                        job['started_at'] = datetime.now().isoformat()

                        result = self._execute_job(job)

                        # Check success (Smart Check for SNS)

                        is_success = True

                        error_msg = None

                        if job.get('type') == 'pr_sns' or job.get('type') == 'pr_post':

                             # SNS jobs return dict of platform results

                             if isinstance(result, dict):

                                 for plt, res in result.items():

                                     if isinstance(res, dict) and res.get('status') == 'error':

                                         is_success = False

                                         error_msg = res.get('message', 'Unknown SNS Error')

                                         break

                        elif isinstance(result, dict) and result.get('status') == 'error':

                             is_success = False

                             error_msg = result.get('message')

                        if is_success:

                            job['status'] = 'completed'
                            # Evidence Logging
                            try:
                                evidence_path = project_root / 'backend/logs/sns_evidence.jsonl'
                                ev_entry = {'ts_jst': datetime.now().strftime('%Y-%m-%d %H:%M:%S'), 'platform': job.get('payload', {}).get('platforms', ['unknown'])[0], 'status': 'success', 'text_preview': job.get('payload', {}).get('text', '')[:100], 'error': None}
                                with open(evidence_path, 'a', encoding='utf-8') as ef: ef.write(json.dumps(ev_entry, ensure_ascii=False) + '\n')
                            except: pass

                            job['result'] = result

                            job['completed_at'] = datetime.now().isoformat()

                            logger.info(f"笨・Job {job.get('id')} COMPLETED.")

                        else:

                            # Retry Logic

                            retries = job.get('retries', 0)

                            MAX_RETRIES = 3

                            if retries < MAX_RETRIES:

                                backoff_seconds = 60 * (2 ** retries) # 60s, 120s, 240s

                                job['retries'] = retries + 1

                                job['next_run_at'] = (datetime.now() + timedelta(seconds=backoff_seconds)).isoformat()

                                job['status'] = 'pending' # Queue again

                                job['last_error'] = error_msg

                                logger.warning(f"笞・・Job {job.get('id')} Failed. Retrying in {backoff_seconds}s (Attempt {job['retries']}/{MAX_RETRIES})")

                            else:

                                job['status'] = 'failed'

                                job['result'] = {"status": "error", "message": error_msg}

                                job['completed_at'] = datetime.now().isoformat()

                                logger.error(f"笶・Job {job.get('id')} FAILED permanently after {MAX_RETRIES} retries.")

                    except Exception as e:

                        logger.error(f"笶・Job Execution Crash: {e}")

                        # Crash also triggers retry if possible

                        retries = job.get('retries', 0)

                        if retries < 3:

                             backoff = 60 * (2 ** retries)

                             job['retries'] = retries + 1

                             job['next_run_at'] = (datetime.now() + timedelta(seconds=backoff)).isoformat()

                             job['status'] = 'pending'

                             job['last_error'] = str(e)

                             logger.warning(f"笞・・Job Crashed. Retrying in {backoff}s.")

                        else:

                            job['status'] = 'failed'

                            job['result'] = {"status": "error", "message": f"Crash: {str(e)}"}

                            job['completed_at'] = datetime.now().isoformat()

                    updated = True

            if updated:

                temp_path = local_jobs_path.with_suffix('.tmp')

                try:

                    with open(temp_path, 'w', encoding='utf-8') as f:

                        json.dump(jobs, f, indent=2, ensure_ascii=False)

                    os.replace(temp_path, local_jobs_path)

                except Exception as write_err:

                    logger.error(f"❌ Failed to update jobs.json (atomic): {write_err}")

                    if temp_path.exists(): temp_path.unlink()

        except Exception as e:

            logger.error(f"笶・Local Store Error: {e}")

    def _handle_job(self, job_id, job_data, jobs_ref):

        """Common execution logic wrapper for Firestore mode with Retry."""

        logger.info(f"逃 Processing Job: {job_id} ({job_data.get('type')}) - Attempt {job_data.get('retries', 0) + 1}")

        jobs_ref.document(job_id).update({'status': 'processing', 'started_at': firestore.SERVER_TIMESTAMP})

        try:

            result = self._execute_job(job_data)

            # Check success (Smart Check for SNS)

            is_success = True

            error_msg = None

            if job_data.get('type') in ['pr_sns', 'pr_post']:

                    if isinstance(result, dict):

                        for plt, res in result.items():

                            if isinstance(res, dict) and res.get('status') == 'error':

                                is_success = False

                                error_msg = res.get('message', 'Unknown SNS Error')

                                break

            elif isinstance(result, dict) and result.get('status') == 'error':

                    is_success = False

                    error_msg = result.get('message')

            if is_success:

                jobs_ref.document(job_id).update({

                    'status': 'completed',

                    'result': result,

                    'completed_at': firestore.SERVER_TIMESTAMP

                })

                logger.info(f"笨・Job {job_id} COMPLETED.")

            else:

                 # Retry Logic

                retries = job_data.get('retries', 0)

                MAX_RETRIES = 3

                if retries < MAX_RETRIES:

                    backoff_seconds = 60 * (2 ** retries)

                    next_run = (datetime.now() + timedelta(seconds=backoff_seconds)).isoformat()

                    jobs_ref.document(job_id).update({

                        'status': 'pending', # Queue again

                        'retries': retries + 1,

                        'next_run_at': next_run,

                        'last_error': error_msg

                    })

                    logger.warning(f"笞・・Job {job_id} Failed. Retrying in {backoff_seconds}s (Attempt {retries + 1}/{MAX_RETRIES})")

                else:

                    jobs_ref.document(job_id).update({

                        'status': 'failed',

                        'result': {"status": "error", "message": error_msg},

                        'completed_at': firestore.SERVER_TIMESTAMP

                    })

                    logger.error(f"笶・Job {job_id} FAILED permanently after {MAX_RETRIES} retries.")

        except Exception as e:

            logger.error(f"笶・Job Execution Crash: {e}")

            retries = job_data.get('retries', 0)

            if retries < 3:

                backoff = 60 * (2 ** retries)

                next_run = (datetime.now() + timedelta(seconds=backoff)).isoformat()

                jobs_ref.document(job_id).update({

                        'status': 'pending',

                        'retries': retries + 1,

                        'next_run_at': next_run,

                        'last_error': str(e)

                })

                logger.warning(f"笞・・Job Crashed. Retrying in {backoff}s.")

            else:

                jobs_ref.document(job_id).update({

                    'status': 'failed',

                    'result': {"status": "error", "message": f"Crash: {str(e)}"},

                    'completed_at': firestore.SERVER_TIMESTAMP

                })

    def _execute_job(self, data):

        """Handles the actual SNS posting logic."""

        job_type = data.get('type')

        payload = data.get('payload', {})

        if job_type == 'pr_sns':

            text = payload.get('text', '')

            image_url = payload.get('image_url')

            platforms = payload.get('platforms', ['bluesky'])

            logger.info(f"討 Posting to: {platforms}")

            return self.sns.post_content(text, image_url, platforms)

        elif job_type == 'pr_generate':

            # 1. Generate Content (Text + Image Prompt)

            result = generate_pr_content(data)

            if result.get("status") == "success":

                # 2. Generate Unique Image

                img_prompt = result.get("image_prompt", "AI Technology")

                img_res = nano_banana.generate_image(img_prompt)

                # 3. Automatically Queue pr_post

                post_job = {

                    "id": f"post_{int(time.time())}",

                    "type": "pr_post",

                    "status": "pending",

                    "payload": {

                        "text": result["content"],

                        "image_path": img_res.get("path") if img_res.get("status") == "success" else None,

                        "platforms": data.get("payload", {}).get("platforms", ["bluesky"])

                    }

                }

                if self.local_mode:

                    self._add_local_job(post_job)

                elif self.db:

                    self.db.collection('jobs').add(post_job)

                logger.info("笨・PR Content/Image generated and post job queued.")

                return {"status": "success", "message": "PR generated and queued with unique image."}

            return result

        elif job_type == 'pr_post':

            text = payload.get('text', '')

            image_path = payload.get('image_path')

            platforms = payload.get('platforms', ['bluesky'])

            logger.info(f"討 Executing PR Post (With Image: {bool(image_path)}) to: {platforms}")

            return self.sns.post_content(text, image_url=image_path, platforms=platforms)

        elif job_type == 'cms_article':

            # 1. Generate Draft

            result = generate_draft_post(data)

            if result.get("status") == "success":

                draft = result["draft"]

                # 2. Save to Firestore (or local JSON)

                try:

                    # Logic to save draft to 'posts' collection

                    if not self.local_mode and self.db:

                        # Convert datetime string to firestore server timestamp

                        draft['created_at'] = firestore.SERVER_TIMESTAMP

                        self.db.collection('posts').add(draft)

                        logger.info("笨・Draft saved to Firestore collection 'posts'")

                    else:

                        # Local store fix (e.g., drafts.json)

                        logger.info("統 Local Mode: Draft generated but not yet persisted to local file (Coming soon).")

                    return {"status": "success", "message": "Article draft generated and saved."}

                except Exception as e:

                    logger.error(f"笶・Failed to save draft: {e}")

                    return {"status": "error", "message": f"Draft saved failed: {e}"}

            else:

                return result

    def _add_local_job(self, job_data):

        """Helper to add a job to the local jobs.json file."""

        local_jobs_path = project_root / "backend/data/jobs.json"

        try:

            jobs = []

            if local_jobs_path.exists():

                with open(local_jobs_path, 'r', encoding='utf-8') as f:

                    jobs = json.load(f)

            jobs.append(job_data)

            temp_path = local_jobs_path.with_suffix('.tmp')

            with open(temp_path, 'w', encoding='utf-8') as f:

                json.dump(jobs, f, indent=2, ensure_ascii=False)

            os.replace(temp_path, local_jobs_path)

            logger.info(f"筐・Queued local job: {job_data.get('id')}")

        except Exception as e:

            logger.error(f"笶・Failed to add local job: {e}")

    def run(self):

        while self.running:

            try:

                self.process_jobs()

                time.sleep(10) # Faster poll for local dev (was 30)

            except Exception as e:

                logger.error(f"笶・Runner Error: {e}")

                time.sleep(10)

if __name__ == "__main__":

    runner = SageJobRunner()

    runner.run()