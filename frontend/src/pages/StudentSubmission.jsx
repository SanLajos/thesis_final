import React, { useState } from 'react';
import { api } from '../services/ApiService';

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
  const [description, setDescription] = useState(''); // New State for Description
  const [diagramType, setDiagramType] = useState('flowchart'); // New State for Diagram Type
  const [submissionMode, setSubmissionMode] = useState('xml'); // New State for Mode
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      // Expect backend to return grading data
      const data = res.data || {};
      
      setGradingResult({
        grading_result: data.grading_result ?? null,
        generated_code: data.generated_code ?? '',
        method_used: data.method_used ?? 'unknown',
        language: currentAssignment.language,
        assignment_title: currentAssignment.title,
        student_name: data.student_name ?? '',
        submitted_at: data.submitted_at ?? new Date().toISOString(),
        complexity: data.complexity ?? 0, // <--- ADDED: Pass complexity to result view
      });

      // Navigate to grading view
      setView('grading');
    } catch (err) {
      console.error('Submission error', err);
      alert('Unexpected error during submission.');
    } finally {
      setIsSubmitting(false);
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

        {/* --- 4. OPTIONAL CODE PASTE --- */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Paste generated code (Optional fallback)
          </label>
          <textarea
            className="w-full min-h-[100px] border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#40E0D0]"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="If you have the code already, you can paste it here..."
          />
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