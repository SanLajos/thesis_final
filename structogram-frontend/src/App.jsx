import React, { useState, useEffect } from 'react';
import { Code, HelpCircle, LogOut } from 'lucide-react';
import { api } from './services/ApiService';
import { ToastProvider, useToast } from './context/ToastContext'; // Import Context

// --- Import Components ---
import ChatWidget from './components/ChatWidget';

// --- Import Pages ---
import { Login, Register } from './pages/Login';
import { SeminarList } from './pages/SeminarList';
import { AssignmentDashboard } from './pages/AssignmentDashboard';
import { AssignmentCreate } from './pages/AssignmentCreate';
import { SubmissionList } from './pages/SubmissionList';
import { StudentSubmission } from './pages/StudentSubmission';
import { GradingResult } from './pages/GradingResult';

// --- Main Application Logic ---
function MainApp() {
  const [user, setUser] = useState(null); 
  const [view, setView] = useState('login'); 
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast(); // Now accessible here
  
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
    } else {
        addToast("Failed to fetch submissions", "error");
    }
  };

  const handleLogin = (userObj) => { 
      setUser(userObj); 
      setView('seminars'); 
      addToast(`Welcome back, ${userObj.username}!`, "success");
  };
  
  const handleLogout = () => { 
      api.clearSession(); 
      setUser(null); 
      setView('login'); 
      addToast("Logged out successfully", "info");
  };

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  
  if (!user) {
    if (view === 'register') return <Register onLogin={handleLogin} onSwitch={() => setView('login')} />;
    return <Login onLogin={handleLogin} onSwitch={() => setView('register')} />;
  }

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
        <GradingResult 
          gradingResult={gradingResult} 
          setView={setView} 
        />
      )}

      <ChatWidget /> 
    </div>
  );
}

// --- ROOT WRAPPER ---
export default function App() {
    return (
        <ToastProvider>
            <MainApp />
        </ToastProvider>
    );
}