class CodeGenerator:
    """Base Interface"""
    def get_extension(self): return ".txt"
    def program_start(self): return []
    def program_end(self): return []
    def comment(self, text): return f"# {text}"
    def if_start(self, condition): return f"if {condition}:"
    def else_start(self): return "else:"
    def while_start(self, condition): return f"while {condition}:"
    def block_end(self): return None 
    def statement(self, text): return text 
    def print(self, text): return f"print({text})"

class PythonGenerator(CodeGenerator):
    def get_extension(self): return ".py"

class CppGenerator(CodeGenerator):
    def get_extension(self): return ".cpp"
    def program_start(self): return ["#include <iostream>", "using namespace std;", "", "int main() {"]
    def program_end(self): return ["    return 0;", "}"]
    def comment(self, text): return f"// {text}"
    def if_start(self, condition): return f"if ({condition}) {{"
    def else_start(self): return "} else {"
    def while_start(self, condition): return f"while ({condition}) {{"
    def block_end(self): return "}"
    def statement(self, text): 
        if "=" in text and not text.strip().startswith("auto "): return f"auto {text};"
        return f"{text};"
    def print(self, text): return f'cout << {text} << endl;'

class JavaGenerator(CodeGenerator):
    def get_extension(self): return ".java"
    def program_start(self): return ["public class Main {", "    public static void main(String[] args) {"]
    def program_end(self): return ["    }", "}"]
    def comment(self, text): return f"// {text}"
    def if_start(self, condition): return f"if ({condition}) {{"
    def else_start(self): return "} else {"
    def while_start(self, condition): return f"while ({condition}) {{"
    def block_end(self): return "}"
    def statement(self, text): 
        if "=" in text and not text.strip().startswith("var "): return f"var {text};"
        return f"{text};"
    def print(self, text): return f"System.out.println({text});"

def get_generator(language):
    if language == 'cpp': return CppGenerator()
    if language == 'java': return JavaGenerator()
    return PythonGenerator()