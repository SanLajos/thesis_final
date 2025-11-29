import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, FileText, RefreshCw, Eye, Languages, AlertTriangle, Users, ArrowRight, ClipboardCheck, Upload, Play, Check, X
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// --- Import Modules ---
import { API_BASE, authFetch, formatValidationError } from './utils';
import { Navbar, Badge, LanguageBadge, ComplexityBadge, StaticAnalysisCard, TestResultsCard, ChatWidget, DebugStatus } from './components';
import { LoginPage, RegisterPage } from './AuthPages';

// --- MAIN ROOT COMPONENT ---

export default function App() {
  const [user, setUser] = useState(null); 
  const [view, setView] = useState('login'); 
  const [loading, setLoading] = useState(true);

  // 1. Check Session on Load
  useEffect(() => {
    const checkSession = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            if (token) {
                // Verify token with backend
                const res = await authFetch(`${API_BASE}/auth/me`);
                if (res.ok) { 
                    const data = await res.json(); 
                    setUser(data.user); 
                    setView('seminars'); 
                } else { 
                    localStorage.clear(); 
                }
            }
        } catch (e) { console.error("Session check", e); }
        setLoading(false);
    };
    checkSession();
  }, []);

  // 2. Login Handler (Called by AuthPages)
  const handleLogin = (data) => {
      // Save Tokens from the response data
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('refresh_token', data.refresh_token);
      
      // Set User State
      setUser(data.user);
      setView('seminars');
  };

  // 3. Logout Handler
  const handleLogout = () => { 
      localStorage.clear(); 
      setUser(null); 
      setView('login'); 
  };

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  // 4. Auth Routing
  if (!user) {
    if (view === 'register') {
        return <RegisterPage onLogin={handleLogin} onSwitch={() => setView('login')} />;
    }
    return <LoginPage onLogin={handleLogin} onSwitch={() => setView('register')} />;
  }

  // 5. Main App Render
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
        <Navbar user={user} view={view} setView={setView} onLogout={handleLogout} />
        
        <main className="max-w-6xl mx-auto p-6 mt-6">
            <MainViews view={view} setView={setView} user={user} />
        </main>

        <ChatWidget authFetch={authFetch} API_BASE={API_BASE} />
    </div>
  );
}

// --- VIEW CONTROLLER ---

const MainViews = ({ view, setView, user }) => {
    const [activeSeminar, setActiveSeminar] = useState(null);
    
    // Routing Logic
    if (view === 'seminars') return <SeminarListView user={user} setView={setView} setActiveSeminar={setActiveSeminar} />;
    if (view === 'dashboard' && activeSeminar) return <AssignmentDashboard user={user} activeSeminar={activeSeminar} setView={setView} />;
    if (view === 'create') return <CreateForm activeSeminar={activeSeminar} setView={setView} />;
    if (view === 'help') return <HelpPage />;
    if (view === 'admin') return <AdminPanel />;
    
    // Fallback
    return <SeminarListView user={user} setView={setView} setActiveSeminar={setActiveSeminar} />;
};

// --- SUB COMPONENTS (View Logic) ---

const SeminarListView = ({ user, setView, setActiveSeminar }) => {
    const [seminars, setSeminars] = useState([]);
    const [joinCode, setJoinCode] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [newSem, setNewSem] = useState({title:'', invite_code:''});

    useEffect(()=>{ authFetch(`${API_BASE}/seminars`).then(r=>r.ok?r.json():[]).then(setSeminars); },[]);

    const join = async () => { if(!joinCode)return; const res=await authFetch(`${API_BASE}/seminar/join`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({invite_code:joinCode})}); if(res.ok){ authFetch(`${API_BASE}/seminars`).then(r=>r.json()).then(setSeminars); setJoinCode(''); } else alert("Failed to join"); };
    const create = async () => { const res=await authFetch(`${API_BASE}/seminar`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(newSem)}); if(res.ok){ authFetch(`${API_BASE}/seminars`).then(r=>r.json()).then(setSeminars); setShowCreate(false); } else { const e = await res.json(); alert(formatValidationError(e)); } };

    return (
      <div className="space-y-8 animate-in fade-in">
        <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-slate-200 pb-6">
          <div><h2 className="text-3xl font-bold text-slate-800">My Seminars</h2><p className="text-slate-500 mt-1">Select a class to view assignments</p></div>
          <div className="flex gap-2 w-full md:w-auto">
            <input placeholder="Enter Invite Code" value={joinCode} onChange={e=>setJoinCode(e.target.value)} className="border p-2 rounded-lg flex-1 md:w-48"/>
            <button onClick={join} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">Join</button>
            {user.role === 'teacher' && (<button onClick={() => setShowCreate(!showCreate)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2 ml-2"><Plus size={18}/> Create</button>)}
          </div>
        </div>
        {showCreate && (
          <div className="bg-green-50 border border-green-100 p-6 rounded-xl mb-6">
            <h3 className="font-bold text-green-900 mb-4">Create New Seminar</h3>
            <div className="flex gap-4">
              <div className="flex-1"><label className="block text-xs font-bold text-green-700 uppercase mb-1">Title</label><input value={newSem.title} onChange={e=>setNewSem({...newSem, title:e.target.value})} placeholder="e.g. CS101" className="w-full p-2 rounded border border-green-200"/></div>
              <div className="flex-1"><label className="block text-xs font-bold text-green-700 uppercase mb-1">Code</label><input value={newSem.invite_code} onChange={e=>setNewSem({...newSem, invite_code:e.target.value})} placeholder="Unique Code" className="w-full p-2 rounded border border-green-200"/></div>
              <div className="flex items-end"><button onClick={create} className="bg-green-600 text-white px-6 py-2 rounded-lg shadow-sm hover:bg-green-700 font-bold">Save</button></div>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {seminars.map(sem => (
            <div key={sem.id} onClick={() => { setActiveSeminar(sem); setView('dashboard'); }} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group">
              <div className="flex justify-between items-start"><div className="bg-blue-100 p-3 rounded-lg text-blue-600 mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors"><Users size={24}/></div><div className="bg-slate-100 text-slate-500 px-2 py-1 rounded text-xs font-mono">{sem.invite_code}</div></div>
              <h3 className="text-xl font-bold text-slate-800 mb-1">{sem.title}</h3><p className="text-sm text-slate-500">Created by {sem.creator_name}</p>
              <div className="mt-4 flex items-center text-blue-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">View Assignments <ArrowRight size={16} className="ml-1"/></div>
            </div>
          ))}
          {seminars.length === 0 && (<div className="col-span-full py-20 text-center text-slate-400 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200"><Users size={48} className="mx-auto mb-4 opacity-20"/><p>You haven't joined any seminars yet.</p></div>)}
        </div>
      </div>
    );
};

const AssignmentDashboard = ({ user, activeSeminar, setView }) => {
    const [assignments, setAssignments] = useState([]);
    const [viewState, setViewState] = useState('list'); // list, analytics, grading, submit
    const [currentAssignment, setCurrentAssignment] = useState(null);
    const [gradingResult, setGradingResult] = useState(null);
    const [submissionsList, setSubmissionsList] = useState([]);

    useEffect(() => {
        authFetch(`${API_BASE}/assignments?seminar_id=${activeSeminar.id}`).then(r=>r.ok?r.json():[]).then(setAssignments);
    }, [activeSeminar]);

    const fetchSubmissions = async (id) => { 
        const res = await authFetch(`${API_BASE}/assignment/${id}/submissions`); 
        const data = await res.json(); 
        setSubmissionsList(data); 
        setViewState('submissions'); 
    };

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
        setViewState('grading');
    };

    const handleDelete = async (id) => { 
        if(window.confirm("Delete?")) { 
            await authFetch(`${API_BASE}/assignment/${id}`, { method: 'DELETE' }); 
            setAssignments(assignments.filter(a => a.id !== id)); 
        } 
    };

    // Sub-Views within Dashboard
    if (viewState === 'analytics') return <SeminarAnalytics seminarId={activeSeminar.id} onBack={()=>setViewState('list')} />;
    if (viewState === 'submit') return <StudentSubmissionForm assignment={currentAssignment} onBack={()=>setViewState('list')} onResult={(data)=>{setGradingResult(data); setViewState('grading');}} />;
    if (viewState === 'grading') return <GradingResultView result={gradingResult} onBack={()=>setViewState('list')} />;
    if (viewState === 'submissions') return <SubmissionList submissions={submissionsList} onBack={()=>setViewState('list')} onView={(sub)=>handleViewSubmission(sub)} />;

    // Default: List
    return (
        <div className="space-y-6">
          <div className="flex justify-between items-center mb-6">
            <div><button onClick={()=>setView('seminars')} className="text-sm text-slate-500 hover:text-slate-800 mb-1">&larr; Back to Seminars</button><h2 className="text-2xl font-bold text-slate-800">{activeSeminar.title}</h2></div>
            {user.role === 'teacher' && (
              <div className="flex gap-4">
                  <div className="flex bg-white rounded-lg border border-slate-200 p-1">
                      <button onClick={()=>setViewState('list')} className="px-4 py-1 rounded-md text-sm font-medium bg-slate-100 text-slate-800 shadow-sm">List</button>
                      <button onClick={()=>setViewState('analytics')} className="px-4 py-1 rounded-md text-sm font-medium text-slate-500 hover:bg-slate-50">Analytics</button>
                  </div>
                  <button onClick={() => setView('create')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 transition-colors shadow-sm"><Plus size={18}/> New Assignment</button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {assignments.map(a => (
                  <div key={a.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-blue-400 transition-all group">
                  <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{a.title}</h3>
                      <div className="flex gap-2">
                      {(user.role === 'teacher' || user.role === 'admin') && (<><button onClick={() => { setCurrentAssignment(a); fetchSubmissions(a.id); }} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Eye size={18}/></button><button onClick={() => handleDelete(a.id)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18}/></button></>)}
                      </div>
                  </div>
                  <div className="flex gap-2 mb-3"><LanguageBadge lang={a.language} />{a.plagiarism_check_enabled && <span className="bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1"><AlertTriangle size={10}/> Plagiarism</span>}{a.static_analysis_enabled && <span className="bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1"><ClipboardCheck size={10}/> Strict</span>}</div>
                  <p className="text-slate-600 mb-4 text-sm line-clamp-2">{a.description}</p>
                  {user.role === 'student' && (<button onClick={() => { setCurrentAssignment(a); setViewState('submit'); }} className="w-full py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium text-sm transition-colors">Start Assignment</button>)}
                  </div>
              ))}
              {assignments.length === 0 && <div className="col-span-2 text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">No assignments created yet.</div>}
          </div>
        </div>
    );
};

// ... (CreateForm, SeminarAnalytics, SubmissionList, StudentSubmissionForm, GradingResultView, HelpPage, AdminPanel)
// ... (These components need to be pasted here from the previous large App.js, but using the props passed down)

// Example: Wrapper for SeminarAnalytics to handle back button
const SeminarAnalytics = ({ seminarId, onBack }) => {
    const [data, setData] = useState(null);
    useEffect(() => { authFetch(`${API_BASE}/seminar/${seminarId}/analytics`).then(r=>r.json()).then(setData); }, [seminarId]);
    if (!data) return <div>Loading stats...</div>;
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
    return (
        <div className="space-y-8 animate-in fade-in">
            <button onClick={onBack} className="text-sm text-slate-500 mb-4">&larr; Back to List</button>
            {/* ... Rest of Analytics UI ... */}
            <div className="grid grid-cols-3 gap-6"><div className="bg-white p-6 rounded-xl border shadow-sm"><h3 className="text-slate-500 text-xs font-bold uppercase mb-2">Students</h3><div className="text-3xl font-black text-slate-800">{data.student_count}</div></div><div className="bg-white p-6 rounded-xl border shadow-sm"><h3 className="text-slate-500 text-xs font-bold uppercase mb-2">Assignments</h3><div className="text-3xl font-black text-blue-600">{data.assignment_count}</div></div><div className="bg-white p-6 rounded-xl border shadow-sm"><h3 className="text-slate-500 text-xs font-bold uppercase mb-2">At Risk</h3><div className="text-3xl font-black text-red-500">{data.at_risk_students.length}</div></div></div>
            {/* ... Charts ... */}
        </div>
    );
};

// ... Include CreateForm, SubmissionList, StudentSubmissionForm, GradingResultView, HelpPage, AdminPanel from previous responses here ...
// Ensure they receive props correctly (e.g. activeSeminar instead of using state from MainApp directly)

const CreateForm = ({ activeSeminar, setView }) => {
    // ... Logic ...
    // Use props.activeSeminar.id instead of state
    return <div>Create Form Placeholder (Copy full code)</div>;
};

const SubmissionList = ({ submissions, onBack, onView }) => (
    <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6"><button onClick={onBack} className="text-slate-500 hover:text-slate-800">&larr; Back</button><h2 className="text-2xl font-bold text-slate-800">Submissions</h2></div>
        {/* Table ... */}
    </div>
);

const StudentSubmissionForm = ({ assignment, onBack, onResult }) => {
    // ... Logic ...
    return <div>Student Form Placeholder (Copy full code)</div>;
};

const GradingResultView = ({ result, onBack }) => {
     // ... Logic ...
     // Use result prop
     return <div>Grading View Placeholder (Copy full code)</div>;
};

const HelpPage = () => <div className="p-8">Help Page</div>;
const AdminPanel = () => <div className="p-8">Admin Panel</div>;