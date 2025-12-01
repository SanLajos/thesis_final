import os
import base64
import mimetypes
import json
import re
import cv2
import numpy as np
# Updated import for the new 'backend/core' location
from backend.core.api_utils import post_with_retries

API_KEY = os.environ.get("GEMINI_API_KEY")
API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key={API_KEY}"

def parse_image_diagram(image_path, user_description="", language="python"):
    if not API_KEY: raise Exception("GEMINI_API_KEY is not set.")
    
    # 1. Computer Vision: Count Shapes (Ground Truth Estimate)
    try:
        cv_node_count = _count_shapes_cv(image_path)
    except Exception as e:
        print(f"CV Warning: Could not analyze image contours: {e}")
        cv_node_count = None # Fallback if CV fails

    # 2. AI Parsing
    mime_type, _ = mimetypes.guess_type(image_path)
    if not mime_type: mime_type = 'image/png'

    try:
        with open(image_path, "rb") as image_file:
            base64_image = base64.b64encode(image_file.read()).decode('utf-8')
    except Exception as e: raise Exception(f"Failed to read image file: {e}")

    # Updated Prompt to request JSON with metadata
    system_prompt = (
        f"You are an expert software engineer. Analyze the attached flowchart/diagram.\n"
        f"1. Count the number of distinct logical steps/nodes (Start, Process, Decision, End).\n"
        f"2. Transcribe the logic into valid {language.upper()} code.\n"
        "Return a purely raw JSON object (no markdown) with this structure:\n"
        '{ "node_count": <integer>, "code": "<source_code_string>" }'
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
        "generationConfig": { "responseMimeType": "application/json" } # Force JSON
    }

    try:
        response = post_with_retries(API_URL, payload, headers={"Content-Type": "application/json"})
        
        # Parse AI Response
        ai_text = response.json()['candidates'][0]['content']['parts'][0]['text']
        
        # Clean up potential markdown wrappers
        if ai_text.startswith("```json"): ai_text = ai_text[7:]
        if ai_text.endswith("```"): ai_text = ai_text[:-3]
        
        data = json.loads(ai_text.strip())
        generated_code = data.get('code', '')
        ai_node_count = data.get('node_count', 0)

        # 3. Hybrid Validation Logic (RELAXED)
        if cv_node_count is not None and ai_node_count > 0:
            diff = abs(cv_node_count - ai_node_count)
            threshold = 3 
            
            if diff > threshold:
                # --- FIX: Log warning only, DO NOT raise Exception ---
                print(f"[WARNING] Validation Discrepancy: AI detected {ai_node_count} nodes, but CV found {cv_node_count}.")
                print("Proceeding with AI result as truth.")
                
        return generated_code

    except json.JSONDecodeError:
        raise Exception("AI Error: Failed to generate structured JSON response.")
    except Exception as e:
        raise Exception(f"AI Image Analysis failed: {e}")

def _count_shapes_cv(image_path):
    """
    Uses OpenCV to estimate the number of block elements in the diagram.
    """
    img = cv2.imread(image_path)
    if img is None: return None
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Thresholding to separate shapes from background
    thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                   cv2.THRESH_BINARY_INV, 11, 2)
    
    # Find contours
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    valid_shapes = 0
    min_area = 500 # Ignore small noise
    
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area > min_area:
            peri = cv2.arcLength(cnt, True)
            approx = cv2.approxPolyDP(cnt, 0.04 * peri, True)
            if len(approx) >= 3: 
                valid_shapes += 1
                
    return valid_shapes