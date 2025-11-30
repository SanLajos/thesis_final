import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { Badge, LanguageBadge, ComplexityBadge, StaticAnalysisCard, TestResultsCard } from '../components/CommonUI';
// 1. Import Syntax Highlighter
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'; // VS Code Dark Theme

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
          {/* Left Column: Analysis & Feedback */}
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
          
          {/* Right Column: Code with Syntax Highlighting */}
          <div>
            <div className="rounded-lg overflow-hidden h-full flex flex-col border border-slate-200">
              {/* Header using 'Biscay' Color */}
              <div className="bg-[#1B3147] p-2 text-xs text-white flex justify-between items-center">
                <span className="font-bold">Generated Code ({method_used})</span>
                <span className="uppercase opacity-80 px-2 py-0.5 bg-white/10 rounded">{language}</span>
              </div>
              
              {/* Syntax Highlighter Component */}
              <SyntaxHighlighter 
                language={language} 
                style={vscDarkPlus} 
                customStyle={{ margin: 0, height: '100%', fontSize: '0.85rem' }} 
                showLineNumbers={true}
                wrapLines={true}
              >
                {generated_code}
              </SyntaxHighlighter>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};