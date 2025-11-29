import xml.etree.ElementTree as ET
import re
from code_generators import get_generator

# --- IMPROVED LABEL MATCHING (REGEX) ---
# Matches: yes, y, yep, yeah, true, t, 1, ok
YES_PATTERN = re.compile(r"^\s*(y(es|ep|eah|up)?|t(rue)?|1|ok)\s*$", re.IGNORECASE)
# Matches: no, n, nope, nah, false, f, 0
NO_PATTERN = re.compile(r"^\s*(n(o|ope|ah)?|f(alse)?|0)\s*$", re.IGNORECASE)

def parse_drawio_xml(file_path, language='python', return_graph=False):
    try:
        nodes, edges = _build_graph(file_path)
    except Exception as e:
        raise Exception(f"Failed to build graph: {e}")

    start_node_id = None
    for node_id, data in nodes.items():
        if data['value'].lower() == 'start':
            start_node_id = node_id
            break
            
    if not start_node_id:
        raise Exception("Could not find a 'Start' node.")

    gen = get_generator(language)
    code_lines = gen.program_start()
    body_lines = _parse_block(start_node_id, None, nodes, edges, gen, indentation=1)
    code_lines.extend(body_lines)
    code_lines.extend(gen.program_end())
    
    final_code = "\n".join(code_lines)

    if return_graph:
        return final_code, nodes, edges, start_node_id
        
    return final_code

def _clean_value(text):
    if not text: return ""
    clean = re.sub(r'<[^>]+>', '', text)
    clean = clean.replace('&nbsp;', ' ').replace('&lt;', '<').replace('&gt;', '>').replace('&amp;', '&')
    return clean.strip()

def _build_graph(file_path):
    tree = ET.parse(file_path)
    root = tree.getroot()
    all_cells = root.findall(".//mxCell")
    nodes = {}; edges = {}
    for cell in all_cells:
        cell_id = cell.get('id')
        if not cell_id: continue
        value = _clean_value(cell.get('value', ''))
        style = cell.get('style', '')
        if cell.get('vertex') == '1':
            nodes[cell_id] = {'value': value, 'style': style}
        elif cell.get('edge') == '1':
            source_id = cell.get('source')
            target_id = cell.get('target')
            if source_id and target_id:
                if source_id not in edges: edges[source_id] = []
                # Store the value for later regex checking
                edges[source_id].append({'target': target_id, 'value': value})
    return nodes, edges

def _is_yes_label(text):
    return bool(YES_PATTERN.match(text))

def _is_no_label(text):
    return bool(NO_PATTERN.match(text))

def _parse_block(current_id, stop_id, nodes, edges, gen, indentation=0):
    code_lines = []
    indent_str = "    " * indentation
    current_node_id = current_id
    visited = set() 
    while current_node_id and current_node_id != stop_id:
        if current_node_id in visited: break 
        visited.add(current_node_id)
        node = nodes.get(current_node_id)
        if not node: break
        value = node['value']
        style = node['style']
        
        if value.lower() == 'start': pass
        elif value.lower() == 'end': return code_lines
        elif 'rhombus' in style:
            structure_code, next_node_id = _handle_decision(current_node_id, stop_id, nodes, edges, gen, indentation)
            code_lines.extend(structure_code)
            current_node_id = next_node_id
            continue
        elif 'rounded=1' in style or 'shape=rectangle' in style or 'parallelogram' in style:
            if value.lower().startswith("print ") or value.lower().startswith("output "):
                parts = value.split(" ", 1)
                content = parts[1] if len(parts) > 1 else ""
                code_lines.append(indent_str + gen.print(content))
            else:
                code_lines.append(indent_str + gen.statement(value))
        else:
            if value: code_lines.append(indent_str + gen.comment(f"IO/Other: {value}"))
        
        outgoing_edges = edges.get(current_node_id, [])
        
        if len(outgoing_edges) == 0:
            raise Exception(f"Node '{value}' has no outgoing connections. Please connect it to another block or 'End'.")

        if len(outgoing_edges) == 1: current_node_id = outgoing_edges[0]['target']
        elif len(outgoing_edges) > 1:
            code_lines.append(indent_str + gen.comment("WARNING: Fork detected. Following first path."))
            current_node_id = outgoing_edges[0]['target']
        else: current_node_id = None
    return code_lines

def _handle_decision(decision_id, stop_id, nodes, edges, gen, indentation):
    indent_str = "    " * indentation
    condition = nodes[decision_id]['value']
    branches = edges.get(decision_id, [])
    
    if not branches or len(branches) < 2: 
        raise Exception(f"Decision node '{condition}' is malformed. It must have at least 2 outgoing connections (e.g., Yes and No).")

    body_branch = None
    exit_branch = None
    for branch in branches:
        if _find_path(branch['target'], decision_id, nodes, edges): body_branch = branch
        else: exit_branch = branch
    if body_branch and exit_branch:
        code_lines = []
        code_lines.append(indent_str + gen.while_start(condition))
        body_code = _parse_block(body_branch['target'], decision_id, nodes, edges, gen, indentation + 1)
        code_lines.extend(body_code)
        if gen.block_end(): code_lines.append(indent_str + gen.block_end())
        return code_lines, exit_branch['target']
    
    code_lines = []
    
    # --- Updated Regex Logic ---
    # Find Explicit "Yes" Branch
    yes_branch = next((b for b in branches if _is_yes_label(b['value'])), None)
    
    # Find Explicit "No" Branch
    no_branch = next((b for b in branches if _is_no_label(b['value'])), None)
    
    # Smart Fallback Logic
    if not yes_branch:
        # If we found No, use the other as Yes. If neither found, default to index 0.
        if no_branch:
            yes_branch = next((b for b in branches if b != no_branch), None)
        else:
            yes_branch = branches[0]
            
    if not no_branch:
        # If we found Yes, use the other as No. If neither found, default to index 1.
        remaining = [b for b in branches if b != yes_branch]
        no_branch = remaining[0] if remaining else None

    join_node_id = _find_join_node(yes_branch['target'], no_branch['target'] if no_branch else None, nodes, edges)
    
    code_lines.append(indent_str + gen.if_start(condition))
    if_body = _parse_block(yes_branch['target'], join_node_id, nodes, edges, gen, indentation + 1)
    code_lines.extend(if_body)
    if gen.block_end(): code_lines.append(indent_str + gen.block_end())
    
    if no_branch:
        code_lines.append(indent_str + gen.else_start())
        else_body = _parse_block(no_branch['target'], join_node_id, nodes, edges, gen, indentation + 1)
        code_lines.extend(else_body)
        if gen.block_end(): code_lines.append(indent_str + gen.block_end())
        
    return code_lines, join_node_id

def _find_path(start_id, target_id, nodes, edges, visited=None):
    if visited is None: visited = set()
    visited.add(start_id)
    for edge in edges.get(start_id, []):
        next_id = edge['target']
        if next_id == target_id: return True
        if next_id not in visited and next_id in nodes:
            if _find_path(next_id, target_id, nodes, edges, visited): return True
    return False

def _find_join_node(yes_start_id, no_start_id, nodes, edges):
    yes_successors = set()
    q = [yes_start_id]; visited = {yes_start_id}
    while q:
        curr = q.pop(0)
        if not curr: continue
        yes_successors.add(curr)
        if 'rhombus' in nodes.get(curr, {}).get('style', ''): continue
        for edge in edges.get(curr, []):
            if edge['target'] not in visited: visited.add(edge['target']); q.append(edge['target'])
    if not no_start_id: return yes_start_id
    q = [no_start_id]; visited = {no_start_id}
    while q:
        curr = q.pop(0)
        if not curr: continue
        if curr in yes_successors: return curr
        if 'rhombus' in nodes.get(curr, {}).get('style', ''): continue
        for edge in edges.get(curr, []):
            if edge['target'] not in visited: visited.add(edge['target']); q.append(edge['target'])
    return None