import xml.etree.ElementTree as ET
from code_generators import get_generator

def parse_nassi_shneiderman_xml(file_path, language='python'):
    try:
        nodes = _parse_xml_geometry(file_path)
    except Exception as e:
        raise Exception(f"Failed to parse XML geometry: {e}")
    if not nodes: raise Exception("No blocks found in the diagram.")
    root_nodes = _build_geometric_tree(nodes)
    root_nodes.sort(key=lambda x: x['y'])
    gen = get_generator(language)
    code_lines = gen.program_start()
    for node in root_nodes:
        code_lines.extend(_generate_node_code(node, gen))
    code_lines.extend(gen.program_end())
    return "\n".join(code_lines)

def _parse_xml_geometry(file_path):
    tree = ET.parse(file_path); root = tree.getroot()
    nodes = []
    for cell in root.findall(".//mxCell"):
        if cell.get('vertex') != '1': continue
        cell_id = cell.get('id')
        value = cell.get('value', '').strip()
        if not value: continue
        geo = cell.find('mxGeometry')
        if geo is None: continue
        try:
            nodes.append({
                'id': cell_id, 'value': value,
                'x': float(geo.get('x', 0)), 'y': float(geo.get('y', 0)),
                'w': float(geo.get('width', 0)), 'h': float(geo.get('height', 0)),
                'children': []
            })
        except ValueError: continue
    return nodes

def _build_geometric_tree(nodes):
    nodes.sort(key=lambda n: n['w'] * n['h'])
    roots = []
    for i, inner in enumerate(nodes):
        parent = None
        for j in range(i + 1, len(nodes)):
            outer = nodes[j]
            if _is_fuzzy_inside(inner, outer):
                outer['children'].append(inner)
                parent = outer
                break 
        if parent is None: roots.append(inner)
    return roots

def _is_fuzzy_inside(inner, outer):
    x_left = max(inner['x'], outer['x'])
    y_top = max(inner['y'], outer['y'])
    x_right = min(inner['x'] + inner['w'], outer['x'] + outer['w'])
    y_bottom = min(inner['y'] + inner['h'], outer['y'] + outer['h'])
    if x_right < x_left or y_bottom < y_top: return False
    intersection_area = (x_right - x_left) * (y_bottom - y_top)
    inner_area = inner['w'] * inner['h']
    return (intersection_area / inner_area) > 0.8

def _generate_node_code(node, gen, indent=1):
    lines = []; prefix = "    " * indent
    val = node['value'].lower(); raw_val = node['value']
    
    # 1. Handle Loops
    if val.startswith('while ') or val.startswith('for '):
        lines.append(prefix + gen.while_start(raw_val.replace('while ', '').replace('for ', '')))
        node['children'].sort(key=lambda c: c['y'])
        for child in node['children']: lines.extend(_generate_node_code(child, gen, indent + 1))
        if gen.block_end(): lines.append(prefix + gen.block_end())
    
    # 2. Handle Decisions (Expanded Logic)
    # Checks for 'if', '?', '<', '>' but ensures it's not a print statement
    elif (val.startswith('if ') or '?' in val or '<' in val or '>' in val) and not (val.startswith('print ') or val.startswith('output ')):
        
        # Clean condition string
        condition = raw_val
        if val.startswith('if '):
            condition = raw_val[3:] # Remove 'if ' prefix
        
        # Remove question marks as they are visual cues, not syntax
        condition = condition.replace('?', '').strip()

        lines.append(prefix + gen.if_start(condition))
        
        # Geometric Logic for True/False branches (Left=True, Right=False convention)
        mid_x = node['x'] + (node['w'] / 2)
        true_children = [c for c in node['children'] if (c['x'] + c['w']/2) < mid_x]
        false_children = [c for c in node['children'] if (c['x'] + c['w']/2) >= mid_x]
        
        true_children.sort(key=lambda c: c['y'])
        false_children.sort(key=lambda c: c['y'])
        
        for child in true_children: lines.extend(_generate_node_code(child, gen, indent + 1))
        if gen.block_end(): lines.append(prefix + gen.block_end())
        
        if false_children:
            lines.append(prefix + gen.else_start())
            for child in false_children: lines.extend(_generate_node_code(child, gen, indent + 1))
            if gen.block_end(): lines.append(prefix + gen.block_end())
            
    # 3. Handle Statements
    else:
        if val.startswith("print ") or val.startswith("output "):
            content = raw_val.split(" ", 1)[1]
            lines.append(prefix + gen.print(content))
        else: lines.append(prefix + gen.statement(raw_val))
    return lines