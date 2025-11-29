import React from 'react';
import { CheckCircle, AlertCircle, Code } from 'lucide-react';
import { Badge, LanguageBadge, ComplexityBadge, StaticAnalysisCard, TestResultsCard } from '../components/CommonUI';

export const GradingResult = ({ gradingResult, setView }) => {
  if (!gradingResult) return null;
  const { grading_result, generated_code, method_used, language, complexity, plagiarism_score, static_analysis, test_results } = gradingResult;
  return (
    <div className="max-w-5xl mx-auto space-y-6 pt-6">
      <button onClick={() => setView('dashboard')} className="text-slate-500">&larr; Back</button>
      <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Grading Report</h2>
          <div className="flex gap-2 items-center">
            <LanguageBadge lang={language} />
            <Badge score={grading_result.score} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
             <div className={`p-4 rounded border ${grading_result.is_correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
               <h3 className="font-bold flex items-center gap-2">
                 {grading_result.is_correct ? <CheckCircle className="text-green-600"/> : <AlertCircle className="text-red-600"/>}
                 AI Feedback
               </h3>
               <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{grading_result.feedback}</p>
             </div>
             {complexity && <ComplexityBadge score={complexity} />}
             {static_analysis && <StaticAnalysisCard report={static_analysis} />}
             {test_results && <TestResultsCard results={test_results} />}
          </div>
          <div>
            <div className="bg-slate-900 rounded-lg overflow-hidden h-full flex flex-col">
              <div className="bg-slate-800 p-2 text-xs text-slate-400">Generated Code ({method_used})</div>
              <pre className="p-4 text-green-400 font-mono text-sm overflow-auto flex-1">{generated_code}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};