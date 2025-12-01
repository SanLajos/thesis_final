import React from 'react';

export const SubmissionList = ({
  submissionsList,
  setView,
  setGradingResult,
  currentAssignment,
}) => {
  // Guard: avoid crashing if route is opened directly / on refresh
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

    setGradingResult({
      grading_result: parsedGradingResult,
      generated_code: sub.generated_code,
      method_used: sub.submission_mode,
      language: currentAssignment.language,
      assignment_title: currentAssignment.title,
      student_name: sub.student_name,
      submitted_at: sub.submitted_at,
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
          submissionsList.map((sub) => (
            <button
              key={sub.id}
              onClick={() => handleView(sub)}
              className="w-full text-left bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm hover:shadow-md hover:border-[#40E0D0] transition-all"
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold text-slate-800">
                    {sub.student_name || 'Unknown student'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Submitted at:{' '}
                    {sub.submitted_at
                      ? new Date(sub.submitted_at).toLocaleString()
                      : '—'}
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  Mode: {sub.submission_mode || 'N/A'}
                </div>
              </div>
            </button>
          ))}
      </div>
    </div>
  );
};
