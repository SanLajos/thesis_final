import React from 'react';
// 1. Import Badge and Icons
import { Badge } from '../components/CommonUI';
import { AlertTriangle, CheckCircle } from 'lucide-react';

export const SubmissionList = ({
  submissionsList,
  setView,
  setGradingResult,
  currentAssignment,
}) => {
  if (!currentAssignment) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold text-slate-800 mb-2">
          No assignment selected
        </h2>
        <p className="text-slate-500">
          Please go back to the dashboard and select an assignment first.
        </p>
      </div>
    );
  }

  const safeParse = (val) => {
    if (typeof val !== 'string') return val;
    try {
      return JSON.parse(val);
    } catch (e) {
      console.error('Failed to parse grading_result', e, val);
      return null;
    }
  };

  const handleView = (sub) => {
    const parsedGradingResult = safeParse(sub.grading_result);
    // ... (Keep existing safeParse logic for other fields if needed, 
    // e.g. static_analysis, though mostly grading_result is critical here)

    setGradingResult({
      grading_result: parsedGradingResult,
      generated_code: sub.generated_code,
      method_used: sub.submission_mode,
      language: currentAssignment.language,
      assignment_title: currentAssignment.title,
      student_name: sub.student_name, // Now available from Backend
      submitted_at: sub.submitted_at,
      complexity: sub.complexity,
      plagiarism_score: sub.plagiarism_score
    });

    setView('grading');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1B3147] mb-1">
          Submissions for: {currentAssignment.title}
        </h1>
        <p className="text-slate-500 text-sm">
          Click on a submission to view the grading details.
        </p>
      </div>

      {(!submissionsList || submissionsList.length === 0) && (
        <div className="p-4 rounded-lg bg-white border border-slate-200 text-slate-500">
          No submissions yet for this assignment.
        </div>
      )}

      <div className="mt-4 space-y-3">
        {submissionsList &&
          submissionsList.map((sub) => {
            // 2. Extract Data for Display
            const result = safeParse(sub.grading_result);
            const score = result ? result.score : null;
            const plag = sub.plagiarism_score || 0;

            return (
            <button
              key={sub.id}
              onClick={() => handleView(sub)}
              className="w-full text-left bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm hover:shadow-md hover:border-[#40E0D0] transition-all"
            >
              <div className="flex justify-between items-center">
                <div>
                  {/* 3. Display Student Name */}
                  <div className="font-semibold text-slate-800 text-lg">
                    {sub.student_name || 'Unknown Student'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Submitted: {sub.created_at ? new Date(sub.created_at).toLocaleString() : '—'}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* 4. Display Plagiarism Score */}
                  {plag > 0 && (
                    <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded ${plag > 20 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        <AlertTriangle size={12}/> Plagiarism: {plag}%
                    </div>
                  )}

                  {/* 5. Display Grade Badge */}
                  {score !== null ? (
                    <Badge score={score} />
                  ) : (
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">Not Graded</span>
                  )}

                  {/* 6. Display Mode */}
                  <div className="text-xs text-slate-500 border-l pl-4 border-slate-200 uppercase font-mono">
                    {sub.submission_mode || 'N/A'}
                  </div>
                </div>
              </div>
            </button>
          )})}
      </div>
    </div>
  );
};