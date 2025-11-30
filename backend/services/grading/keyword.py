import re

def grade_with_keywords(student_code, keywords_list):
    """
    Grades code based on the presence of required keywords.
    keywords_list: string (comma separated) or list of strings
    """
    if isinstance(keywords_list, str):
        # Teacher might type "while, if, print" in the prompt box
        # Split by comma and strip whitespace
        required = [k.strip() for k in keywords_list.split(',') if k.strip()]
    else:
        required = keywords_list

    if not required:
        return {
            "score": 100,
            "feedback": "No specific keywords were required.",
            "is_correct": True,
            "logic_errors": []
        }

    found = []
    missing = []
    
    # Normalize code for checking (lowercase for case-insensitive matching)
    code_lower = student_code.lower()
    
    for word in required:
        # Regex to find whole words only (e.g., 'if' but not 'elif')
        # Escaping the word is important if it contains special regex chars
        pattern = r'\b' + re.escape(word.lower()) + r'\b'
        if re.search(pattern, code_lower):
            found.append(word)
        else:
            missing.append(word)
            
    total = len(required)
    score = int((len(found) / total) * 100)
    
    feedback = f"Keyword Check: Found {len(found)} out of {total} required keywords.\n"
    
    if missing:
        feedback += f"Missing keywords: {', '.join(missing)}"
        is_correct = False
    else:
        feedback += "All required keywords are present!"
        is_correct = True
        
    return {
        "score": score,
        "feedback": feedback,
        "is_correct": is_correct,
        "logic_errors": [f"Missing required keyword: '{m}'" for m in missing]
    }