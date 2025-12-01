import React, { useState } from 'react';
import { api } from '../services/ApiService';
// UPDATE: Import Play, Terminal, Loader2 icons
import { Play, Terminal, Loader2 } from 'lucide-react'; 

export const StudentSubmission = ({
  currentAssignment,
  setView,
  setGradingResult,
}) => {
  // Guard: no assignment selected
  if (!currentAssignment) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold text-slate-800 mb-2">
          No assignment selected
        </h2>
        <p className="text-slate-500">
          Please go back to the dashboard and choose an assignment before
          submitting.
        </p>
      </div>
    );
  }

  // --- STATE MANAGEMENT ---
  const [code, setCode] = useState('');
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState(''); 
  const [diagramType, setDiagramType] = useState('flowchart'); 
  const [submissionMode, setSubmissionMode] = useState('xml'); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  // NEW STATE for Execution
  const [isRunning, setIsRunning] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState(null);
  const [stdInput, setStdInput] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Enforce Mandatory File Upload
    if (!file) {
      alert("Please upload a file to proceed.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('assignment_id', currentAssignment.id);
      
      // Append New Fields
      formData.append('description', description);
      formData.append('diagram_type', diagramType);
      formData.append('submission_mode', submissionMode);

      if (code.trim()) {
        formData.append('code', code);
      }

      if (file) {
        formData.append('diagram_file', file);
      }

      const res = await api.request(
        `/submit/${currentAssignment.id}`,
        'POST',
        formData,
        true // multipart
      );

      if (!res.ok) {
        console.error('Submission failed', res);
        alert('Submission failed. Please try again.');
        return;
      }

      const data = res.data || {};
      
      setGradingResult({
        grading_result: data.grading_result ?? null,
        generated_code: data.generated_code ?? '',
        method_used: data.method_used ?? 'unknown',
        language: currentAssignment.language,
        assignment_title: currentAssignment.title,
        student_name: data.student_name ?? '',
        submitted_at: data.submitted_at ?? new Date().toISOString(),
        complexity: data.complexity ?? 0, 
      });

      setView('grading');
    } catch (err) {
      console.error('Submission error', err);
      alert('Unexpected error during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- NEW FUNCTION: Handle Code Execution ---
  const handleRunCode = async () => {
    if (!code.trim()) {
        alert("Please enter some code to run.");
        return;
    }
    
    setIsRunning(true);
    setConsoleOutput(null); // Clear previous output

    try {
        const res = await api.request('/execute', 'POST', {
            code: code,
            language: currentAssignment.language,
            input_str: stdInput
        });

        if (res.ok) {
            setConsoleOutput(res.data);
        } else {
            setConsoleOutput({ success: false, error: res.data.error || "Execution failed" });
        }
    } catch (e) {
        setConsoleOutput({ success: false, error: "Network Error" });
    } finally {
        setIsRunning(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1B3147] mb-1">
          Submit assignment
        </h1>
        <p className="text-slate-500 text-sm">
          {currentAssignment.title} · {currentAssignment.language}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6"
      >
        {/* --- 1. CONFIGURATION ROW --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Diagram Type
            </label>
            <select 
              value={diagramType}
              onChange={(e) => setDiagramType(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#40E0D0]"
            >
              <option value="flowchart">Flowchart</option>
              <option value="nassi_shneiderman">Nassi-Shneiderman</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              File Format
            </label>
            <select 
              value={submissionMode}
              onChange={(e) => setSubmissionMode(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#40E0D0]"
            >
              <option value="xml">XML (Draw.io)</option>
              <option value="image">Image (PNG/JPG)</option>
            </select>
          </div>
        </div>

        {/* --- 2. DESCRIPTION INPUT --- */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Logic Description (Optional)
          </label>
          <p className="text-xs text-slate-400 mb-2">
            Describe your algorithm to help the AI understand your logic better.
          </p>
          <textarea
            className="w-full min-h-[80px] border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#40E0D0]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., This loop iterates through the array to find the maximum value..."
          />
        </div>

        {/* --- 3. FILE UPLOAD (MANDATORY) --- */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
          <label className="block text-sm font-bold text-slate-800 mb-1">
            Upload Diagram File (Mandatory)
          </label>
          <input
            type="file"
            required // HTML5 validation
            className="block w-full text-sm text-slate-600 mt-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        {/* --- 4. CODE EDITOR & PLAYGROUND (Modified) --- */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Code Playground ({currentAssignment.language})
          </label>
          <p className="text-xs text-slate-400 mb-2">
            Test your generated code here before submitting.
          </p>
          <div className="border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#40E0D0]">
              <textarea
                className="w-full min-h-[150px] p-3 text-sm font-mono outline-none resize-y bg-slate-50"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={`Type or paste your ${currentAssignment.language} code here to test it...`}
              />
              
              {/* Playground Toolbar */}
              <div className="bg-slate-100 p-2 flex gap-2 border-t border-slate-200 items-center">
                  <input 
                    placeholder="Stdin Input (Optional)" 
                    className="flex-1 text-sm p-1.5 rounded border border-slate-300 outline-none focus:border-[#40E0D0]"
                    value={stdInput}
                    onChange={(e) => setStdInput(e.target.value)}
                  />
                  <button 
                    type="button" // Important: Prevent form submission
                    onClick={handleRunCode}
                    disabled={isRunning || !code.trim()}
                    className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {isRunning ? <Loader2 className="animate-spin" size={16}/> : <Play size={16}/>}
                    Run Code
                  </button>
              </div>
          </div>

          {/* Console Output Area */}
          {consoleOutput && (
              <div className={`mt-2 p-3 rounded-lg text-sm font-mono whitespace-pre-wrap border ${consoleOutput.success ? 'bg-slate-900 text-green-400 border-slate-700' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  <div className="flex items-center gap-2 border-b border-white/10 pb-1 mb-2 opacity-70">
                    <Terminal size={14}/> Console Output
                  </div>
                  {consoleOutput.output || consoleOutput.error || "No output"}
              </div>
          )}
        </div>

        {/* --- ACTION BUTTONS --- */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setView('dashboard')}
            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50"
          >
            Back to dashboard
          </button>

          <button
            type="submit"
            disabled={isSubmitting || !file} // Button disabled if no file
            className="px-6 py-2 rounded-lg bg-[#40E0D0] text-[#1B3147] font-bold text-sm disabled:opacity-60 disabled:cursor-not-allowed hover:bg-[#3ad1c3] transition-colors shadow-sm"
          >
            {isSubmitting ? 'Analyzing & Grading...' : 'Submit Assignment'}
          </button>
        </div>
      </form>
    </div>
  );
};