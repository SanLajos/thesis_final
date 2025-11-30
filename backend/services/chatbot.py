import os
import requests
from backend.core.api_utils import post_with_retries # Updated Import

# Use a separate key if available, otherwise fallback to the main one
CHAT_API_KEY = os.environ.get("GEMINI_CHAT_KEY", os.environ.get("GEMINI_API_KEY"))
API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key={CHAT_API_KEY}"

SYSTEM_INSTRUCTION = """
You are an automated IT Teaching Assistant for a university course.
Your scope is STRICTLY limited to the following topics:
1. Flowchart design and logic.
2. Nassi-Shneiderman structograms.
3. Python programming.
4. C++ programming.
5. Java programming.

BEHAVIOR RULES:
- If a user asks about anything else (e.g., history, biology, writing an essay, general chat), you must politely REFUSE to answer and remind them of your purpose.
- Do not write full solutions for homework assignments. Instead, provide hints, explain concepts, or debug specific lines of code.
- Be concise and educational. Use code blocks for examples.
- Maintain a helpful and professional tone.

Example Refusal:
User: "Who won the World Cup?"
AI: "I am an IT tutor and can only answer questions about programming and diagrams. Do you have a question about Python or Flowcharts?"
"""

def chat_with_tutor(user_message, history=[]):
    """
    Sends a message to the AI tutor.
    history: List of previous messages [{"role": "user", "parts": [...]}, ...]
    """
    if not CHAT_API_KEY:
        return {"error": "Chatbot is not configured (API Key missing)."}

    # Construct the conversation history
    # Gemini API expects 'user' and 'model' roles
    contents = []
    
    # Add history (limit to last 10 turns to save context window/cost)
    for msg in history[-10:]:
        role = "user" if msg['role'] == 'student' else "model"
        contents.append({
            "role": role,
            "parts": [{"text": msg['text']}]
        })
        
    # Add current message
    contents.append({
        "role": "user",
        "parts": [{"text": user_message}]
    })

    payload = {
        "contents": contents,
        "systemInstruction": {"parts": [{"text": SYSTEM_INSTRUCTION}]},
        "generationConfig": {
            "temperature": 0.7, # Slightly creative for explanations, but grounded
            "maxOutputTokens": 500 # Keep answers reasonably short
        }
    }

    try:
        response = post_with_retries(API_URL, payload, headers={"Content-Type": "application/json"})
        ai_text = response.json()['candidates'][0]['content']['parts'][0]['text']
        return {"response": ai_text}
        
    except Exception as e:
        print(f"Chatbot Error: {e}")
        return {"error": "I'm having trouble connecting to the brain. Please try again later."}