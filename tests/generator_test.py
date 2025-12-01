import pytest
from backend.services.execution.generators import get_generator

def test_python_syntax():
    gen = get_generator('python')
    assert gen.program_start() == []
    assert gen.print("Hello") == "print(Hello)"
    assert gen.if_start("x == 1") == "if x == 1:"
    assert gen.block_end() is None # Python uses indentation, no end brace

def test_cpp_syntax():
    gen = get_generator('cpp')
    start = gen.program_start()
    assert "#include <iostream>" in start[0]
    assert "int main() {" in start[-1]
    
    assert gen.statement("int x = 5") == "int x = 5;"
    assert gen.print("Hello") == "cout << Hello << endl;"
    assert gen.if_start("x == 1") == "if (x == 1) {"
    assert gen.block_end() == "}"

def test_java_syntax():
    gen = get_generator('java')
    start = gen.program_start()
    assert "public class Main {" in start[0]
    
    # Test 'var' inference logic in generator
    assert gen.statement("x = 5") == "var x = 5;" 
    
    assert gen.print("Hello") == "System.out.println(Hello);"
    assert gen.block_end() == "}"