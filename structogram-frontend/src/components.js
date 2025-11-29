import React from 'react';
import { 
  Activity, Languages, ClipboardCheck, Play, Check, X, 
  Code, LogOut, HelpCircle, User, Shield, GraduationCap, Sparkles, MessageSquare, Send
} from 'lucide-react';

// --- BADGES & CARDS ---

export const DebugStatus = ({ status, error }) => {
  if (!status && !error) return null;
  return (
    <div className={`mb-4 p-3 rounded text-sm border ${error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
      <p className="font-bold">{error ? "Error:" : "Status:"}</p>
      <p>{error || status}</p>
    </div>
  );
};

export const Badge = ({ score }) => {
  let color = "bg-gray-100 text-gray-800";
  if (score >= 80) color = "bg-green-100 text-green-800";
  else if (score >= 50) color = "bg-yellow-100 text-yellow-800";
  else if (score > 0) color = "bg-red-100 text-red-800";
  return (<span className={`px-3 py-1 rounded-full text-sm font-bold ${color}`}>Score: {score}/100</span>);
};

export const LanguageBadge = ({ lang }) => {
  const l = lang || 'python';
  const colors = { python: "bg-blue-100 text-blue-700 border-blue-200", cpp: "bg-orange-100 text-orange-700 border-orange-200", java: "bg-red-100 text-red-700 border-red-200" };
  return (<span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono border ${colors[l] || colors.python}`}><Languages size={10} /> {l}</span>);
};

export const ComplexityBadge = ({ score }) => (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-blue-50 text-blue-700 border-blue-200">
        <Activity size={18} />
        <div><div className="text-xs uppercase font-bold opacity-70">Cyclomatic</div><div className="font-bold text-lg">{score}</div></div>
    </div>
);

export const StaticAnalysisCard = ({ report }) => {
  if (!report) return null;
  let c = report.style_score < 80 ? (report.style_score < 50 ? "border-red-200 bg-red-50" : "border-yellow-200 bg-yellow-50") : "border-green-200 bg-green-50";
  return (
    <div className={`p-4 rounded-lg border ${c} space-y-2`}>
      <div className="flex justify-between items-center"><h3 className="font-bold text-slate-800 flex items-center gap-2"><ClipboardCheck size={18} /> Style Check</h3><span className="font-black text-lg">{report.style_score}/100</span></div>
      {report.issues.length === 0 ? (<p className="text-sm text-green-700">Clean code!</p>) : (<ul className="list-disc list-inside space-y-1">{report.issues.map((issue, i) => (<li key={i} className="text-xs text-slate-700 font-mono">{issue}</li>))}</ul>)}
    </div>
  );
};

export const TestResultsCard = ({ results }) => {
    if (!results || !results.results) return null;
    const passedRate = Math.round((results.passed / results.total) * 100);
    const color = passedRate === 100 ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50";
    return (
        <div className={`p-4 rounded-lg border ${color} space-y-4`}>
            <div className="flex justify-between items-center border-b border-gray-200 pb-2"><h3 className="font-bold text-slate-800 flex items-center gap-2"><Play size={18}/> Sandbox</h3><span className={`font-bold text-sm ${passedRate===100 ? 'text-green-600' : 'text-red-600'}`}>{results.passed}/{results.total} Passed</span></div>
            <div className="space-y-2">{results.results.map((res, i) => (<div key={i} className="bg-white p-3 rounded border border-gray-100 text-sm"><div className="flex justify-between mb-1"><span className="font-mono text-xs text-slate-500">In: {res.input}</span>{res.passed ? <span className="flex items-center text-green-600 text-xs font-bold"><Check size={14}/> Pass</span> : <span className="flex items-center text-red-600 text-xs font-bold"><X size={14}/> Fail</span>}</div>{!res.passed && (<div className="bg-red-50 p-2 rounded font-mono text-xs text-red-800 mt-1">Expected: "{res.expected}"<br/>Actual: "{res.actual}"</div>)}</div>))}</div>
        </div>
    );
  };

// --- NAVBAR ---

export const Navbar = ({ user, view, setView, onLogout }) => (
    <nav className="bg-slate-900 text-white p-4 shadow mb-6 flex justify-between sticky top-0 z-50">
      <div className="font-bold text-xl flex gap-2 items-center cursor-pointer" onClick={() => setView('seminars')}>
        <Code className="text-blue-400" /> StructogramAI
      </div>
      <div className="flex gap-4 items-center">
        {user.role === 'admin' && <button onClick={() => setView('admin')} className="hover:text-blue-300">Admin</button>}
        <button onClick={() => setView('help')}><HelpCircle size={20} /></button>
        <div className="flex items-center gap-2 text-sm text-slate-300 border-l pl-4 border-slate-700">
            {user.role === 'teacher' && <User size={16} className="text-green-400"/>}
            {user.role === 'student' && <GraduationCap size={16} className="text-blue-400"/>}
            {user.role === 'admin' && <Shield size={16} className="text-red-400"/>}
            <span className="capitalize">{user.username}</span>
        </div>
        <button onClick={onLogout}><LogOut size={18} /></button>
      </div>
    </nav>
);

// --- CHAT WIDGET ---

export const ChatWidget = ({ authFetch, API_BASE }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([{role: 'ai', text: "Hi! Ask me about diagrams or code."}]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const endRef = React.useRef(null);
  
    React.useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages, isOpen]);
  
    const send = async (e) => {
      e.preventDefault(); if (!input.trim()) return;
      const userMsg = { role: 'student', text: input };
      setMessages(p => [...p, userMsg]); setInput(''); setIsTyping(true);
      try {
        const res = await authFetch(`${API_BASE}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: userMsg.text, history: messages.slice(-5) }) });
        const data = await res.json();
        setMessages(p => [...p, { role: 'ai', text: res.ok ? data.response : "Error." }]);
      } catch { setMessages(p => [...p, { role: 'ai', text: "Network Error." }]); } finally { setIsTyping(false); }
    };
  
    if (!isOpen) return <button onClick={() => setIsOpen(true)} className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg z-50 flex gap-2"><MessageSquare /><span className="hidden md:inline font-bold">AI Tutor</span></button>;
  
    return (
      <div className="fixed bottom-6 right-6 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 flex flex-col h-96 animate-in slide-in-from-bottom-10 fade-in">
        <div className="bg-slate-900 text-white p-3 rounded-t-xl flex justify-between items-center"><div className="flex gap-2 font-bold"><Sparkles size={16} className="text-yellow-400"/> Tutor</div><button onClick={() => setIsOpen(false)}><X size={16}/></button></div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50">{messages.map((m, i) => (<div key={i} className={`p-2 rounded text-sm ${m.role==='student'?'bg-blue-600 text-white self-end ml-8':'bg-white border text-slate-800 mr-8'}`}>{m.text}</div>))}{isTyping && <div className="text-xs text-slate-400 ml-2">Typing...</div>}<div ref={endRef}/></div>
        <form onSubmit={send} className="p-2 border-t flex gap-2"><input value={input} onChange={e=>setInput(e.target.value)} className="flex-1 border rounded p-1 text-sm"/><button disabled={!input || isTyping} className="bg-blue-600 text-white p-1 rounded"><Send size={16}/></button></form>
      </div>
    );
};