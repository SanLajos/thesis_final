import pytest
from backend.services.analysis.complexity import calculate_cyclomatic_complexity
from backend.services.grading.static_analysis import analyze_code_style, calculate_halstead_metrics
from backend.services.analysis.plagiarism import detect_plagiarism

# --- COMPLEXITY ---
def test_complexity_nested_loops():
    code = """
    for i in range(10):      # +1
        if i % 2 == 0:       # +1
            print("even")
        while x < 5:         # +1
            x += 1
    """
    # Base 1 + 3 decisions = 4
    assert calculate_cyclomatic_complexity(code, 'python') == 4

def test_complexity_switch_case_cpp():
    code = """
    switch(x) {
        case 1: break;  // +1
        case 2: break;  // +1
        default: break;
    }
    """
    # Base 1 + 2 cases = 3
    assert calculate_cyclomatic_complexity(code, 'cpp') == 3

# --- STATIC ANALYSIS ---
def test_halstead_simple_math():
    code = "z = x + y"
    metrics = calculate_halstead_metrics(code)
    
    # Vocab: z, =, x, +, y (5 unique tokens roughly)
    assert metrics['vocabulary'] > 0
    assert metrics['volume'] > 0
    assert 'effort' in metrics

def test_style_check_long_lines():
    long_line = "x = " + "1" * 100 # > 80 chars
    report = analyze_code_style(long_line, 'python')
    
    assert any("too long" in issue for issue in report['issues'])
    assert report['style_score'] < 100

# --- PLAGIARISM ---
def test_plagiarism_hybrid_logic():
    # 1. Exact text match
    sub1 = {'id': 101, 'generated_code': 'print("hello world")', 'graph_signature': {'n':2, 'e':1, 'degrees':(1,1)}}
    new_code = 'print("hello world")'
    new_sig = {'n':2, 'e':1, 'degrees':(1,1)}
    
    score, match_id = detect_plagiarism(new_code, new_sig, [sub1])
    assert score == 100
    assert match_id == 101

    # 2. Structural match only (Different variable names)
    # Text: "x = 5" vs "print('hello world')" -> Jaccard ~0
    # Structure: Identical
    # Hybrid score should be weighted (40% structure)
    score_struct, _ = detect_plagiarism("x = 5", new_sig, [sub1])
    # 0.6*0 + 0.4*100 = 40
    assert score_struct >= 40