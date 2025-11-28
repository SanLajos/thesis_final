import pytest
from flowchart_diagram_parser import _clean_value, _build_graph
from nassi_shneiderman_parser import _is_fuzzy_inside
from complexity_analyzer import calculate_cyclomatic_complexity

# --- FLOWCHART UTILS TESTS ---

def test_clean_value_html():
    """Test HTML tag stripping from Draw.io XML."""
    raw = "<div><b>Start</b> Process</div>"
    clean = _clean_value(raw)
    assert clean == "Start Process"

def test_clean_value_entities():
    """Test XML entity decoding."""
    raw = "x &lt; 10 &amp;&amp; y &gt; 5"
    clean = _clean_value(raw)
    assert clean == "x < 10 && y > 5"

# --- NASSI-SHNEIDERMAN TESTS ---

def test_fuzzy_geometry_detection():
    """Test if the parser correctly detects nested blocks."""
    # Outer block (Container)
    outer = {'x': 0, 'y': 0, 'w': 100, 'h': 100}
    
    # Inner block (Fully inside)
    inner_full = {'x': 10, 'y': 10, 'w': 50, 'h': 50}
    assert _is_fuzzy_inside(inner_full, outer) is True
    
    # Outside block
    outside = {'x': 200, 'y': 200, 'w': 50, 'h': 50}
    assert _is_fuzzy_inside(outside, outer) is False
    
    # Partially overlapping (Should be False for strict nesting)
    partial = {'x': 80, 'y': 80, 'w': 50, 'h': 50}
    assert _is_fuzzy_inside(partial, outer) is False

# --- COMPLEXITY ANALYZER TESTS ---

def test_cyclomatic_complexity_simple():
    """Test basic sequential code."""
    code = """
    print("Hello")
    x = 5
    y = 10
    """
    # M = 1 (Base) + 0 (Decisions)
    assert calculate_cyclomatic_complexity(code, 'python') == 1

def test_cyclomatic_complexity_complex():
    """Test code with branches and loops."""
    code = """
    if x > 10:
        print("High")
    elif x < 5:
        while True:
            print("Loop")
    else:
        print("Mid")
    """
    # Decisions: if, elif, while = 3
    # M = 3 + 1 = 4
    assert calculate_cyclomatic_complexity(code, 'python') == 4

def test_cpp_complexity():
    """Test C++ syntax parsing."""
    code = """
    if (x > 0) {
        return 1;
    } else if (x < 0) {
        return -1;
    }
    """
    # Decisions: if, else if = 2
    # M = 2 + 1 = 3
    assert calculate_cyclomatic_complexity(code, 'cpp') == 3