import time
import random
import requests

def post_with_retries(url, json_payload, headers, max_retries=5):
    """
    Sends a POST request with Exponential Backoff for 429 errors.
    """
    for attempt in range(max_retries):
        try:
            response = requests.post(url, json=json_payload, headers=headers)
            response.raise_for_status() # Raises HTTPError for 4xx/5xx
            return response
            
        except requests.exceptions.HTTPError as e:
            # Only retry on 429 (Rate Limit) or 503 (Service Unavailable)
            if e.response.status_code in [429, 503]:
                if attempt < max_retries - 1:
                    # Calculate wait time: 2^attempt + random jitter (to prevent Thundering Herd)
                    sleep_time = (2 ** attempt) + random.uniform(0, 1)
                    print(f"⚠️ API Rate Limit (429). Retrying in {sleep_time:.2f}s...")
                    time.sleep(sleep_time)
                    continue
            
            # If it's another error (400, 401, etc) or max retries reached, raise it
            raise e
            
        except requests.exceptions.ConnectionError as e:
            # Retry on simple connection drops
            if attempt < max_retries - 1:
                time.sleep(1)
                continue
            raise e

    return None # Should not be reached due to raise inside loop