import React from 'react';
import { Eye } from 'lucide-react';
import { Badge } from '../components/CommonUI';

export const SubmissionList = ({ submissionsList, setView, setGradingResult, currentAssignment }) => {
  const handleView = (sub) => {
    // Parse JSON fields if they are strings
    const parse = (val) => (typeof val === 'string' ? JSON.parse(val) : val);
    setGradingResult({
      grading_result: parse(sub.grading_result),
      generated_code: sub.generated_code,
      method_used: sub.submission_mode,
      language: currentAssignment.language,
      complexity: sub.complexity,
      plagiarism_score: sub.plagiarism_score,
      static_analysis: parse(sub.static_analysis_report),
      test_results: parse(sub.test_results),
      is_correct: parse(sub.grading_result)?.is_correct,
      logic_errors: parse(sub.grading_result)?.logic_errors
    });
    setView('grading');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pt-6">
      <div className="flex items-center gap-4"><button onClick={() => setView('dashboard')} className="text-slate-500">&larr; Back</button><h2 className="text-2xl font-bold">Submissions: {currentAssignment?.title}</h2></div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200"><tr><th className="p-4">ID</th><th className="p-4">Mode</th><th className="p-4">Score</th><th className="p-4">Plagiarism</th><th className="p-4">Date</th><th className="p-4">Action</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{submissionsList.map(sub => { 
              const result = typeof sub.grading_result === 'string' ? JSON.parse(sub.grading_result) : sub.grading_result; 
              let plagColor = "bg-green-100 text-green-700"; if (sub.plagiarism_score > 50) plagColor = "bg-red-100 text-red-700"; else if (sub.plagiarism_score > 20) plagColor = "bg-yellow-100 text-yellow-700";
              return (
                <tr key={sub.id} className="hover:bg-slate-50">
                  <td className="p-4 text-slate-500">#{sub.id}</td>
                  <td className="p-4"><span className="px-2 py-1 rounded text-xs font-bold uppercase bg-blue-100 text-blue-700">{sub.submission_mode}</span></td>
                  <td className="p-4"><Badge score={result?.score || 0} /></td>
                  <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${plagColor}`}>{sub.plagiarism_score}% Match</span></td>
                  <td className="p-4 text-slate-500 text-sm">{new Date(sub.created_at).toLocaleDateString()}</td>
                  <td className="p-4"><button onClick={() => handleView(sub)} className="text-blue-600 hover:underline"><Eye size={18} /></button></td>
                </tr>
              ); })}</tbody>
        </table>
      </div>
    </div>
  );
};