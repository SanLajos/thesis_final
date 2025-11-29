import React, { useState, useEffect } from 'react';
import { Code, HelpCircle, LogOut, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from './services/ApiService';

// --- Import Components ---
import ChatWidget from './components/ChatWidget';
import { 
  DebugStatus, Badge, LanguageBadge, ComplexityBadge, 
  StaticAnalysisCard, TestResultsCard 
} from './components/CommonUI';

// --- Import Pages ---
import { Login, Register } from './pages/Login';
import { SeminarList } from './pages/SeminarList';
import { AssignmentDashboard } from './pages/AssignmentDashboard';
import { AssignmentCreate } from './pages/AssignmentCreate';
import { SubmissionList } from './pages/SubmissionList';
import { StudentSubmission } from './pages/StudentSubmission';

// --- Inline Component (Keep this here if not moved to its own file yet) ---
const GradingResultView = ({ gradingResult, setView }) => {
  if (!gradingResult) return null;
  
  const { 
    grading_result, generated_code, method_used, language, 
    complexity, static_analysis, test_results 
  } = gradingResult;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pt-6">
      <button onClick={() => setView('dashboard')} className="text-slate-500 hover:text-black">&larr; Back</button>
      <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Grading Report</h2>
          <div className="flex gap-2 items-center">
            <LanguageBadge lang={language} />
            <Badge score={grading_result?.score || 0} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
             <div className={`p-4 rounded border ${grading_result?.is_correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
               <h3 className="font-bold flex items-center gap-2">
                 {grading_result?.is_correct ? <CheckCircle className="text-green-600"/> : <AlertCircle className="text-red-600"/>}
                 AI Feedback
               </h3>
               <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{grading_result?.feedback}</p>
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

// --- ROOT APP ---
export default function App() {
  const [user, setUser] = useState(null); 
  const [view, setView] = useState('login'); 
  const [loading, setLoading] = useState(true);
  
  // App-Wide State
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
  
  // Auth Views
  if (!user) {
    if (view === 'register') return <Register onLogin={handleLogin} onSwitch={() => setView('login')} />;
    return <Login onLogin={handleLogin} onSwitch={() => setView('register')} />;
  }

  // Main App View
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <nav className="bg-slate-900 text-white p-4 shadow mb-6 flex justify-between">
        <div className="font-bold text-xl flex gap-2 items-center cursor-pointer" onClick={()=>setView('seminars')}>
          <Code/> StructogramAI
        </div>
        <div className="flex gap-4 items-center">
            {user.role === 'admin' && <button onClick={() => setView('admin')}>Admin</button>}
            <button onClick={() => setView('help')}><HelpCircle size={20}/></button>
            <span>{user.username} ({user.role})</span>
            <button onClick={handleLogout}><LogOut size={18}/></button>
        </div>
      </nav>
      
      {/* View Router */}
      {view === 'seminars' && (
        <SeminarList 
          setActiveSeminar={setActiveSeminar} 
          setView={setView} 
          user={user} 
        />
      )}
      
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
        <AssignmentCreate 
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
        <StudentSubmission 
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