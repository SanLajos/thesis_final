import React, { useState, useEffect } from 'react';
import { Code, HelpCircle, LogOut, ArrowLeft } from 'lucide-react';
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
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) setView(hash);
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (newView) => {
    window.location.hash = newView;
    setView(newView); 
  };

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

  // Fetch assignments logic
  useEffect(() => {
    if (view === 'dashboard' && activeSeminar) {
        refreshAssignments();
    } else if (view === 'dashboard' && !activeSeminar) {
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

  const handleLogin = (userObj) => { setUser(userObj); navigate('seminars'); };
  const handleLogout = () => { api.clearSession(); setUser(null); navigate('login'); };

  if (loading) return <div className="h-screen flex items-center justify-center text-[#1B3147]">Loading...</div>;
  
  // Auth Views
  if (!user) {
    if (view === 'register') return <Register onLogin={handleLogin} onSwitch={() => navigate('login')} />;
    return <Login onLogin={handleLogin} onSwitch={() => navigate('register')} />;
  }

  // --- MAIN APP VIEW ---
  return (
    // Global Background: Eye-Friendly Off-White
    <div className="min-h-screen bg-[#F5F7FA] pb-20">
      
      {/* Navbar: Biscay Background */}
      <nav className="bg-[#1B3147] text-white p-4 shadow-md mb-6 flex justify-between transition-colors">
        <div className="flex items-center gap-4">
            {view !== 'seminars' && (
                <button 
                    onClick={goBack} 
                    // Back Button: Slightly Lighter Biscay for contrast
                    className="p-2 bg-[#243b55] hover:bg-[#2c4a6b] rounded-full transition-colors"
                    title="Go Back"
                >
                    <ArrowLeft size={20} />
                </button>
            )}
            
            {/* Logo: StructogrAIm with Turquoise Icon */}
            <div className="font-bold text-xl flex gap-2 items-center cursor-pointer" onClick={()=>navigate('seminars')}>
                <Code className="text-[#40E0D0]" /> <span>StructogrAIm</span>
            </div>
        </div>

        <div className="flex gap-4 items-center">
            {user.role === 'admin' && <button className="hover:text-[#40E0D0]" onClick={() => navigate('admin')}>Admin</button>}
            <button className="hover:text-[#40E0D0]" onClick={() => navigate('help')}><HelpCircle size={20}/></button>
            <span className="opacity-90">{user.username} ({user.role})</span>
            <button className="hover:text-[#40E0D0]" onClick={handleLogout}><LogOut size={18}/></button>
        </div>
      </nav>
      
      {/* View Router */}
      {view === 'seminars' && <SeminarList setActiveSeminar={setActiveSeminar} setView={navigate} user={user} />}
      {view === 'dashboard' && activeSeminar && (
        <AssignmentDashboard 
          activeSeminar={activeSeminar} setView={navigate} user={user} 
          assignments={assignments} setAssignments={setAssignments}
          setCurrentAssignment={setCurrentAssignment} fetchSubmissions={fetchSubmissions}
        />
      )}
      {view === 'create' && <AssignmentCreate activeSeminar={activeSeminar} setView={navigate} refreshAssignments={refreshAssignments} />}
      {view === 'submissions' && <SubmissionList submissionsList={submissionsList} setView={navigate} setGradingResult={setGradingResult} currentAssignment={currentAssignment} />}
      {view === 'submit' && <StudentSubmission currentAssignment={currentAssignment} setView={navigate} setGradingResult={setGradingResult} />}
      {view === 'grading' && <GradingResult gradingResult={gradingResult} setView={navigate} />}

      <ChatWidget /> 
    </div>
  );
}