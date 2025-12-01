import React, { useState, useEffect } from 'react';
import { api } from '../services/ApiService';
import { Clock, FileCode, ImageIcon, Eye } from 'lucide-react';
import { Badge } from '../components/CommonUI';

export const StudentHistory = ({ currentAssignment, setView, setGradingResult, user }) => {
  if (!currentAssignment) {
    return <div className="p-6">No assignment selected.</div>;
  }

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.request(`/assignment/${currentAssignment.id}/my-submissions`);
        if (res.ok) {
          setSubmissions(res.data);
        }
      } catch (e) {
        console.error("Failed to load history", e);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [currentAssignment]);

  const handleView = (sub) => {
    // Helper to handle JSON parsing if the backend returns stringified JSON
    const safeParse = (data) => {
        if (typeof data === 'string') {
            try { return JSON.parse(data); } catch { return {}; }
        }
        return data || {};
    };

    const parsedGrading = safeParse(sub.grading_result);
    const parsedStatic = safeParse(sub.static_analysis_report);
    const parsedTests = safeParse(sub.test_results);

    setGradingResult({
      grading_result: parsedGrading,
      generated_code: sub.generated_code,
      method_used: sub.submission_mode,
      language: currentAssignment.language,
      assignment_title: currentAssignment.title,
      student_name: user.username,
      submitted_at: sub.created_at,
      complexity: sub.complexity, // Ensure complexity is passed
      static_analysis: parsedStatic,
      test_results: parsedTests
    });

    setView('grading');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-[#1B3147]">Submission History</h2>
            <p className="text-slate-500">{currentAssignment.title}</p>
        </div>
        <button onClick={() => setView('dashboard')} className="text-slate-500 hover:text-[#1B3147]">
            &larr; Back to Dashboard
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-400">Loading history...</div>
      ) : submissions.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
            You haven't submitted anything for this assignment yet.
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => {
            const score = typeof sub.grading_result === 'string' 
                ? JSON.parse(sub.grading_result)?.score 
                : sub.grading_result?.score;

            return (
              <div key={sub.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center hover:border-[#40E0D0] transition-colors">
                <div className="flex items-center gap-4">
                    <div className="bg-slate-100 p-3 rounded-full text-slate-600">
                        {sub.submission_mode === 'image' || sub.submission_mode === 'ai_vision' ? <ImageIcon size={20}/> : <FileCode size={20}/>}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-slate-800">Submission #{sub.id}</span>
                            <span className="text-xs px-2 py-0.5 bg-slate-100 rounded text-slate-500 uppercase">{sub.submission_mode}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><Clock size={12}/> {new Date(sub.created_at).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    {score !== undefined && <Badge score={score} />}
                    <button 
                        onClick={() => handleView(sub)}
                        className="flex items-center gap-2 px-3 py-2 bg-[#1B3147] text-white rounded hover:bg-[#243b55] text-sm transition-colors"
                    >
                        <Eye size={16}/> View Report
                    </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};