import re

def normalize_code(code_text):
    """
    Normalizes code for token-based comparison.
    Removes special characters but keeps alphanumeric tokens.
    """
    if not code_text: return set()
    # Remove symbols to focus on keywords and variables
    # Keep underscores as they are common in variable names
    clean_text = re.sub(r'[^\w\s]', ' ', code_text) 
    return set(clean_text.split())

def calculate_jaccard_similarity(code_a, code_b):
    """
    Calculates Jaccard Index: Intersection over Union of token sets.
    """
    tokens_a = normalize_code(code_a)
    tokens_b = normalize_code(code_b)
    
    if not tokens_a or not tokens_b: return 0
    
    intersection = tokens_a.intersection(tokens_b)
    union = tokens_a.union(tokens_b)
    
    if len(union) == 0: return 0
    
    return int((len(intersection) / len(union)) * 100)

def extract_graph_signature(nodes, edges):
    """
    Creates a structural fingerprint of the flowchart.
    Graph Signature = (Node Count, Edge Count, Degree Sequence Hash)
    """
    if not nodes: return None
    
    node_count = len(nodes)
    # Edges is {source_id: [target1, target2]}
    edge_count = sum(len(targets) for targets in edges.values())
    
    # Degree Sequence: List of outgoing edge counts per node
    degrees = []
    # nodes can be a dict or list of ids. If dict, iterate keys.
    node_iter = nodes.keys() if isinstance(nodes, dict) else nodes
    
    for n in node_iter:
        # edges.get(n, []) returns list of targets
        out_d = len(edges.get(n, []))
        degrees.append(out_d)
    
    degrees.sort()
    
    return {
        "n": node_count,
        "e": edge_count,
        "degrees": tuple(degrees)
    }

def calculate_structural_similarity(sig_a, sig_b):
    """
    Compares graph signatures. 
    Returns a score from 0 to 100.
    """
    if not sig_a or not sig_b: return 0
    
    # Compare Node Counts
    n_diff = abs(sig_a['n'] - sig_b['n'])
    n_max = max(sig_a['n'], sig_b['n'])
    n_score = 1.0 - (n_diff / n_max) if n_max > 0 else 1.0
    
    # Compare Edge Counts
    e_diff = abs(sig_a['e'] - sig_b['e'])
    e_max = max(sig_a['e'], sig_b['e'])
    e_score = 1.0 - (e_diff / e_max) if e_max > 0 else 1.0
    
    # Compare Topology (Degree Sequence Match)
    # Simple exact match bonus. Could be improved with sequence alignment but overkill for thesis.
    degree_bonus = 0.2 if sig_a['degrees'] == sig_b['degrees'] else 0.0
    
    # Weighted Score: Nodes (40%), Edges (40%), Topology Bonus (20% max boost)
    total = (n_score * 0.4) + (e_score * 0.4) + degree_bonus
    
    # Cap at 1.0 (100%)
    return int(min(1.0, total) * 100)

def detect_plagiarism(new_code, new_graph_sig, previous_submissions):
    """
    Hybrid Detection: Weighs Text Similarity (60%) and Structural Similarity (40%).
    previous_submissions: List of dicts containing 'generated_code' and optionally 'graph_signature'
    """
    highest_score = 0
    match_id = None
    
    for sub in previous_submissions:
        # 1. Text Score
        t_score = calculate_jaccard_similarity(new_code, sub.get('generated_code', ''))
        
        # 2. Structure Score
        s_score = 0
        prev_sig = sub.get('graph_signature')
        
        if new_graph_sig and prev_sig:
            s_score = calculate_structural_similarity(new_graph_sig, prev_sig)
            
            # Hybrid Weighting
            final_score = int((t_score * 0.6) + (s_score * 0.4))
        else:
            # Fallback to text only if structure is missing (e.g. image upload vs xml)
            final_score = t_score
        
        if final_score > highest_score:
            highest_score = final_score
            match_id = sub.get('id')
            
    return highest_score, match_id