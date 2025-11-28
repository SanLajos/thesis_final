import re
import math

def calculate_halstead_metrics(code):
    """
    Calculates Halstead Complexity Measures based on operators and operands.
    Returns dictionary of metrics.
    """
    if not code: return {}

    # Simplified tokenization for thesis demonstration
    # Real implementations would use a lexer like 'tokenize' or 'pygments'
    
    operators = {
        '+', '-', '*', '/', '%', '=', '==', '!=', '<', '>', '<=', '>=',
        'and', 'or', 'not', 'if', 'else', 'while', 'for', 'return', 'def', 'class',
        '(', ')', '[', ']', '{', '}', ',', ':', '.'
    }
    
    words = re.findall(r'\b\w+\b', code)
    symbols = re.findall(r'[^\w\s]', code)
    
    n1_operators = 0
    n2_operands = 0
    unique_operators = set()
    unique_operands = set()
    
    # Classify tokens
    for w in words:
        if w in operators:
            n1_operators += 1
            unique_operators.add(w)
        else:
            n2_operands += 1
            unique_operands.add(w)
            
    for s in symbols:
        if s in operators:
            n1_operators += 1
            unique_operators.add(s)
            
    # Calculations
    n1 = len(unique_operators) # Vocabulary of operators
    n2 = len(unique_operands)  # Vocabulary of operands
    N1 = n1_operators          # Total operators
    N2 = n2_operands           # Total operands
    
    vocabulary = n1 + n2
    length = N1 + N2
    
    if vocabulary == 0: return {}

    volume = length * math.log2(vocabulary) if vocabulary > 0 else 0
    difficulty = (n1 / 2) * (N2 / n2) if n2 > 0 else 0
    effort = difficulty * volume
    
    return {
        "vocabulary": vocabulary,
        "length": length,
        "volume": round(volume, 2),
        "difficulty": round(difficulty, 2),
        "effort": round(effort, 2)
    }

def detect_code_smells(code, language='python'):
    """
    Detects common code smells using regex heuristics.
    """
    smells = []
    lines = code.split('\n')
    
    # 1. Long Method
    # Simple heuristic: count lines in a block. 
    # For generated code, we look at total length or large indented blocks.
    if len(lines) > 50:
        smells.append("Long Method: The generated code is quite long (>50 lines). Consider breaking it down.")

    # 2. Large Class (Not applicable for simple scripts, skipping)

    # 3. Deep Nesting (Complexity)
    max_depth = 0
    for line in lines:
        if language == 'python':
            indent = len(line) - len(line.lstrip())
            max_depth = max(max_depth, indent // 4)
        # (C++/Java would count braces)

    if max_depth > 3:
        smells.append(f"Deep Nesting: Detected nesting level of {max_depth}. This reduces readability.")

    # 4. Long Lines
    for i, line in enumerate(lines):
        if len(line) > 120:
            smells.append(f"Long Line: Line {i+1} is over 120 characters.")

    # 5. Magic Numbers
    # Find numbers that are not 0, 1, -1 assigned to variables
    # This is a rough heuristic
    magic_nums = re.findall(r'= \s*(\d+)', code)
    for num in magic_nums:
        if num not in ['0', '1', '-1'] and len(num) > 1: # Ignore single digits to reduce noise
             smells.append(f"Magic Number: Found assignment of raw number '{num}'. Use named constants.")
             break # Only report once

    return smells

def analyze_code_style(code, language='python'):
    """
    Performs static analysis on the generated code.
    Checks: Naming conventions, Nesting depth, Line length.
    """
    if not code:
        return {
            "style_score": 0,
            "issues": ["No code generated to analyze."],
            "max_nesting": 0,
            "halstead": {},
            "smells": []
        }

    issues = []
    score = 100
    lines = code.split('\n')
    max_depth = 0
    
    variables = set()
    # Heuristic to find variable assignments
    if language == 'python':
        var_pattern = r'^\s*([a-zA-Z0-9_]+)\s*='
        naming_regex = r'^[a-z_][a-z0-9_]*$' # snake_case
        bad_naming_msg = "Variable '{}' is not snake_case (Python standard)."
    else:
        # C++/Java
        var_pattern = r'^\s*(?:int|float|double|string|auto|var|char|bool)\s+([a-zA-Z0-9_]+)\s*='
        naming_regex = r'^[a-z][a-zA-Z0-9]*$' # camelCase
        bad_naming_msg = "Variable '{}' is not camelCase (Standard convention)."

    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped: continue
        
        # Line Length
        if len(line) > 80:
            issues.append(f"Line {i+1} is too long (>80 chars).")
            score -= 2

        # Nesting Depth
        if language == 'python':
            indent = len(line) - len(line.lstrip(' '))
            depth = indent // 4
            max_depth = max(max_depth, depth)
        # (Simple depth check)
        
        # Naming
        match = re.search(var_pattern, stripped)
        if match:
            var_name = match.group(1)
            if not re.match(naming_regex, var_name):
                issues.append(bad_naming_msg.format(var_name))
                score -= 5

    if max_depth > 4:
        issues.append(f"Code is nested too deeply ({max_depth} levels).")
        score -= 10

    # --- NEW ANALYSES ---
    halstead = calculate_halstead_metrics(code)
    smells = detect_code_smells(code, language)
    
    # Deduct score for smells
    score -= (len(smells) * 5)

    return {
        "style_score": max(0, score),
        "issues": issues,
        "max_nesting": max_depth,
        "halstead": halstead, # NEW
        "smells": smells      # NEW
    }