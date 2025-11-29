import React, { useState, useEffect } from 'react';
import { Code, HelpCircle, LogOut } from 'lucide-react';
import { api } from './services/ApiService';

// Import Components
import ChatWidget from './components/ChatWidget';
import { DebugStatus } from './components/CommonUI';

// Note: For a full refactor, these pages would also be in separate files like src/pages/Login.jsx
// I am keeping them inline here only for brevity in this response, but they use the new API Service.

const LoginPage = ({ onLogin, onSwitch }) => {
  const [formData, setFormData] = useState({ identifier: '', password: '' }); 
  const [error, setError] = useState(''); const [status, setStatus] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault(); setStatus('Logging in...'); setError('');
    try {
      // OOP usage: api.login() handles the fetch and token storage
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

// ... RegisterPage would look similar, calling api.register() ...

// --- ROOT APP ---
export default function App() {
  const [user, setUser] = useState(null); 
  const [view, setView] = useState('login'); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
        // OOP Usage: Check if we have a valid session
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

  const handleLogin = (userObj) => {
      setUser(userObj);
      setView('seminars');
  };

  const handleLogout = () => { 
      api.clearSession(); 
      setUser(null); 
      setView('login'); 
  };

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  
  // View Router Logic
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
      
      {/* Main Content Area - Components would be imported and used here */}
      {view === 'seminars' && <div className="text-center p-10">Seminar List Component Placeholder</div>}
      
      <ChatWidget /> 
    </div>
  );
}

// Placeholder for RegisterPage to make code compilable
const RegisterPage = ({onLogin, onSwitch}) => (<div>Register Placeholder <button onClick={onSwitch}>Login</button></div>);