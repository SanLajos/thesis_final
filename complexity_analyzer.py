import re

def calculate_cyclomatic_complexity(code, language='python'):
    """
    Calculates Cyclomatic Complexity using keyword counting (McCabe's approx).
    Formula: M = P + 1
    Where P is the number of decision points (if, while, for, case, etc.)
    """
    if not code: return 1
    complexity = 1
    
    # Remove comments to avoid false positives
    # This is a simple removal, advanced parsing would be better but complex
    lines = code.split('\n')
    clean_lines = []
    for line in lines:
        line = line.strip()
        if not line: continue
        if language == 'python' and line.startswith('#'): continue
        if language in ['cpp', 'java'] and line.startswith('//'): continue
        clean_lines.append(line)
    clean_code = '\n'.join(clean_lines)

    decision_patterns = []
    if language == 'python':
        decision_patterns = [
            r'\bif\b', r'\belif\b', r'\bfor\b', r'\bwhile\b', 
            r'\bexcept\b', r'\band\b', r'\bor\b'
        ]
    else: # C++ / Java
        decision_patterns = [
            r'\bif\s*\(', r'\belse\s+if\b', r'\bfor\s*\(', 
            r'\bwhile\s*\(', r'\bcase\b', r'\bcatch\b', 
            r'&&', r'\|\|', r'\?' # Ternary operator
        ]

    for p in decision_patterns:
        complexity += len(re.findall(p, clean_code))
        
    return complexity