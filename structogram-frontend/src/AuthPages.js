import React, { useState } from 'react';
import { Code } from 'lucide-react';
import { API_BASE, formatValidationError } from './utils';
import { DebugStatus } from './components';

export const LoginPage = ({ onLogin, onSwitch }) => {
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
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 flex items-center gap-2"><Code className="text-blue-600"/> Structogram AI</h1>
        <DebugStatus status={status} error={error} />
        <form onSubmit={handleSubmit} className="space-y-4">
            <input className="w-full p-2 border rounded" placeholder="Username or Email" value={formData.identifier} onChange={e=>setFormData({...formData, identifier:e.target.value})}/>
            <input className="w-full p-2 border rounded" placeholder="Password" type="password" value={formData.password} onChange={e=>setFormData({...formData, password:e.target.value})}/>
            <button className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-bold">Sign In</button>
        </form>
        <button onClick={onSwitch} className="text-blue-600 text-sm mt-4 hover:underline">Register instead</button>
      </div>
    </div>
  );
};

export const RegisterPage = ({ onLogin, onSwitch }) => {
    const [formData, setFormData] = useState({ email: '', password: '', username: '', role: 'student' });
    const [error, setError] = useState(''); const [status, setStatus] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault(); setStatus('Registering...'); setError('');
        try {
            const res = await fetch(`${API_BASE}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
            const data = await res.json();
            if (res.ok) { setStatus('Success!'); onLogin(data); } else { setStatus(''); setError(data.details ? formatValidationError(data) : (data.error || "Registration failed")); }
        } catch (err) { setStatus(''); setError(`Network Error: ${err.message}`); }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md space-y-4">
                <h1 className="text-2xl font-bold mb-4">Create Account</h1>
                <DebugStatus status={status} error={error} />
                <input className="w-full p-2 border rounded" placeholder="Username" onChange={e=>setFormData({...formData, username:e.target.value})}/>
                <input className="w-full p-2 border rounded" placeholder="Email" onChange={e=>setFormData({...formData, email:e.target.value})}/>
                <input className="w-full p-2 border rounded" type="password" placeholder="Password" onChange={e=>setFormData({...formData, password:e.target.value})}/>
                <select className="w-full p-2 border rounded bg-white" onChange={e=>setFormData({...formData, role:e.target.value})}><option value="student">Student</option><option value="teacher">Teacher</option><option value="admin">Admin</option></select>
                <button className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700 font-bold">Register</button>
                <button type="button" onClick={onSwitch} className="text-blue-600 text-sm mt-4 hover:underline">Login instead</button>
            </form>
        </div>
    );
};