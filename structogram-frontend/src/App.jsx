import React, { useState, useEffect } from 'react';
import { Code, HelpCircle, LogOut, ArrowLeft } from 'lucide-react'; // Added ArrowLeft
import { api } from './services/ApiService';

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

  // --- ROUTING LOGIC (Hash Based) ---
  
  // 1. Listen for URL hash changes (Browser Back Button support)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) setView(hash);
    };

    // Initialize on load
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // 2. Custom Navigation Function (Replaces setView)
  const navigate = (newView) => {
    window.location.hash = newView;
    setView(newView); // Immediate update for responsiveness
  };

  // 3. Back Button Action
  const goBack = () => {
    window.history.back();
  };

  // --- INITIALIZATION ---

  useEffect(() => {
    const checkSession = async () => {
        if (api.token) {
            const res = await api.getMe();
            if (res.ok) { 
                setUser(res.data.user); 
                // Redirect to seminars if on login page or root
                if (view === 'login' || view === '') navigate('seminars');
            } else { 
                api.clearSession(); 
                navigate('login');
            }
        } else {
            navigate('login');
        }
        setLoading(false);
    };
    checkSession();
  }, []);

  // Fetch assignments when entering dashboard
  useEffect(() => {
    if (view === 'dashboard' && activeSeminar) {
        refreshAssignments();
    } else if (view === 'dashboard' && !activeSeminar) {
        // Safety: If user refreshes on #dashboard, activeSeminar is lost. Redirect back.
        navigate('seminars');
    }
  }, [view, activeSeminar]);

  const refreshAssignments = () => {
    if (!activeSeminar) return;
    api.request(`/assignments?seminar_id=${activeSeminar.id}`)
       .then(r => r.ok ? setAssignments(r.data) : setAssignments([]));
  }

  const fetchSubmissions = async (aid) => {
    const res = await api.request(`/assignment/${aid}/submissions`);
    if(res.ok) {
        setSubmissionsList(res.data);
        navigate('submissions');
    }
  };

  const handleLogin = (userObj) => { 
      setUser(userObj); 
      navigate('seminars'); 
  };
  
  const handleLogout = () => { 
      api.clearSession(); 
      setUser(null); 
      navigate('login'); 
  };

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  
  // Auth Views
  if (!user) {
    if (view === 'register') return <Register onLogin={handleLogin} onSwitch={() => navigate('login')} />;
    return <Login onLogin={handleLogin} onSwitch={() => navigate('register')} />;
  }

  // Main App View
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <nav className="bg-slate-900 text-white p-4 shadow mb-6 flex justify-between">
        <div className="flex items-center gap-4">
            {/* Global Back Button - Shows unless on the main list */}
            {view !== 'seminars' && (
                <button 
                    onClick={goBack} 
                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors"
                    title="Go Back"
                >
                    <ArrowLeft size={20} />
                </button>
            )}
            
            <div className="font-bold text-xl flex gap-2 items-center cursor-pointer" onClick={()=>navigate('seminars')}>
            <Code/> StructogramAI
            </div>
        </div>

        <div className="flex gap-4 items-center">
            {user.role === 'admin' && <button onClick={() => navigate('admin')}>Admin</button>}
            <button onClick={() => navigate('help')}><HelpCircle size={20}/></button>
            <span>{user.username} ({user.role})</span>
            <button onClick={handleLogout}><LogOut size={18}/></button>
        </div>
      </nav>
      
      {/* View Router - Passing 'navigate' as 'setView' for compatibility */}
      {view === 'seminars' && (
        <SeminarList 
          setActiveSeminar={setActiveSeminar} 
          setView={navigate} 
          user={user} 
        />
      )}
      
      {view === 'dashboard' && activeSeminar && (
        <AssignmentDashboard 
          activeSeminar={activeSeminar} 
          setView={navigate} 
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
          setView={navigate} 
          refreshAssignments={refreshAssignments} 
        />
      )}

      {view === 'submissions' && (
        <SubmissionList 
          submissionsList={submissionsList} 
          setView={navigate} 
          setGradingResult={setGradingResult}
          currentAssignment={currentAssignment}
        />
      )}

      {view === 'submit' && (
        <StudentSubmission 
          currentAssignment={currentAssignment} 
          setView={navigate} 
          setGradingResult={setGradingResult}
        />
      )}

      {view === 'grading' && (
        <GradingResult 
          gradingResult={gradingResult} 
          setView={navigate} 
        />
      )}

      <ChatWidget /> 
    </div>
  );
}