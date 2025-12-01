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

  const [code, setCode] = useState('');
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('assignment_id', currentAssignment.id);

      if (code.trim()) {
        formData.append('code', code);
      }

      if (file) {
        formData.append('file', file);
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
        className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Paste your code (optional)
          </label>
          <textarea
            className="w-full min-h-[160px] border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#40E0D0]"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Paste your structogram-generated code here..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Or upload a file (optional)
          </label>
          <input
            type="file"
            className="block w-full text-sm text-slate-600"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <p className="text-xs text-slate-400 mt-1">
            You can submit either code, a file, or both.
          </p>
        </div>

        <div className="flex justify-between items-center pt-2">
          <button
            type="button"
            onClick={() => setView('dashboard')}
            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50"
          >
            Back to dashboard
          </button>

          <button
            type="submit"
            disabled={isSubmitting || (!code.trim() && !file)}
            className="px-4 py-2 rounded-lg bg-[#40E0D0] text-[#1B3147] font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed hover:bg-[#3ad1c3] transition-colors"
          >
            {isSubmitting ? 'Submitting...' : 'Submit for grading'}
          </button>
        </div>
      </form>
    </div>
  );
};
