import pytest
from keyword_grader import grade_with_keywords
from static_analysis_grader import analyze_code_style, calculate_halstead_metrics

# --- KEYWORD GRADER TESTS ---

def test_keyword_grader_success():
    code = "while x < 10:\n    print(x)"
    required = "while, print"
    result = grade_with_keywords(code, required)
    assert result['is_correct'] is True
    assert result['score'] == 100

def test_keyword_grader_partial():
    code = "x = 10"
    required = ["while", "print"] # List format
    result = grade_with_keywords(code, required)
    assert result['is_correct'] is False
    assert result['score'] == 0
    assert "Missing keywords" in result['feedback']

# --- STATIC ANALYSIS TESTS ---

def test_halstead_metrics_empty():
    assert calculate_halstead_metrics("") == {}

def test_halstead_metrics_calculation():
    code = "x = a + b"
    metrics = calculate_halstead_metrics(code)
    # Check that keys exist and values are calculated
    assert 'vocabulary' in metrics
    assert 'difficulty' in metrics
    assert metrics['vocabulary'] > 0

def test_code_style_python_naming():
    # 'CamelCaseVar' is bad style in Python (should be snake_case)
    bad_code = "CamelCaseVar = 10" 
    report = analyze_code_style(bad_code, 'python')
    
    found_naming_issue = any("snake_case" in issue for issue in report['issues'])
    assert found_naming_issue is True
    assert report['style_score'] < 100

def test_code_style_nesting_depth():
    deep_code = """
    if a:
        if b:
            if c:
                if d:
                    if e:
                        print("Too deep")
    """
    report = analyze_code_style(deep_code, 'python')
    assert "nested too deeply" in report['issues'][0]
    assert report['max_nesting'] >= 5