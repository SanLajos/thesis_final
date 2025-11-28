import os
import json
import requests
from api_utils import post_with_retries

API_KEY = os.environ.get("GEMINI_API_KEY")
API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key={API_KEY}"

# --- THESIS-LEVEL GRADING SCHEMA ---
GRADING_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "reasoning_trace": { 
            "type": "STRING", 
            "description": "Step-by-step thought process analyzing the student's logic flow against the requirement." 
        },
        "overall_score": { "type": "NUMBER", "description": "Final grade 0-100" },
        "rubric_breakdown": {
            "type": "OBJECT",
            "properties": {
                "logic_correctness": { "type": "NUMBER", "description": "0-100: Does it solve the problem?" },
                "syntax_structure": { "type": "NUMBER", "description": "0-100: Is the generated code structure valid?" },
                "efficiency": { "type": "NUMBER", "description": "0-100: Algorithmic efficiency" },
                "completeness": { "type": "NUMBER", "description": "0-100: Edge case handling" }
            }
        },
        "complexity_analysis": {
            "type": "OBJECT",
            "properties": {
                "time_complexity": { "type": "STRING", "description": "e.g., O(n), O(n^2)" },
                "space_complexity": { "type": "STRING", "description": "e.g., O(1), O(n)" },
                "assessment": { "type": "STRING", "description": "Brief comment on efficiency." }
            }
        },
        "feedback_summary": { "type": "STRING" },
        "is_correct": { "type": "BOOLEAN" },
        "critical_issues": { "type": "ARRAY", "items": { "type": "STRING" } },
        "improvement_suggestions": { "type": "ARRAY", "items": { "type": "STRING" } },
        "corrected_code_snippet": { 
            "type": "STRING", 
            "description": "A rewritten version of the student's code that fixes the errors, if any." 
        }
    },
    "required": ["reasoning_trace", "overall_score", "rubric_breakdown", "complexity_analysis", "feedback_summary", "is_correct", "corrected_code_snippet"]
}

def grade_with_ai(student_code: str, template_code: str, assignment_prompt: str, custom_grading_instructions: str = "") -> dict:
    if not API_KEY:
        return {"score": 0, "feedback": "System Error: AI Key Missing", "is_correct": False, "logic_errors": []}
    
    system_prompt = (
        "You are a strict Computer Science Professor grading a Thesis project. "
        "You must analyze the algorithm using Chain-of-Thought reasoning. "
        "1. Trace the execution of the student's code. "
        "2. Compare it to the reference template for logic divergence. "
        "3. Estimate Big-O Time and Space complexity. "
        "4. Provide a corrected version of the code if there are bugs. "
        "5. Assign a fair score based on the rubric."
    )

    user_prompt = f"""
    --- ASSIGNMENT DESCRIPTION ---
    {assignment_prompt}

    --- TEACHER INSTRUCTIONS ---
    {custom_grading_instructions}

    --- REFERENCE SOLUTION ---
    {template_code}

    --- STUDENT SUBMISSION ---
    {student_code}
    
    Perform the grading analysis now.
    """
    
    payload = {
        "contents": [{"parts": [{"text": user_prompt}]}],
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "generationConfig": {
            "responseMimeType": "application/json", 
            "responseSchema": GRADING_SCHEMA,
            "temperature": 0.2 # Low temperature for consistent grading
        }
    }

    try:
        response = post_with_retries(API_URL, payload, headers={"Content-Type": "application/json"})
        data = json.loads(response.json()['candidates'][0]['content']['parts'][0]['text'])
        
        # Flatten for frontend compatibility while keeping deep data
        data['score'] = int(data['overall_score'])
        data['feedback'] = data['feedback_summary']
        data['logic_errors'] = data.get('critical_issues', [])
        
        return data
        
    except Exception as e:
        print(f"AI Error: {e}")
        return {
            "score": 0, 
            "feedback": f"AI Grading Failed: {str(e)}", 
            "is_correct": False, 
            "logic_errors": ["AI Service Error"]
        }