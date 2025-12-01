import React, { useState, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';
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
import { AdminDashboard } from './pages/AdminDashboard';
import { Help } from './pages/Help';
import { StudentHistory } from './pages/StudentHistory';
import { SeminarAnalytics } from './pages/SeminarAnalytics'; // <--- NEW IMPORT

// Main Wrapper for Router Context
export default function App() {
  return (
    <BrowserRouter>
      <StructogramApp />
    </BrowserRouter>
  );
}

function StructogramApp() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // App-wide state
  const [activeSeminar, setActiveSeminar] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [currentAssignment, setCurrentAssignment] = useState(null);
  const [submissionsList, setSubmissionsList] = useState([]);
  const [gradingResult, setGradingResult] = useState(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    const checkSession = async () => {
      if (api.token) {
        const res = await api.getMe();
        if (res.ok) {
          setUser(res.data.user);
          if (['/', '/login', '/register'].includes(location.pathname)) {
            navigate('/seminars');
          }
        } else {
          api.clearSession();
          setUser(null);
          navigate('/login');
        }
      } else {
        if (!['/login', '/register'].includes(location.pathname)) {
          navigate('/login');
        }
      }
      setLoading(false);
    };

    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch assignments when going to dashboard with an active seminar
  useEffect(() => {
    if (location.pathname === '/dashboard' && activeSeminar) {
      refreshAssignments();
    }
  }, [location.pathname, activeSeminar]);

  const refreshAssignments = () => {
    if (!activeSeminar) return;
    api
      .request(`/assignments?seminar_id=${activeSeminar.id}`)
      .then((r) => (r.ok ? setAssignments(r.data) : setAssignments([])));
  };

  const fetchSubmissions = async (aid) => {
    const res = await api.request(`/assignment/${aid}/submissions`);
    if (res.ok) {
      setSubmissionsList(res.data);
      navigate('/submissions');
    } else {
      console.error('Failed to fetch submissions', res);
      alert('Failed to fetch submissions.');
    }
  };

  const handleLogin = (userObj) => {
    setUser(userObj);
    navigate('/seminars');
  };

  const handleLogout = () => {
    api.clearSession();
    setUser(null);
    navigate('/login');
  };

  // --- COMPATIBILITY ADAPTER ---
  const compatibilitySetView = (viewName) => {
    const routes = {
      login: '/login',
      register: '/register',
      seminars: '/seminars',
      dashboard: '/dashboard',
      create: '/create',
      submissions: '/submissions',
      submit: '/submit',
      grading: '/grading',
      admin: '/admin',
      help: '/help',
      history: '/history',
      analytics: '/analytics', // <--- NEW ROUTE MAPPING
    };
    navigate(routes[viewName] || '/seminars');
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-[#1B3147]">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] pb-20">
      {user && (
        <nav className="bg-[#1B3147] text-white p-4 shadow-md mb-6 flex justify-between transition-colors">
          <div className="flex items-center gap-4">
            {location.pathname !== '/seminars' && (
              <button
                onClick={() => navigate(-1)}
                className="p-2 bg-[#243b55] hover:bg-[#2c4a6b] rounded-full transition-colors"
                title="Go Back"
              >
                <ArrowLeft size={20} />
              </button>
            )}

            <div
              className="font-bold text-xl flex gap-2 items-center cursor-pointer"
              onClick={() => navigate('/seminars')}
            >
              <Code className="text-[#40E0D0]" /> <span>StructogrAIm</span>
            </div>
          </div>

          <div className="flex gap-4 items-center">
            {user?.role === 'admin' && (
              <button
                className="hover:text-[#40E0D0]"
                onClick={() => navigate('/admin')}
              >
                Admin
              </button>
            )}
            <button
              className="hover:text-[#40E0D0]"
              onClick={() => navigate('/help')}
            >
              <HelpCircle size={20} />
            </button>
            <span className="opacity-90">
              {user?.username} ({user?.role})
            </span>
            <button
              className="hover:text-[#40E0D0]"
              onClick={handleLogout}
            >
              <LogOut size={18} />
            </button>
          </div>
        </nav>
      )}

      {/* --- ROUTES --- */}
      <Routes>
        <Route
          path="/login"
          element={
            <Login
              onLogin={handleLogin}
              onSwitch={() => navigate('/register')}
            />
          }
        />
        <Route
          path="/register"
          element={
            <Register
              onLogin={handleLogin}
              onSwitch={() => navigate('/login')}
            />
          }
        />

        <Route
          path="/seminars"
          element={
            user ? (
              <SeminarList
                setActiveSeminar={setActiveSeminar}
                setView={compatibilitySetView}
                user={user}
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/admin"
          element={
            user && user.role === 'admin' ? (
              <AdminDashboard setView={compatibilitySetView} />
            ) : (
              <Navigate to="/seminars" />
            )
          }
        />

        <Route
          path="/help"
          element={
            user ? (
              <Help setView={compatibilitySetView} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/dashboard"
          element={
            user && activeSeminar ? (
              <AssignmentDashboard
                activeSeminar={activeSeminar}
                setView={compatibilitySetView}
                user={user}
                assignments={assignments}
                setAssignments={setAssignments}
                setCurrentAssignment={setCurrentAssignment}
                fetchSubmissions={fetchSubmissions}
              />
            ) : (
              <Navigate to="/seminars" />
            )
          }
        />

        <Route
          path="/create"
          element={
            user ? (
              <AssignmentCreate
                activeSeminar={activeSeminar}
                setView={compatibilitySetView}
                refreshAssignments={refreshAssignments}
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/submissions"
          element={
            user && currentAssignment ? (
              <SubmissionList
                submissionsList={submissionsList}
                setView={compatibilitySetView}
                setGradingResult={setGradingResult}
                currentAssignment={currentAssignment}
              />
            ) : (
              <Navigate to="/dashboard" />
            )
          }
        />

        <Route
          path="/submit"
          element={
            user && currentAssignment ? (
              <StudentSubmission
                currentAssignment={currentAssignment}
                setView={compatibilitySetView}
                setGradingResult={setGradingResult}
              />
            ) : (
              <Navigate to="/dashboard" />
            )
          }
        />

        <Route
          path="/grading"
          element={
            user && gradingResult ? (
              <GradingResult
                gradingResult={gradingResult}
                setView={compatibilitySetView}
              />
            ) : (
              <Navigate to="/dashboard" />
            )
          }
        />

        <Route
          path="/history"
          element={
            user && currentAssignment ? (
              <StudentHistory
                currentAssignment={currentAssignment}
                setView={compatibilitySetView}
                setGradingResult={setGradingResult}
                user={user}
              />
            ) : (
              <Navigate to="/dashboard" />
            )
          }
        />

        {/* --- NEW ROUTE FOR SEMINAR ANALYTICS --- */}
        <Route
          path="/analytics"
          element={
            user && activeSeminar ? (
              <SeminarAnalytics
                activeSeminar={activeSeminar}
                setView={compatibilitySetView}
              />
            ) : (
              <Navigate to="/dashboard" />
            )
          }
        />

        <Route
          path="*"
          element={<Navigate to={user ? '/seminars' : '/login'} />}
        />
      </Routes>

      {user && <ChatWidget />}
    </div>
  );
}