import pytest
from backend.services.analysis.cfg import analyze_flowchart_cfg

def test_cfg_basic_flow():
    # A simple linear flow: Start -> Step1 -> End
    nodes = {
        '1': {'value': 'Start'},
        '2': {'value': 'x = 1'},
        '3': {'value': 'End'}
    }
    edges = {
        '1': [{'target': '2'}],
        '2': [{'target': '3'}]
    }
    
    stats = analyze_flowchart_cfg(nodes, edges, '1')
    assert stats['cyclomatic_complexity'] == 1
    assert len(stats['dead_code_nodes']) == 0

def test_cfg_dead_code_detection():
    # Disconnected node '4'
    nodes = {
        '1': {'value': 'Start'},
        '2': {'value': 'End'},
        '4': {'value': 'Lonely Node'}
    }
    edges = {
        '1': [{'target': '2'}]
    }
    
    stats = analyze_flowchart_cfg(nodes, edges, '1')
    assert len(stats['dead_code_nodes']) == 1
    assert stats['dead_code_nodes'][0]['id'] == '4'

def test_cfg_uninitialized_vars():
    # Using 'y' without defining it
    nodes = {
        '1': {'value': 'Start'},
        '2': {'value': 'x = y + 5'}, 
        '3': {'value': 'End'}
    }
    edges = {
        '1': [{'target': '2'}],
        '2': [{'target': '3'}]
    }
    
    stats = analyze_flowchart_cfg(nodes, edges, '1')
    assert len(stats['uninitialized_vars']) > 0
    assert "y" in stats['uninitialized_vars'][0]