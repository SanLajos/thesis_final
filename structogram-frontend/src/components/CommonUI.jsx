import React from 'react';
import { Languages, Activity, ClipboardCheck, Play, Check, X } from 'lucide-react';

export const DebugStatus = ({ status, error }) => {
  if (!status && !error) return null;
  return (
    <div className={`mb-4 p-3 rounded text-sm border ${error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
      <p className="font-bold">{error ? "Error:" : "Status:"}</p>
      <p>{error || status}</p>
    </div>
  );
};

export const Badge = ({ score }) => (
  <span className={`px-3 py-1 rounded-full text-sm font-bold ${score>=80?'bg-green-100 text-green-800':score>=50?'bg-yellow-100 text-yellow-800':'bg-red-100 text-red-800'}`}>
    Score: {score}/100
  </span>
);

export const LanguageBadge = ({ lang }) => (
  <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono border bg-slate-100 text-slate-700 uppercase">
    <Languages size={10} /> {lang}
  </span>
);

export const ComplexityBadge = ({ score }) => (
  <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-blue-50 text-blue-700 border-blue-200">
    <Activity size={18}/>
    <div>
      <div className="text-xs font-bold opacity-70">Cyclomatic Complexity</div>
      <div className="font-bold text-lg">{score}</div>
    </div>
  </div>
);

export const StaticAnalysisCard = ({ report }) => {
  if (!report) return null;
  let c = report.style_score < 80 ? (report.style_score < 50 ? "border-red-200 bg-red-50" : "border-yellow-200 bg-yellow-50") : "border-green-200 bg-green-50";
  return (
    <div className={`p-4 rounded-lg border ${c} space-y-2`}>
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-slate-800 flex items-center gap-2"><ClipboardCheck size={18} /> Code Style Check</h3>
        <span className="font-black text-lg">{report.style_score}/100</span>
      </div>
      {report.issues.length === 0 ? (<p className="text-sm text-green-700">No style issues found. Clean code!</p>) : (<ul className="list-disc list-inside space-y-1">{report.issues.map((issue, i) => (<li key={i} className="text-xs text-slate-700 font-mono">{issue}</li>))}</ul>)}
      <div className="text-xs text-slate-400 pt-2 border-t border-slate-200/50">Max Nesting Depth: {report.max_nesting}</div>
    </div>
  );
};

export const TestResultsCard = ({ results }) => {
  if (!results || !results.results) return null;
  const r = Math.round((results.passed / results.total) * 100);
  const c = r === 100 ? "border-green-200 bg-green-50" : r >= 50 ? "border-yellow-200 bg-yellow-50" : "border-red-200 bg-red-50";
  return (
    <div className={`p-4 rounded-lg border ${c} space-y-4`}>
      <div className="flex justify-between items-center border-b border-gray-200 pb-2">
        <h3 className="font-bold text-slate-800 flex items-center gap-2"><Play size={18}/> Execution Sandbox</h3>
        <span className={`font-bold text-sm ${r===100 ? 'text-green-600' : 'text-red-600'}`}>{results.passed}/{results.total} Passed</span>
      </div>
      <div className="space-y-2">{results.results.map((res, i) => (<div key={i} className="bg-white p-3 rounded border border-gray-100 text-sm"><div className="flex justify-between mb-1"><span className="font-mono text-xs text-slate-500">Input: {res.input}</span>{res.passed ? <span className="flex items-center text-green-600 text-xs font-bold"><Check size={14}/> Pass</span> : <span className="flex items-center text-red-600 text-xs font-bold"><X size={14}/> Fail</span>}</div>{!res.passed && (<div className="bg-red-50 p-2 rounded font-mono text-xs text-red-800 mt-1"><div>Expected: "{res.expected}"</div><div>Actual:   "{res.actual}"</div>{res.error && <div className="mt-1 pt-1 border-t border-red-200 text-red-600">Error: {res.error}</div>}</div>)}</div>))}</div>
    </div>
  );
};