import pytest
from backend.services.parsers.nassi import _build_geometric_tree, _generate_node_code, _is_fuzzy_inside
from backend.services.execution.generators import get_generator

@pytest.fixture
def gen():
    return get_generator('python')

def test_fuzzy_inside_logic():
    # Outer: 100x100 box at (0,0)
    outer = {'x': 0, 'y': 0, 'w': 100, 'h': 100}
    
    # Inner: 50x50 box at (10,10) -> Clearly inside
    inner = {'x': 10, 'y': 10, 'w': 50, 'h': 50}
    assert _is_fuzzy_inside(inner, outer) is True

    # Overlap: 50x50 box at (90, 90) -> Only small intersection
    # Intersection area = (100-90)*(100-90) = 10*10 = 100
    # Inner area = 2500. Ratio = 0.04. Should be False.
    overlap = {'x': 90, 'y': 90, 'w': 50, 'h': 50}
    assert _is_fuzzy_inside(overlap, outer) is False

def test_tree_building():
    """
    Simulate:
    [ Outer Loop       ]
    [ [ Inner Step ]   ]
    """
    nodes = [
        # Outer
        {'id': '1', 'value': 'while True', 'x': 0, 'y': 0, 'w': 200, 'h': 200, 'children': []},
        # Inner
        {'id': '2', 'value': 'print "hi"', 'x': 50, 'y': 50, 'w': 100, 'h': 50, 'children': []}
    ]

    roots = _build_geometric_tree(nodes)
    
    assert len(roots) == 1 # Only outer should be root
    assert roots[0]['id'] == '1'
    assert len(roots[0]['children']) == 1
    assert roots[0]['children'][0]['id'] == '2'

def test_nassi_code_generation(gen):
    # Mock a nested tree structure directly
    tree_node = {
        'value': 'while x < 5',
        'x': 0, 'y': 0, 'w': 100, 'h': 100,
        'children': [
            {'value': 'print "Looping"', 'x': 10, 'y': 10, 'w': 80, 'h': 40, 'children': []}
        ]
    }
    
    code = _generate_node_code(tree_node, gen, indent=0)
    
    assert code[0] == "while x < 5:"
    assert code[1] == "    print(\"Looping\")"