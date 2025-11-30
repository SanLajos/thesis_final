import React, { useState } from 'react';
import { api } from '../services/ApiService';
import { DebugStatus } from '../components/CommonUI';
import { Code } from 'lucide-react';

export const Login = ({ onLogin, onSwitch }) => {
  const [formData, setFormData] = useState({ identifier: '', password: '' }); 
  const [error, setError] = useState(''); 
  const [status, setStatus] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault(); setStatus('Logging in...'); setError('');
    try {
      const res = await api.login(formData.identifier, formData.password);
      if (res.ok) { setStatus('Success!'); onLogin(res.data.user); } 
      else { setStatus(''); setError(res.data.error || 'Login failed'); }
    } catch (err) { setStatus(''); setError(`Network Error: ${err.message}`); }
  };
  
  return (
    <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border-t-4 border-[#1B3147]">
        <div className="flex justify-center mb-6">
            <div className="p-3 bg-[#1B3147] rounded-full">
                <Code size={32} className="text-[#40E0D0]" />
            </div>
        </div>
        <h1 className="text-2xl font-bold mb-4 text-center text-[#1B3147]">StructogrAIm Login</h1>
        <DebugStatus status={status} error={error} />
        <form onSubmit={handleSubmit} className="space-y-4">
          <input className="w-full p-2 border border-slate-300 rounded focus:border-[#40E0D0] outline-none" placeholder="Username or Email" value={formData.identifier} onChange={e=>setFormData({...formData, identifier:e.target.value})}/>
          <input className="w-full p-2 border border-slate-300 rounded focus:border-[#40E0D0] outline-none" placeholder="Password" type="password" value={formData.password} onChange={e=>setFormData({...formData, password:e.target.value})}/>
          {/* Biscay Button */}
          <button className="w-full bg-[#1B3147] hover:bg-[#243b55] text-white p-2 rounded font-bold transition-colors">Sign In</button>
        </form>
        <div className="mt-4 text-center">
            <button onClick={onSwitch} className="text-[#1B3147] hover:text-[#40E0D0] text-sm font-semibold">Register instead</button>
        </div>
      </div>
    </div>
  );
};

export const Register = ({ onLogin, onSwitch }) => {
    const [formData, setFormData] = useState({ email: '', password: '', username: '', role: 'student' });
    const [error, setError] = useState(''); 
    const [status, setStatus] = useState('');
    
    const handleSubmit = async (e) => {
        e.preventDefault(); setStatus('Registering...'); setError('');
        try {
            const res = await api.register(formData);
            if (res.ok) { setStatus('Success!'); onLogin(res.data.user); } 
            else { setStatus(''); setError(res.data.details ? JSON.stringify(res.data.details) : (res.data.error || "Registration failed")); }
        } catch (err) { setStatus(''); setError(`Network Error: ${err.message}`); }
    };
    
    return (
        <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md space-y-4 border-t-4 border-[#1B3147]">
            <h1 className="text-2xl font-bold text-center text-[#1B3147]">Create Account</h1>
            <DebugStatus status={status} error={error} />
            <input className="w-full p-2 border border-slate-300 rounded focus:border-[#40E0D0] outline-none" placeholder="Username" onChange={e=>setFormData({...formData, username:e.target.value})}/>
            <input className="w-full p-2 border border-slate-300 rounded focus:border-[#40E0D0] outline-none" placeholder="Email" onChange={e=>setFormData({...formData, email:e.target.value})}/>
            <input className="w-full p-2 border border-slate-300 rounded focus:border-[#40E0D0] outline-none" type="password" placeholder="Password" onChange={e=>setFormData({...formData, password:e.target.value})}/>
            <select className="w-full p-2 border border-slate-300 rounded focus:border-[#40E0D0] outline-none" onChange={e=>setFormData({...formData, role:e.target.value})}>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
            <button className="w-full bg-[#1B3147] hover:bg-[#243b55] text-white p-2 rounded font-bold transition-colors" onClick={handleSubmit}>Register</button>
            <div className="text-center">
                <button onClick={onSwitch} className="text-[#1B3147] hover:text-[#40E0D0] text-sm font-semibold">Login instead</button>
            </div>
          </div>
        </div>
    );
};