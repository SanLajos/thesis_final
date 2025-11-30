import pytest
from backend.services.parsers.flowchart import _clean_value
from backend.services.parsers.nassi import _is_fuzzy_inside
from backend.services.analysis.complexity import calculate_cyclomatic_complexity

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