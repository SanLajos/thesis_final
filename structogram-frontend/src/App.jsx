import React, { useState, useEffect } from 'react';
import { 
  Code, HelpCircle, LogOut, Plus, Trash2, Eye, 
  FileText, RefreshCw, CheckCircle, AlertCircle, Upload 
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { api } from './services/ApiService';

// Import Components
import ChatWidget from './components/ChatWidget';
import { 
  DebugStatus, Badge, LanguageBadge, ComplexityBadge, 
  StaticAnalysisCard, TestResultsCard 
} from './components/CommonUI';

// --- SUB COMPONENTS (Refactored to use api service) ---

const SeminarListView = ({ setActiveSeminar, setView, user }) => {
  const [seminars, setSeminars] = useState([]);
  const [joinCode, setJoinCode] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newSem, setNewSem] = useState({title:'', invite_code:''});

  useEffect(() => { 
    api.request('/seminars').then(res => { if(res.ok) setSeminars(res.data); }); 
  }, []);

  const join = async () => { 
    if(!joinCode) return; 
    const res = await api.request('/seminar/join', 'POST', {invite_code: joinCode}); 
    if(res.ok){ 
      const listRes = await api.request('/seminars');
      if(listRes.ok) setSeminars(listRes.data); 
      setJoinCode(''); 
    } else alert("Failed to join"); 
  };

  const create = async () => { 
    const res = await api.request('/seminar', 'POST', newSem); 
    if(res.ok){ 
      const listRes = await api.request('/seminars');
      if(listRes.ok) setSeminars(listRes.data); 
      setShowCreate(false); 
    } else alert(res.data.error || "Failed"); 
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pt-6">
      <div className="flex justify-between items-end border-b pb-4">
        <h2 className="text-2xl font-bold">My Seminars</h2>
        <div className="flex gap-2">
          <input value={joinCode} onChange={e=>setJoinCode(e.target.value)} placeholder="Invite Code" className="border p-2 rounded"/>
          <button onClick={join} className="bg-blue-600 text-white px-4 rounded">Join</button>
          {user.role === 'teacher' && <button onClick={()=>setShowCreate(!showCreate)} className="bg-green-600 text-white px-4 rounded">Create</button>}
        </div>
      </div>
      {showCreate && (
        <div className="bg-green-50 p-4 rounded border flex gap-2">
          <input placeholder="Title" onChange={e=>setNewSem({...newSem, title:e.target.value})} className="p-2 rounded flex-1"/>
          <input placeholder="Code" onChange={e=>setNewSem({...newSem, invite_code:e.target.value})} className="p-2 rounded"/>
          <button onClick={create} className="bg-green-600 text-white px-4 rounded">Save</button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {seminars.map(s => (
          <div key={s.id} onClick={()=>{setActiveSeminar(s); setView('dashboard')}} className="bg-white p-6 rounded shadow cursor-pointer hover:shadow-md transition-shadow">
            <h3 className="font-bold text-lg">{s.title}</h3>
            <p className="text-gray-500 text-sm">Code: {s.invite_code}</p>
            {s.creator_name && <p className="text-xs text-gray-400 mt-2">By {s.creator_name}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

const CreateForm = ({ activeSeminar, setView, refreshAssignments }) => {
  const [formData, setFormData] = useState({
    title: '', description: '', grading_prompt: '', 
    language: 'python', grading_type: 'ai',
    plagiarism_check_enabled: false, static_analysis_enabled: false
  });
  const [file, setFile] = useState(null);
  const [testCases, setTestCases] = useState([{input: '', output: ''}]);

  const updateField = (field, val) => setFormData(prev => ({...prev, [field]: val}));
  const addTestCase = () => setTestCases([...testCases, {input: '', output: ''}]);
  const updateTestCase = (idx, field, val) => { 
    const newTC = [...testCases]; newTC[idx][field] = val; setTestCases(newTC); 
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = new FormData();
    payload.append('seminar_id', activeSeminar.id);
    Object.keys(formData).forEach(key => payload.append(key, formData[key]));
    payload.append('template_code', file);
    payload.append('test_cases', JSON.stringify(testCases.filter(tc => tc.input && tc.output)));

    // Using api.uploadSubmission logic (isFile=true)
    const res = await api.request('/assignment', 'POST', payload, true);
    if (res.ok) { 
      refreshAssignments(); 
      setView('dashboard'); 
    } else alert("Failed: " + (res.data.error || "Unknown"));
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded shadow">
      <h2 className="text-2xl font-bold mb-4">New Assignment for {activeSeminar.title}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
          <input placeholder="Title" className="w-full p-2 border rounded" onChange={e=>updateField('title', e.target.value)}/>
          <textarea placeholder="Description" className="w-full p-2 border rounded" onChange={e=>updateField('description', e.target.value)}/>
          <div className="flex gap-4">
            <select className="p-2 border rounded" onChange={e=>updateField('language', e.target.value)}>
              <option value="python">Python</option><option value="cpp">C++</option><option value="java">Java</option>
            </select>
            <select className="p-2 border rounded" onChange={e=>updateField('grading_type', e.target.value)}>
              <option value="ai">AI Grading</option><option value="keyword">Keyword Match</option>
            </select>
          </div>
          <div className="flex gap-4">
            <label><input type="checkbox" onChange={e=>updateField('plagiarism_check_enabled', e.target.checked)}/> Plagiarism Check</label>
            <label><input type="checkbox" onChange={e=>updateField('static_analysis_enabled', e.target.checked)}/> Static Analysis</label>
          </div>
          <div className="border p-2 rounded">
            <label className="block text-sm font-bold mb-1">Template Code File</label>
            <input type="file" onChange={e=>setFile(e.target.files[0])}/>
          </div>
          <div className="border p-4 rounded bg-slate-50">
            <h3 className="font-bold mb-2">Auto-Execution Test Cases</h3>
            {testCases.map((tc, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input placeholder="Input (stdin)" value={tc.input} onChange={e=>updateTestCase(i, 'input', e.target.value)} className="border p-1 rounded flex-1"/>
                <input placeholder="Expected Output (stdout)" value={tc.output} onChange={e=>updateTestCase(i, 'output', e.target.value)} className="border p-1 rounded flex-1"/>
              </div>
            ))}
            <button type="button" onClick={addTestCase} className="text-sm text-blue-600">+ Add Case</button>
          </div>
          <button className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">Create Assignment</button>
      </form>
    </div>
  );
};

const AssignmentDashboard = ({ activeSeminar, setView, user, assignments, setAssignments, setCurrentAssignment, fetchSubmissions }) => {
  const handleDelete = async (id) => { 
    if(window.confirm("Delete?")) { 
      await api.request(`/assignment/${id}`, 'DELETE'); 
      setAssignments(assignments.filter(a => a.id !== id)); 
    } 
  };

  return (
      <div className="max-w-6xl mx-auto space-y-6 pt-6">
          <div className="flex justify-between items-center">
            <button onClick={()=>setView('seminars')} className="text-gray-500 hover:text-black">&larr; Back</button>
            <h2 className="text-2xl font-bold">{activeSeminar.title}</h2>
            {user.role === 'teacher' && <button onClick={()=>setView('create')} className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2"><Plus size={16}/> New Assignment</button>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignments.map(a => (
              <div key={a.id} className="bg-white p-6 rounded shadow border border-slate-100 hover:border-blue-200 transition-all">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-lg">{a.title}</h3>
                  <div className="flex gap-2">
                    {(user.role === 'teacher' || user.role === 'admin') && (
                      <>
                        <button onClick={()=>{setCurrentAssignment(a); fetchSubmissions(a.id)}} className="text-blue-500 hover:bg-blue-50 p-1 rounded"><Eye size={18}/></button>
                        <button onClick={()=>handleDelete(a.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={18}/></button>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 my-2 line-clamp-2">{a.description}</p>
                <div className="flex justify-between items-center mt-4">
                  <LanguageBadge lang={a.language} />
                  {user.role === 'student' && <button onClick={()=>{setCurrentAssignment(a); setView('submit')}} className="bg-blue-100 text-blue-600 px-4 py-1 rounded text-sm font-bold hover:bg-blue-200">Start</button>}
                </div>
              </div>
            ))}
          </div>
          {assignments.length === 0 && <div className="text-center text-gray-400 py-10">No assignments yet.</div>}
      </div>
  );
};

const SubmissionList = ({ submissionsList, setView, setGradingResult, currentAssignment }) => {
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

const StudentSubmissionForm = ({ currentAssignment, setView, setGradingResult }) => {
  const [mode, setMode] = useState('xml');
  const [xmlType, setXmlType] = useState('flowchart');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    const formData = new FormData(); 
    formData.append('diagram_file', file); 
    formData.append('submission_mode', mode);
    if (mode === 'image') formData.append('description', description); 
    if (mode === 'xml') formData.append('diagram_type', xmlType);
    
    try {
      // Using api.request with isFile=true
      const res = await api.request(`/submit/${currentAssignment.id}`, 'POST', formData, true);
      if (!res.ok) { 
        alert("Failed:\n" + (res.data.error || "Unknown")); 
      } else { 
        // Normalize data for the view
        const data = res.data;
        // The backend returns standardized JSON, but we ensure consistency
        setGradingResult({
            ...data,
            method_used: mode,
            is_correct: data.grading_result?.is_correct,
            logic_errors: data.grading_result?.logic_errors
        });
        setView('grading'); 
      }
    } catch (err) { alert("Failed."); } 
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-lg border border-slate-200 mt-10">
        <button onClick={() => setView('dashboard')} className="text-slate-500 mb-4">&larr; Back</button>
        <h2 className="text-2xl font-bold mb-2">Submit: {currentAssignment.title}</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex gap-4 p-1 bg-slate-100 rounded-lg w-fit">
              <button type="button" onClick={() => setMode('xml')} className={`px-4 py-2 rounded ${mode === 'xml' ? 'bg-white shadow text-blue-600' : ''}`}>XML File</button>
              <button type="button" onClick={() => setMode('image')} className={`px-4 py-2 rounded ${mode === 'image' ? 'bg-white shadow text-purple-600' : ''}`}>Image</button>
            </div>
            {mode === 'xml' && (
              <div className="flex gap-4">
                <label><input type="radio" checked={xmlType === 'flowchart'} onChange={() => setXmlType('flowchart')} /> Flowchart (.xml)</label>
                <label><input type="radio" checked={xmlType === 'nassi_shneiderman'} onChange={() => setXmlType('nassi_shneiderman')} /> Nassi-Shneiderman (.xml)</label>
              </div>
            )}
            {mode === 'image' && <textarea className="w-full p-2 border rounded" placeholder="Describe logic..." value={description} onChange={e => setDescription(e.target.value)} />}
            <div className="border-2 border-dashed border-slate-300 p-8 text-center rounded"><input required type="file" onChange={e => setFile(e.target.files[0])} /></div>
            <button disabled={loading} className="w-full py-3 bg-blue-600 text-white rounded font-bold">{loading ? <RefreshCw className="animate-spin inline" /> : "Submit & Grade"}</button>
        </form>
    </div>
  );
};

const GradingResultView = ({ gradingResult, setView }) => {
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

// --- AUTH PAGES ---
const LoginPage = ({ onLogin, onSwitch }) => {
  const [formData, setFormData] = useState({ identifier: '', password: '' }); 
  const [error, setError] = useState(''); const [status, setStatus] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault(); setStatus('Logging in...'); setError('');
    try {
      const res = await api.login(formData.identifier, formData.password);
      if (res.ok) { 
          setStatus('Success!'); 
          onLogin(res.data.user); 
      } else { 
          setStatus(''); 
          setError(res.data.error || 'Login failed'); 
      }
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
            const res = await api.register(formData);
            if (res.ok) { 
                setStatus('Success!'); 
                onLogin(res.data.user); 
            } else { 
                setStatus(''); 
                // Simple error handling for brevity
                setError(res.data.error || "Registration failed"); 
            }
        } catch (err) { setStatus(''); setError(`Network Error: ${err.message}`); }
    };
    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4"><div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md space-y-4"><h1 className="text-2xl font-bold">Register</h1><DebugStatus status={status} error={error} /><input className="w-full p-2 border rounded" placeholder="Username" onChange={e=>setFormData({...formData, username:e.target.value})}/><input className="w-full p-2 border rounded" placeholder="Email" onChange={e=>setFormData({...formData, email:e.target.value})}/><input className="w-full p-2 border rounded" type="password" placeholder="Password" onChange={e=>setFormData({...formData, password:e.target.value})}/><select className="w-full p-2 border rounded" onChange={e=>setFormData({...formData, role:e.target.value})}><option value="student">Student</option><option value="teacher">Teacher</option><option value="admin">Admin</option></select><button className="w-full bg-green-600 text-white p-2 rounded" onClick={handleSubmit}>Register</button><button onClick={onSwitch} className="text-blue-600 text-sm">Login instead</button></div></div>
    );
};

// --- ROOT APP ---
export default function App() {
  const [user, setUser] = useState(null); 
  const [view, setView] = useState('login'); 
  const [loading, setLoading] = useState(true);
  
  // App-Wide State (Lifted Up)
  const [activeSeminar, setActiveSeminar] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [currentAssignment, setCurrentAssignment] = useState(null);
  const [submissionsList, setSubmissionsList] = useState([]);
  const [gradingResult, setGradingResult] = useState(null);

  useEffect(() => {
    const checkSession = async () => {
        if (api.token) {
            const res = await api.getMe();
            if (res.ok) { 
                setUser(res.data.user); 
                setView('seminars'); 
            } else { 
                api.clearSession(); 
            }
        }
        setLoading(false);
    };
    checkSession();
  }, []);

  // Fetch assignments when entering dashboard
  useEffect(() => {
    if (view === 'dashboard' && activeSeminar) {
        refreshAssignments();
    }
  }, [view, activeSeminar]);

  const refreshAssignments = () => {
    api.request(`/assignments?seminar_id=${activeSeminar.id}`)
       .then(r => r.ok ? setAssignments(r.data) : setAssignments([]));
  }

  const fetchSubmissions = async (aid) => {
    const res = await api.request(`/assignment/${aid}/submissions`);
    if(res.ok) {
        setSubmissionsList(res.data);
        setView('submissions');
    }
  };

  const handleLogin = (userObj) => { setUser(userObj); setView('seminars'); };
  const handleLogout = () => { api.clearSession(); setUser(null); setView('login'); };

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  if (!user) {
    if (view === 'register') return <RegisterPage onLogin={handleLogin} onSwitch={() => setView('login')} />;
    return <LoginPage onLogin={handleLogin} onSwitch={() => setView('register')} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <nav className="bg-slate-900 text-white p-4 shadow mb-6 flex justify-between">
        <div className="font-bold text-xl flex gap-2 items-center cursor-pointer" onClick={()=>setView('seminars')}><Code/> StructogramAI</div>
        <div className="flex gap-4 items-center">
            {user.role === 'admin' && <button onClick={() => setView('admin')}>Admin</button>}
            <button onClick={() => setView('help')}><HelpCircle size={20}/></button>
            <span>{user.username} ({user.role})</span>
            <button onClick={handleLogout}><LogOut size={18}/></button>
        </div>
      </nav>
      
      {/* View Router */}
      {view === 'seminars' && <SeminarListView setActiveSeminar={setActiveSeminar} setView={setView} user={user} />}
      
      {view === 'dashboard' && activeSeminar && (
        <AssignmentDashboard 
          activeSeminar={activeSeminar} 
          setView={setView} 
          user={user} 
          assignments={assignments} 
          setAssignments={setAssignments}
          setCurrentAssignment={setCurrentAssignment}
          fetchSubmissions={fetchSubmissions}
        />
      )}

      {view === 'create' && (
        <CreateForm 
          activeSeminar={activeSeminar} 
          setView={setView} 
          refreshAssignments={refreshAssignments} 
        />
      )}

      {view === 'submissions' && (
        <SubmissionList 
          submissionsList={submissionsList} 
          setView={setView} 
          setGradingResult={setGradingResult}
          currentAssignment={currentAssignment}
        />
      )}

      {view === 'submit' && (
        <StudentSubmissionForm 
          currentAssignment={currentAssignment} 
          setView={setView} 
          setGradingResult={setGradingResult}
        />
      )}

      {view === 'grading' && (
        <GradingResultView 
          gradingResult={gradingResult} 
          setView={setView} 
        />
      )}

      <ChatWidget /> 
    </div>
  );
}