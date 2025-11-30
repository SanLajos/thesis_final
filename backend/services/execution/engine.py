import subprocess
import sys
import os
import uuid

def run_command(command, input_str=None, timeout=5):
    """Helper to run shell commands with timeout and input."""
    try:
        process = subprocess.Popen(
            command,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        stdout, stderr = process.communicate(input=input_str, timeout=timeout)
        return {
            "success": process.returncode == 0,
            "output": stdout.strip(),
            "error": stderr.strip(),
            "timeout": False
        }
    except subprocess.TimeoutExpired:
        process.kill()
        return {
            "success": False,
            "output": "",
            "error": "Execution Timed Out (Possible Infinite Loop)",
            "timeout": True
        }
    except Exception as e:
        return {
            "success": False,
            "output": "",
            "error": f"System Error: {str(e)}",
            "timeout": False
        }

def execute_python(code, input_str):
    filename = f"temp_{uuid.uuid4().hex}.py"
    try:
        with open(filename, "w") as f: f.write(code)
        return run_command([sys.executable, filename], input_str)
    finally:
        if os.path.exists(filename): os.remove(filename)

def execute_cpp(code, input_str):
    # C++ requires compilation
    base_name = f"temp_{uuid.uuid4().hex}"
    source_file = f"{base_name}.cpp"
    exe_file = f"./{base_name}.out"
    
    try:
        with open(source_file, "w") as f: f.write(code)
        
        # 1. Compile
        compile_res = run_command(["g++", source_file, "-o", exe_file], timeout=10)
        if not compile_res['success']:
            return {"success": False, "output": "", "error": f"Compilation Error:\n{compile_res['error']}"}
            
        # 2. Execute
        return run_command([exe_file], input_str)
        
    finally:
        if os.path.exists(source_file): os.remove(source_file)
        if os.path.exists(exe_file): os.remove(exe_file)

def execute_java(code, input_str):
    # Java is tricky: Class name MUST match filename. 
    # We assume the generator creates 'public class Main'.
    # To avoid collisions, we create a unique folder.
    unique_dir = f"java_{uuid.uuid4().hex}"
    os.makedirs(unique_dir, exist_ok=True)
    source_file = os.path.join(unique_dir, "Main.java")
    
    try:
        with open(source_file, "w") as f: f.write(code)
        
        # 1. Compile
        compile_res = run_command(["javac", source_file], timeout=10)
        if not compile_res['success']:
            return {"success": False, "output": "", "error": f"Compilation Error:\n{compile_res['error']}"}
            
        # 2. Execute (classpath must include the temp dir)
        return run_command(["java", "-cp", unique_dir, "Main"], input_str)
        
    finally:
        # Cleanup folder
        for file in os.listdir(unique_dir):
            os.remove(os.path.join(unique_dir, file))
        os.rmdir(unique_dir)

def run_test_cases(code, test_cases, language='python'):
    """
    Runs a list of test cases against the code in the specified language.
    """
    results = []
    passed_count = 0
    
    executor = {
        'python': execute_python,
        'cpp': execute_cpp,
        'java': execute_java
    }.get(language)

    if not executor:
        return {"total": 0, "passed": 0, "results": [], "error": "Unsupported Language"}

    for tc in test_cases:
        inp = tc.get('input', '')
        expected = tc.get('output', '').strip()
        
        run_result = executor(code, inp)
        
        actual = run_result['output']
        # Normalize line endings for comparison
        is_match = run_result['success'] and (actual.replace('\r\n', '\n') == expected.replace('\r\n', '\n'))
        
        if is_match: passed_count += 1
            
        results.append({
            "input": inp,
            "expected": expected,
            "actual": actual,
            "passed": is_match,
            "error": run_result.get('error')
        })
        
    return {
        "total": len(test_cases),
        "passed": passed_count,
        "results": results
    }