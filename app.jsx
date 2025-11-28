import React, { useState, useEffect, useRef } from 'react';
import { 
  Code, CheckCircle, AlertCircle, User, 
  GraduationCap, Plus, Trash2, FileText, RefreshCw, Eye, 
  Languages, Sparkles, LogOut, Shield, Activity, 
  HelpCircle, AlertTriangle, Users, ArrowRight, ClipboardCheck, Upload,
  Play, Check, X, MessageSquare, Send
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const API_BASE = "http://127.0.0.1:5000";

// --- HELPER: Debug Logger ---
const DebugStatus = ({ status, error }) => {
  if (!status && !error) return null;
  return (
    <div className={`mb-4 p-3 rounded text-sm border ${error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
      <p className="font-bold">{error ? "Error:" : "Status:"}</p>
      <p>{error || status}</p>
    </div>
  );
};

// --- UI COMPONENTS ---
// (Badge, LanguageBadge, ComplexityBadge, StaticAnalysisCard, TestResultsCard components remain unchanged)
const Badge = ({ score }) => (<span className={`px-3 py-1 rounded-full text-sm font-bold ${score>=80?'bg-green-100 text-green-800':score>=50?'bg-yellow-100 text-yellow-800':'bg-red-100 text-red-800'}`}>Score: {score}/100</span>);
const LanguageBadge = ({ lang }) => (<span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono border bg-slate-100 text-slate-700 uppercase"><Languages size={10} /> {lang}</span>);
const ComplexityBadge = ({ score }) => (<div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-blue-50 text-blue-700 border-blue-200"><Activity size={18}/><div><div className="text-xs font-bold opacity-70">Cyclomatic Complexity</div><div className="font-bold text-lg">{score}</div></div></div>);
const StaticAnalysisCard = ({ report }) => { if (!report) return null; let c = report.style_score < 80 ? (report.style_score < 50 ? "border-red-200 bg-red-50" : "border-yellow-200 bg-yellow-50") : "border-green-200 bg-green-50"; return (<div className={`p-4 rounded-lg border ${c} space-y-2`}><div className="flex justify-between items-center"><h3 className="font-bold text-slate-800 flex items-center gap-2"><ClipboardCheck size={18} /> Code Style Check</h3><span className="font-black text-lg">{report.style_score}/100</span></div>{report.issues.length === 0 ? (<p className="text-sm text-green-700">No style issues found. Clean code!</p>) : (<ul className="list-disc list-inside space-y-1">{report.issues.map((issue, i) => (<li key={i} className="text-xs text-slate-700 font-mono">{issue}</li>))}</ul>)}<div className="text-xs text-slate-400 pt-2 border-t border-slate-200/50">Max Nesting Depth: {report.max_nesting}</div></div>); };
const TestResultsCard = ({ results }) => { if (!results || !results.results) return null; const r = Math.round((results.passed / results.total) * 100); const c = r === 100 ? "border-green-200 bg-green-50" : r >= 50 ? "border-yellow-200 bg-yellow-50" : "border-red-200 bg-red-50"; return (<div className={`p-4 rounded-lg border ${c} space-y-4`}><div className="flex justify-between items-center border-b border-gray-200 pb-2"><h3 className="font-bold text-slate-800 flex items-center gap-2"><Play size={18}/> Execution Sandbox</h3><span className={`font-bold text-sm ${r===100 ? 'text-green-600' : 'text-red-600'}`}>{results.passed}/{results.total} Passed</span></div><div className="space-y-2">{results.results.map((res, i) => (<div key={i} className="bg-white p-3 rounded border border-gray-100 text-sm"><div className="flex justify-between mb-1"><span className="font-mono text-xs text-slate-500">Input: {res.input}</span>{res.passed ? <span className="flex items-center text-green-600 text-xs font-bold"><Check size={14}/> Pass</span> : <span className="flex items-center text-red-600 text-xs font-bold"><X size={14}/> Fail</span>}</div>{!res.passed && (<div className="bg-red-50 p-2 rounded font-mono text-xs text-red-800 mt-1"><div>Expected: "{res.expected}"</div><div>Actual:   "{res.actual}"</div>{res.error && <div className="mt-1 pt-1 border-t border-red-200 text-red-600">Error: {res.error}</div>}</div>)}</div>))}</div></div>); };
const formatValidationError = (data) => data.details && Array.isArray(data.details) ? data.details.map(e => `• ${e.loc?e.loc[0]:'Field'}: ${e.msg}`).join('\n') : (data.error || "Error");

// --- AUTH FETCH ---
const authFetch = async (url, options = {}) => {
    const token = localStorage.getItem('auth_token');
    const headers = { ...options.headers, 'Authorization': token ? `Bearer ${token}` : '' };
    let res = await fetch(url, { ...options, headers });
    
    if (res.status === 401) {
        const refresh_token = localStorage.getItem('refresh_token');
        if (refresh_token) {
            try {
                const refreshRes = await fetch(`${API_BASE}/auth/refresh`, { 
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh_token })
                });
                if (refreshRes.ok) {
                    const data = await refreshRes.json();
                    localStorage.setItem('auth_token', data.token);
                    localStorage.setItem('refresh_token', data.refresh_token);
                    headers['Authorization'] = `Bearer ${data.token}`;
                    res = await fetch(url, { ...options, headers });
                } else { localStorage.clear(); window.location.reload(); }
            } catch (e) { console.error("Refresh failed", e); }
        }
    }
    return res;
};

// --- CHAT WIDGET ---
const ChatWidget = ({ authFetch }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([{role: 'ai', text: "Hi! I'm your IT Tutor. Ask me about Flowcharts, Structograms, Python, C++, or Java."}]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
  useEffect(() => { scrollToBottom(); }, [messages, isOpen]);

  const sendMessage = async (e) => {
    e.preventDefault(); if (!input.trim()) return;
    const userMsg = { role: 'student', text: input };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory); setInput(''); setIsTyping(true);
    try {
      const res = await authFetch(`${API_BASE}/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.text, history: newHistory.slice(-10) })
      });
      const data = await res.json();
      if (res.ok) setMessages(prev => [...prev, { role: 'ai', text: data.response }]);
      else setMessages(prev => [...prev, { role: 'ai', text: "Error: " + (data.error || "") }]);
    } catch (err) { setMessages(prev => [...prev, { role: 'ai', text: "Network error." }]); } 
    finally { setIsTyping(false); }
  };

  if (!isOpen) return (<button onClick={() => setIsOpen(true)} className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all z-50 flex items-center gap-2"><MessageSquare size={24} /><span className="font-bold hidden md:inline">AI Tutor</span></button>);

  return (
    <div className="fixed bottom-6 right-6 w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 z-50 flex flex-col h-[500px] animate-in slide-in-from-bottom-10 fade-in">
      <div className="bg-slate-900 text-white p-4 rounded-t-xl flex justify-between items-center"><div className="flex items-center gap-2"><Sparkles size={18} className="text-yellow-400"/><h3 className="font-bold">IT Tutor Bot</h3></div><button onClick={() => setIsOpen(false)} className="hover:bg-slate-700 p-1 rounded"><X size={18}/></button></div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">{messages.map((msg, i) => (<div key={i} className={`flex ${msg.role === 'student' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] p-3 rounded-lg text-sm whitespace-pre-wrap ${msg.role === 'student' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'}`}>{msg.text}</div></div>))}{isTyping && (<div className="flex justify-start"><div className="bg-slate-200 text-slate-500 p-3 rounded-lg rounded-bl-none text-xs animate-pulse">Typing...</div></div>)}<div ref={messagesEndRef} /></div>
      <form onSubmit={sendMessage} className="p-3 border-t border-slate-200 bg-white rounded-b-xl flex gap-2"><input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question..." className="flex-1 p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"/><button type="submit" disabled={!input.trim() || isTyping} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"><Send size={18} /></button></form>
    </div>
  );
};

// --- ROOT APP ---
export default function App() {
  const [user, setUser] = useState(null); 
  const [view, setView] = useState('login'); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            if (token) {
                const res = await authFetch(`${API_BASE}/auth/me`);
                if (res.ok) { const data = await res.json(); setUser(data.user); setView('seminars'); } else { localStorage.clear(); }
            }
        } catch (e) { console.error("Session check", e); }
        setLoading(false);
    };
    checkSession();
  }, []);

  const handleLogin = (data) => {
      // FIX: Correctly save the tokens passed from the full data object
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('refresh_token', data.refresh_token);
      setUser(data.user);
      setView('seminars');
  };
  const handleLogout = () => { localStorage.clear(); setUser(null); setView('login'); };

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  if (!user) {
    if (view === 'register') return <RegisterPage onLogin={handleLogin} onSwitch={() => setView('login')} />;
    return <LoginPage onLogin={handleLogin} onSwitch={() => setView('register')} />;
  }
  return <MainApp user={user} onLogout={handleLogout} initialView={view} />;
}

// --- AUTH PAGES ---
const LoginPage = ({ onLogin, onSwitch }) => {
  const [formData, setFormData] = useState({ identifier: '', password: '' }); 
  const [error, setError] = useState(''); const [status, setStatus] = useState('');
  const handleSubmit = async (e) => {
    e.preventDefault(); setStatus('Logging in...'); setError('');
    try {
      const res = await fetch(`${API_BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      const data = await res.json();
      if (res.ok) { setStatus('Success!'); onLogin(data); } else { setStatus(''); setError(data.error || 'Login failed'); }
    } catch (err) { setStatus(''); setError(`Network Error: ${err.message}`); }
  };
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4"><div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md"><h1 className="text-2xl font-bold mb-4">Sign In</h1><DebugStatus status={status} error={error} /><form onSubmit={handleSubmit} className="space-y-4"><input className="w-full p-2 border rounded" placeholder="Username or Email" value={formData.identifier} onChange={e=>setFormData({...formData, identifier:e.target.value})}/><input className="w-full p-2 border rounded" placeholder="Password" type="password" value={formData.password} onChange={e=>setFormData({...formData, password:e.target.value})}/><button className="w-full bg-blue-600 text-white p-2 rounded">Sign In</button></form><button onClick={onSwitch} className="text-blue-600 text-sm mt-4">Register instead</button></div></div>
  );
};

const RegisterPage = ({ onLogin, onSwitch }) => {
    const [formData, setFormData] = useState({ email: '', password: '', username: '', role: 'student' });
    const [error, setError] = useState(''); const [status, setStatus] = useState('');
    const handleSubmit = async (e) => {
        e.preventDefault(); setStatus('Registering...'); setError('');
        try {
            const res = await fetch(`${API_BASE}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
            const data = await res.json();
            if (res.ok) { 
                setStatus('Success!'); 
                // FIX: Pass the FULL data object (containing tokens), not just data.user
                onLogin(data); 
            } else { 
                setStatus(''); setError(data.details ? formatValidationError(data) : (data.error || "Registration failed")); 
            }
        } catch (err) { setStatus(''); setError(`Network Error: ${err.message}`); }
    };
    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4"><div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md space-y-4"><h1 className="text-2xl font-bold">Register</h1><DebugStatus status={status} error={error} /><input className="w-full p-2 border rounded" placeholder="Username" onChange={e=>setFormData({...formData, username:e.target.value})}/><input className="w-full p-2 border rounded" placeholder="Email" onChange={e=>setFormData({...formData, email:e.target.value})}/><input className="w-full p-2 border rounded" type="password" placeholder="Password" onChange={e=>setFormData({...formData, password:e.target.value})}/><select className="w-full p-2 border rounded" onChange={e=>setFormData({...formData, role:e.target.value})}><option value="student">Student</option><option value="teacher">Teacher</option><option value="admin">Admin</option></select><button className="w-full bg-green-600 text-white p-2 rounded" onClick={handleSubmit}>Register</button><button onClick={onSwitch} className="text-blue-600 text-sm">Login instead</button></div></div>
    );
};

// --- MAIN APP ---
const MainApp = ({ user, onLogout, initialView }) => {
  const [view, setView] = useState(initialView);
  const [activeSeminar, setActiveSeminar] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [currentAssignment, setCurrentAssignment] = useState(null);
  const [submissionsList, setSubmissionsList] = useState([]);
  const [gradingResult, setGradingResult] = useState(null);

  useEffect(() => {
    if (view === 'dashboard' && activeSeminar) {
        authFetch(`${API_BASE}/assignments?seminar_id=${activeSeminar.id}`).then(r=>r.ok?r.json():[]).then(setAssignments);
    }
  }, [view, activeSeminar]);

  // --- HANDLERS ---

  const handleViewSubmission = (sub) => {
      const result = typeof sub.grading_result === 'string' ? JSON.parse(sub.grading_result) : sub.grading_result;
      const staticReport = typeof sub.static_analysis_report === 'string' ? JSON.parse(sub.static_analysis_report) : sub.static_analysis_report;
      const testResults = typeof sub.test_results === 'string' ? JSON.parse(sub.test_results) : sub.test_results;

      setGradingResult({
          grading_result: result,
          generated_code: sub.generated_code,
          method_used: sub.submission_mode,
          language: currentAssignment.language,
          complexity: sub.complexity,
          plagiarism_score: sub.plagiarism_score,
          static_analysis: staticReport,
          test_results: testResults,
          is_correct: result?.is_correct,
          logic_errors: result?.logic_errors
      });
      setView('grading');
  };

  // --- SUB COMPONENTS ---

  const SeminarListView = () => {
    const [seminars, setSeminars] = useState([]);
    const [joinCode, setJoinCode] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [newSem, setNewSem] = useState({title:'', invite_code:''});
    useEffect(()=>{ authFetch(`${API_BASE}/seminars`).then(r=>r.ok?r.json():[]).then(setSeminars); },[]);
    const join = async () => { if(!joinCode)return; const res=await authFetch(`${API_BASE}/seminar/join`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({invite_code:joinCode})}); if(res.ok){ authFetch(`${API_BASE}/seminars`).then(r=>r.json()).then(setSeminars); setJoinCode(''); } else alert("Failed to join"); };
    const create = async () => { const res=await authFetch(`${API_BASE}/seminar`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(newSem)}); if(res.ok){ authFetch(`${API_BASE}/seminars`).then(r=>r.json()).then(setSeminars); setShowCreate(false); } else { const e = await res.json(); alert(formatValidationError(e)); } };
    return (
      <div className="max-w-6xl mx-auto space-y-8 pt-6">
        <div className="flex justify-between items-end border-b pb-4"><div><h2 className="text-2xl font-bold">My Seminars</h2></div><div className="flex gap-2"><input value={joinCode} onChange={e=>setJoinCode(e.target.value)} placeholder="Invite Code" className="border p-2 rounded"/><button onClick={join} className="bg-blue-600 text-white px-4 rounded">Join</button>{user.role==='teacher'&&<button onClick={()=>setShowCreate(!showCreate)} className="bg-green-600 text-white px-4 rounded">Create</button>}</div></div>
        {showCreate && <div className="bg-green-50 p-4 rounded border flex gap-2"><input placeholder="Title" onChange={e=>setNewSem({...newSem, title:e.target.value})} className="p-2 rounded flex-1"/><input placeholder="Code" onChange={e=>setNewSem({...newSem, invite_code:e.target.value})} className="p-2 rounded"/><button onClick={create} className="bg-green-600 text-white px-4 rounded">Save</button></div>}
        <div className="grid grid-cols-3 gap-6">{seminars.map(s=>(<div key={s.id} onClick={()=>{setActiveSeminar(s); setView('dashboard')}} className="bg-white p-6 rounded shadow cursor-pointer"><h3 className="font-bold">{s.title}</h3><p>{s.invite_code}</p></div>))}</div>
      </div>
    );
  };

  const CreateForm = () => {
    const [title, setTitle] = useState(''); const [desc, setDesc] = useState('');
    const [gradingPrompt, setGradingPrompt] = useState(''); const [language, setLanguage] = useState('python');
    const [plagiarismEnabled, setPlagiarismEnabled] = useState(false); const [staticEnabled, setStaticEnabled] = useState(false);
    const [gradingType, setGradingType] = useState('ai'); const [file, setFile] = useState(null);
    const [testCases, setTestCases] = useState([{input: '', output: ''}]);
    const addTestCase = () => setTestCases([...testCases, {input: '', output: ''}]);
    const updateTestCase = (idx, field, val) => { const newTC = [...testCases]; newTC[idx][field] = val; setTestCases(newTC); };
    const handleSubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData();
      formData.append('seminar_id', activeSeminar.id); formData.append('title', title); formData.append('description', desc);
      formData.append('grading_prompt', gradingPrompt); formData.append('language', language);
      formData.append('plagiarism_check_enabled', plagiarismEnabled); formData.append('static_analysis_enabled', staticEnabled);
      formData.append('grading_type', gradingType); formData.append('template_code', file);
      formData.append('test_cases', JSON.stringify(testCases.filter(tc => tc.input && tc.output)));
      const res = await authFetch(`${API_BASE}/assignment`, { method: 'POST', body: formData });
      if (res.ok) { const r = await authFetch(`${API_BASE}/assignments?seminar_id=${activeSeminar.id}`); setAssignments(await r.json()); setView('dashboard'); } else alert("Failed");
    };
    return (
      <div className="max-w-2xl mx-auto bg-white p-8 rounded shadow">
        <h2 className="text-2xl font-bold mb-4">New Assignment</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
            <input placeholder="Title" className="w-full p-2 border rounded" onChange={e=>setTitle(e.target.value)}/>
            <textarea placeholder="Description" className="w-full p-2 border rounded" onChange={e=>setDesc(e.target.value)}/>
            <div className="flex gap-4"><select className="p-2 border rounded" onChange={e=>setLanguage(e.target.value)}><option value="python">Python</option><option value="cpp">C++</option></select><select className="p-2 border rounded" onChange={e=>setGradingType(e.target.value)}><option value="ai">AI</option><option value="keyword">Keyword</option></select></div>
            <div className="flex gap-4"><label><input type="checkbox" onChange={e=>setPlagiarismEnabled(e.target.checked)}/> Plagiarism</label><label><input type="checkbox" onChange={e=>setStaticEnabled(e.target.checked)}/> Static Analysis</label></div>
            <input type="file" onChange={e=>setFile(e.target.files[0])}/>
            <div className="border p-4 rounded bg-slate-50"><h3 className="font-bold mb-2">Auto-Execution Test Cases</h3>{testCases.map((tc, i) => (<div key={i} className="flex gap-2 mb-2"><input placeholder="Input" value={tc.input} onChange={e=>updateTestCase(i, 'input', e.target.value)} className="border p-1 rounded flex-1"/><input placeholder="Output" value={tc.output} onChange={e=>updateTestCase(i, 'output', e.target.value)} className="border p-1 rounded flex-1"/></div>))}<button type="button" onClick={addTestCase} className="text-sm text-blue-600">+ Add Case</button></div>
            <button className="w-full bg-blue-600 text-white p-2 rounded">Create</button>
        </form>
      </div>
    );
  };

  const AssignmentDashboard = () => {
    const [tab, setTab] = useState('list'); 
    const fetchSubmissions = async (id) => { const res = await authFetch(`${API_BASE}/assignment/${id}/submissions`); const data = await res.json(); setSubmissionsList(data); setView('submissions'); };
    const handleDelete = async (id) => { if(window.confirm("Delete?")) { await authFetch(`${API_BASE}/assignment/${id}`, { method: 'DELETE' }); setAssignments(assignments.filter(a => a.id !== id)); } };
    return (
        <div className="max-w-6xl mx-auto space-y-6 pt-6">
            <div className="flex justify-between"><button onClick={()=>setView('seminars')}>Back</button><h2>{activeSeminar.title}</h2><div className="flex gap-2">{user.role==='teacher'&&<div className="flex border rounded"><button onClick={()=>setTab('list')} className={`px-3 py-1 ${tab==='list'?'bg-gray-100':''}`}>List</button><button onClick={()=>setTab('analytics')} className={`px-3 py-1 ${tab==='analytics'?'bg-gray-100':''}`}>Stats</button></div>}{user.role==='teacher'&&<button onClick={()=>setView('create')} className="bg-blue-600 text-white px-4 rounded ml-2">New</button>}</div></div>
            {tab==='analytics' && user.role==='teacher' ? <SeminarAnalytics seminarId={activeSeminar.id}/> : <div className="grid grid-cols-2 gap-4">{assignments.map(a=>(<div key={a.id} className="bg-white p-6 rounded shadow"><div className="flex justify-between"><h3 className="font-bold">{a.title}</h3><div className="flex gap-2">{(user.role==='teacher'||user.role==='admin')&&<><button onClick={()=>{setCurrentAssignment(a); fetchSubmissions(a.id)}} className="text-blue-500"><Eye size={18}/></button><button onClick={()=>handleDelete(a.id)} className="text-red-500"><Trash2 size={18}/></button></>}</div></div><p className="text-sm text-gray-600 my-2">{a.description}</p>{user.role==='student'&&<button onClick={()=>{setCurrentAssignment(a); setView('submit')}} className="bg-blue-100 text-blue-600 w-full py-2 rounded">Start</button>}</div>))}</div>}
        </div>
    );
  };

  const SubmissionList = ({ onView }) => (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6"><button onClick={() => setView('dashboard')} className="text-slate-500 hover:text-slate-800">&larr; Back</button><h2 className="text-2xl font-bold text-slate-800">Submissions: {currentAssignment?.title}</h2></div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200"><tr><th className="p-4 font-semibold text-slate-600">ID</th><th className="p-4 font-semibold text-slate-600">Mode</th><th className="p-4 font-semibold text-slate-600">Score</th><th className="p-4 font-semibold text-slate-600">Plagiarism</th><th className="p-4 font-semibold text-slate-600">Date</th><th className="p-4 font-semibold text-slate-600">Action</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{submissionsList.map(sub => { 
              const result = typeof sub.grading_result === 'string' ? JSON.parse(sub.grading_result) : sub.grading_result; 
              let plagColor = "bg-green-100 text-green-700"; if (sub.plagiarism_score > 50) plagColor = "bg-red-100 text-red-700"; else if (sub.plagiarism_score > 20) plagColor = "bg-yellow-100 text-yellow-700";
              return (
                <tr key={sub.id} className="hover:bg-slate-50">
                  <td className="p-4 text-slate-500">#{sub.id}</td>
                  <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold uppercase ${sub.submission_mode === 'image' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{sub.submission_mode}</span></td>
                  <td className="p-4"><Badge score={result?.score || 0} /></td>
                  <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${plagColor}`}>{sub.plagiarism_score}% Match</span></td>
                  <td className="p-4 text-slate-500 text-sm">{new Date(sub.created_at).toLocaleString()}</td>
                  <td className="p-4">
                      <button onClick={() => onView(sub)} className="p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors" title="View Submission">
                          <Eye size={18} />
                      </button>
                  </td>
                </tr>
              ); })}</tbody>
        </table>
        {submissionsList.length === 0 && <div className="p-8 text-center text-slate-400">No submissions found.</div>}
      </div>
    </div>
  );

  const StudentSubmissionForm = () => {
    const [mode, setMode] = useState('xml');
    const [xmlType, setXmlType] = useState('flowchart');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState([]);

    useEffect(() => { if(currentAssignment) fetchHistory(); }, [currentAssignment]);
    const fetchHistory = async () => { try { const res = await authFetch(`${API_BASE}/assignment/${currentAssignment.id}/my-submissions`); if(res.ok) setHistory(await res.json()); } catch(e){} };

    const handleFileChange = (e) => { const f = e.target.files[0]; setFile(f); if (f && f.type.startsWith('image/')) { setPreview(URL.createObjectURL(f)); setMode('image'); } else { setPreview(null); setMode('xml'); } };
    const handleSubmit = async (e) => {
      e.preventDefault(); setLoading(true);
      const formData = new FormData(); formData.append('diagram_file', file); formData.append('submission_mode', mode);
      if (mode === 'image') formData.append('description', description); if (mode === 'xml') formData.append('diagram_type', xmlType);
      try {
        const res = await authFetch(`${API_BASE}/submit/${currentAssignment.id}`, { method: 'POST', body: formData });
        if (!res.ok) { const errData = await res.json(); alert("Failed:\n" + formatValidationError(errData)); } else { const data = await res.json(); setGradingResult(data); setView('grading'); fetchHistory(); }
      } catch (err) { alert("Failed."); } finally { setLoading(false); }
    };

    return (
      <div className="max-w-5xl mx-auto grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white p-8 rounded-xl shadow-lg border border-slate-200">
            <div className="flex justify-between items-start mb-6 pb-6 border-b border-slate-100"><div><h2 className="text-2xl font-bold mb-2 text-slate-800">Submit: {currentAssignment.title}</h2><p className="text-slate-600">{currentAssignment.description}</p></div><div className="text-right"><span className="text-xs text-slate-500 block uppercase font-bold tracking-wider mb-1">Language</span><LanguageBadge lang={currentAssignment.language} /></div></div>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex gap-4 p-1 bg-slate-100 rounded-lg w-fit"><button type="button" onClick={() => setMode('xml')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'xml' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>XML</button><button type="button" onClick={() => setMode('image')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'image' ? 'bg-white shadow text-purple-600' : 'text-slate-500'}`}>Image</button></div>
                {mode === 'xml' && (<div className="bg-blue-50 p-4 rounded-lg border border-blue-100"><label className="block text-sm font-medium text-blue-900 mb-2">Type</label><div className="flex gap-4"><label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="xmlType" checked={xmlType === 'flowchart'} onChange={() => setXmlType('flowchart')} className="text-blue-600" /> <span className="text-slate-700">Flowchart</span></label><label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="xmlType" checked={xmlType === 'nassi_shneiderman'} onChange={() => setXmlType('nassi_shneiderman')} className="text-blue-600" /> <span className="text-slate-700">Nassi-Shneiderman</span></label></div></div>)}
                {mode === 'image' && (<div className="bg-purple-50 p-4 rounded-lg border border-purple-100 space-y-3"><label className="block text-sm font-medium text-purple-900">Description</label><textarea className="w-full p-2 border border-purple-200 rounded-md text-sm" rows="2" value={description} onChange={e => setDescription(e.target.value)} /></div>)}
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors"><input required type="file" id="fileInput" className="hidden" onChange={handleFileChange} /><label htmlFor="fileInput" className="cursor-pointer block">{preview ? (<img src={preview} alt="Preview" className="max-h-64 mx-auto rounded shadow-sm" />) : (<><Upload className="mx-auto h-12 w-12 text-slate-400 mb-2" /><span className="text-slate-600 font-medium">Upload File</span></>)}</label>{file && !preview && <div className="mt-4 text-sm font-bold text-slate-700 bg-slate-200 py-1 px-3 rounded inline-block">{file.name}</div>}</div>
                <button disabled={loading} type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold shadow-lg shadow-blue-200 transition-all flex justify-center items-center gap-2">{loading ? <RefreshCw className="animate-spin" /> : <CheckCircle />} Submit</button>
            </form>
        </div>
        <div className="col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><FileText size={18}/> History</h3>
            {history.length===0 ? <div className="text-slate-400 text-sm">No history.</div> : history.map(sub => {
                const score = (typeof sub.grading_result === 'string' ? JSON.parse(sub.grading_result) : sub.grading_result)?.score || 0;
                return (
                    <div key={sub.id} onClick={()=>handleViewSubmission(sub)} className="p-3 mb-2 border rounded hover:bg-blue-50 cursor-pointer">
                        <div className="flex justify-between"><span className="text-xs text-slate-500">{new Date(sub.created_at).toLocaleDateString()}</span><span className={`text-xs font-bold ${score>80?'text-green-600':'text-orange-600'}`}>{score}%</span></div>
                    </div>
                );
            })}
        </div>
      </div>
    );
  };

  const GradingResultView = () => {
    if (!gradingResult) return null;
    const { grading_result, generated_code, method_used, language, complexity, plagiarism_score, static_analysis, test_results } = gradingResult;
    let ext = ".py"; if (language === 'cpp') ext = ".cpp"; if (language === 'java') ext = ".java";
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <button onClick={() => setView('dashboard')} className="text-slate-500 hover:text-slate-800">&larr; Back to Assignments</button>
        <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4"><div><h2 className="text-2xl font-bold text-slate-800">Grading Complete</h2><div className="flex gap-3 mt-2"><span className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-600 text-xs flex items-center gap-1"><FileText size={10}/> {method_used}</span><LanguageBadge lang={language} /></div></div><div className="flex gap-4">{plagiarism_score !== undefined && plagiarism_score > 0 && (<div className={`flex flex-col items-center px-4 py-2 rounded-lg border ${plagiarism_score > 20 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}><span className="text-xs uppercase font-bold tracking-wider">Similarity</span><div className="text-xl font-black">{plagiarism_score}%</div></div>)}<div className="flex flex-col items-center bg-slate-50 px-4 py-2 rounded-lg border border-slate-100"><span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Grade</span><div className={`text-3xl font-black ${grading_result.score >= 80 ? 'text-green-500' : grading_result.score >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>{grading_result.score}%</div></div></div></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
             <div className={`p-6 rounded-xl border ${grading_result.is_correct ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}><div className="flex items-center gap-2 mb-2 font-bold text-lg">{grading_result.is_correct ? <CheckCircle className="text-green-600"/> : <AlertCircle className="text-red-600"/>}<span className={grading_result.is_correct ? 'text-green-800' : 'text-red-800'}>{grading_result.is_correct ? 'Logic Correct' : 'Issues Detected'}</span></div><p className="text-slate-700 leading-relaxed">{grading_result.feedback}</p></div>
             {complexity && <ComplexityBadge score={complexity} />}
             {static_analysis && <StaticAnalysisCard report={static_analysis} />}
             {test_results && <TestResultsCard results={test_results} />}
             {grading_result.logic_errors && grading_result.logic_errors.length > 0 && (<div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200"><h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><AlertCircle size={18} className="text-orange-500"/> Improvements</h3><ul className="space-y-2">{grading_result.logic_errors.map((err, i) => (<li key={i} className="flex gap-2 text-sm text-slate-600"><span className="text-orange-400">•</span> {err}</li>))}</ul></div>)}
          </div>
          <div className="bg-slate-900 rounded-xl overflow-hidden shadow-lg flex flex-col h-full"><div className="bg-slate-950 px-4 py-2 flex items-center justify-between border-b border-slate-800"><span className="text-slate-400 text-xs font-mono">generated_output{ext}</span><Code size={14} className="text-slate-500"/></div><pre className="p-4 text-sm font-mono text-green-400 overflow-auto flex-1">{generated_code}</pre></div>
        </div>
      </div>
    );
  };

  // ... HelpPage, AdminPanel ...

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <nav className="bg-slate-900 text-white p-4 shadow mb-6 flex justify-between">
        <div className="font-bold text-xl flex gap-2 items-center cursor-pointer" onClick={()=>setView('seminars')}><Code/> StructogramAI</div>
        <div className="flex gap-4 items-center">
            {user.role === 'admin' && <button onClick={() => setView('admin')}>Admin</button>}
            <button onClick={() => setView('help')}><HelpCircle size={20}/></button>
            <span>{user.username} ({user.role})</span>
            <button onClick={onLogout}><LogOut size={18}/></button>
        </div>
      </nav>
      {view === 'seminars' && <SeminarListView />}
      {view === 'dashboard' && <AssignmentDashboard />}
      {view === 'create' && <CreateForm />} 
      {view === 'submissions' && <SubmissionList onView={handleViewSubmission} />}
      {view === 'submit' && <StudentSubmissionForm />}
      {view === 'grading' && <GradingResultView />}
      {view === 'help' && <HelpPage />}
      {view === 'admin' && <AdminPanel />}
      <ChatWidget authFetch={authFetch} /> 
    </div>
  );
};