import os
import base64
import mimetypes
import requests
import json
from api_utils import post_with_retries # <--- NEW IMPORT

API_KEY = os.environ.get("GEMINI_API_KEY")
API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key={API_KEY}"

def parse_image_diagram(image_path, user_description="", language="python"):
    if not API_KEY: raise Exception("GEMINI_API_KEY is not set.")
    mime_type, _ = mimetypes.guess_type(image_path)
    if not mime_type: mime_type = 'image/png'

    try:
        with open(image_path, "rb") as image_file:
            base64_image = base64.b64encode(image_file.read()).decode('utf-8')
    except Exception as e: raise Exception(f"Failed to read image file: {e}")

    system_prompt = (
        f"You are an expert software engineer. Transcribe the logic of this diagram into valid {language.upper()} code. "
        "Do not improve the logic, just transcribe it. Return ONLY the code."
    )
    
    user_prompt_text = f"Convert this diagram to {language}."
    if user_description:
        user_prompt_text += f"\nContext: '{user_description}'"

    payload = {
        "contents": [{
            "parts": [
                {"text": user_prompt_text},
                {"inline_data": {"mime_type": mime_type, "data": base64_image}}
            ]
        }],
        "systemInstruction": {"parts": [{"text": system_prompt}]},
    }

    try:
        # REPLACED requests.post WITH post_with_retries
        response = post_with_retries(API_URL, payload, headers={"Content-Type": "application/json"})
        
        generated_code = response.json()['candidates'][0]['content']['parts'][0]['text']
        
        # Clean up markdown
        generated_code = generated_code.replace("```python", "").replace("```cpp", "").replace("```java", "").replace("```", "").strip()
        
        return generated_code

    except Exception as e:
        raise Exception(f"AI Image Analysis failed: {e}")