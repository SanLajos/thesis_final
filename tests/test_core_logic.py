import pytest
from code_generators import get_generator
from complexity_analyzer import calculate_cyclomatic_complexity
from plagiarism_detector import detect_plagiarism, calculate_jaccard_similarity

# --- 1. CODE GENERATOR TESTS ---

def test_python_generator_syntax():
    gen = get_generator('python')
    assert gen.print("Hello") == "print(Hello)"
    assert gen.if_start("x > 5") == "if x > 5:"
    assert gen.comment("Test") == "# Test"

def test_cpp_generator_syntax():
    gen = get_generator('cpp')
    # C++ specific syntax checks
    assert "cout <<" in gen.print("Hello")
    assert ";" in gen.statement("x = 10")
    assert "auto" in gen.statement("x = 10") # Checks type inference logic
    assert gen.block_end() == "}"

def test_java_generator_syntax():
    gen = get_generator('java')
    # Java specific checks
    assert "System.out.println" in gen.print("Hello")
    assert "public class Main" in gen.program_start()[0]
    assert "var" in gen.statement("x = 10")

# --- 2. COMPLEXITY ANALYZER TESTS ---

def test_complexity_calculation_python():
    code = """
    if x > 0:
        print("pos")
    elif x < 0:
        print("neg")
    else:
        print("zero")
    while True:
        break
    """
    # Expected: 1 (base) + 1 (if) + 1 (elif) + 1 (while) = 4
    assert calculate_cyclomatic_complexity(code, 'python') == 4

def test_complexity_calculation_cpp():
    code = """
    if (x > 0) { return 1; }
    else if (y < 0) { return -1; }
    for (int i=0; i<10; i++) { }
    """
    # Expected: 1 (base) + 1 (if) + 1 (else if) + 1 (for) = 4
    assert calculate_cyclomatic_complexity(code, 'cpp') == 4

# --- 3. PLAGIARISM DETECTOR TESTS ---

def test_jaccard_similarity_identical():
    code_a = "x = 5\nprint(x)"
    code_b = "x = 5\nprint(x)"
    assert calculate_jaccard_similarity(code_a, code_b) == 100

def test_jaccard_similarity_different():
    code_a = "x = 5"
    code_b = "y = 10"
    # Should be low or zero depending on token overlap (likely 0 here)
    assert calculate_jaccard_similarity(code_a, code_b) == 0

def test_plagiarism_detection_logic():
    # Mock database submissions
    prev_subs = [
        {'id': 1, 'generated_code': 'print("hello")', 'graph_signature': {'n': 5, 'e': 4, 'degrees': (1,1,2,2,2)}},
        {'id': 2, 'generated_code': 'x = 1', 'graph_signature': None}
    ]
    
    # Test Exact Text Match
    new_code = 'print("hello")'
    score, match_id = detect_plagiarism(new_code, None, prev_subs)
    assert score == 100
    assert match_id == 1