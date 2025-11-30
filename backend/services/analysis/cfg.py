from collections import deque
import re

class CFGAnalyzer:
    def __init__(self, nodes, edges, start_node_id):
        self.nodes = nodes
        self.edges = edges
        self.start_node_id = start_node_id
        self.reachable_nodes = set()
        self.cfg_stats = {
            "total_nodes": len(nodes),
            "total_edges": sum(len(targets) for targets in edges.values()),
            "dead_code_nodes": [],
            "infinite_loops_detected": False,
            "cyclomatic_complexity": 0,
            "uninitialized_vars": [],
            "cfg_dot": "" # NEW: DOT representation
        }

    def analyze(self):
        """Performs the full analysis suite."""
        self._find_reachable_nodes()
        self._detect_dead_code()
        self._calculate_complexity()
        self._analyze_data_flow()
        self._generate_dot_graph() # NEW
        return self.cfg_stats

    def _find_reachable_nodes(self):
        queue = deque([self.start_node_id])
        visited = {self.start_node_id}
        while queue:
            current_id = queue.popleft()
            self.reachable_nodes.add(current_id)
            if current_id in self.edges:
                for edge in self.edges[current_id]:
                    target_id = edge['target']
                    if target_id not in visited:
                        visited.add(target_id)
                        queue.append(target_id)

    def _detect_dead_code(self):
        all_node_ids = set(self.nodes.keys())
        dead_code = all_node_ids - self.reachable_nodes
        for node_id in dead_code:
            node_val = self.nodes[node_id].get('value', 'Unknown')
            self.cfg_stats["dead_code_nodes"].append({
                "id": node_id,
                "value": node_val
            })

    def _calculate_complexity(self):
        p = 1
        reachable_e = 0
        for u in self.reachable_nodes:
            if u in self.edges:
                reachable_e += len([edge for edge in self.edges[u] if edge['target'] in self.reachable_nodes])
        reachable_n = len(self.reachable_nodes)
        complexity = reachable_e - reachable_n + 2 * p
        self.cfg_stats["cyclomatic_complexity"] = max(1, complexity)

    def _analyze_data_flow(self):
        defined_vars = set()
        queue = deque([self.start_node_id])
        visited = {self.start_node_id}
        
        while queue:
            curr = queue.popleft()
            val = self.nodes[curr].get('value', '')
            
            # 1. Assignment Detection (e.g., "x = 5")
            if '=' in val and not any(op in val for op in ['==', '!=', '<=', '>=']):
                parts = val.split('=')
                lhs = parts[0].strip()
                rhs = parts[1].strip()
                
                rhs_tokens = re.findall(r'[a-zA-Z_][a-zA-Z0-9_]*', rhs)
                for token in rhs_tokens:
                    if token not in ['true', 'false', 'None'] and token not in defined_vars:
                        self.cfg_stats['uninitialized_vars'].append(f"Variable '{token}' used in '{val}' might be uninitialized.")
                
                if lhs.isidentifier():
                    defined_vars.add(lhs)

            # 2. Condition Detection
            elif any(op in val for op in ['<', '>', '==', '!=']):
                tokens = re.findall(r'[a-zA-Z_][a-zA-Z0-9_]*', val)
                for t in tokens:
                    if t not in ['if', 'while', 'for', 'true', 'false', 'and', 'or', 'not'] and t not in defined_vars:
                        self.cfg_stats['uninitialized_vars'].append(f"Variable '{t}' used in condition '{val}' might be uninitialized.")

            if curr in self.edges:
                for edge in self.edges[curr]:
                    if edge['target'] not in visited:
                        visited.add(edge['target'])
                        queue.append(edge['target'])

    def _generate_dot_graph(self):
        """
        Generates a Graphviz DOT string representation of the CFG.
        This can be rendered by the frontend or external tools.
        """
        dot_lines = ["digraph CFG {", "  node [shape=box, fontname=\"Helvetica\"];"]
        
        # Add Nodes
        for node_id in self.reachable_nodes:
            label = self.nodes[node_id].get('value', 'Node').replace('"', '\\"')
            # Style shapes based on type
            shape_attr = ""
            style = self.nodes[node_id].get('style', '')
            if 'rhombus' in style: shape_attr = ", shape=diamond"
            elif 'ellipse' in style: shape_attr = ", shape=oval" # Start/End
            
            dot_lines.append(f'  "{node_id}" [label="{label}"{shape_attr}];')
            
        # Add Edges
        for src in self.reachable_nodes:
            if src in self.edges:
                for edge in self.edges[src]:
                    tgt = edge['target']
                    if tgt in self.reachable_nodes:
                        label = edge.get('value', '')
                        label_attr = f' [label="{label}"]' if label else ""
                        dot_lines.append(f'  "{src}" -> "{tgt}"{label_attr};')
                        
        dot_lines.append("}")
        self.cfg_stats["cfg_dot"] = "\n".join(dot_lines)

def analyze_flowchart_cfg(nodes, edges, start_node_id):
    analyzer = CFGAnalyzer(nodes, edges, start_node_id)
    return analyzer.analyze()