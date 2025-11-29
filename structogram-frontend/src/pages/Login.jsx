import React, { useState } from 'react';
import { api } from '../services/ApiService';
import { DebugStatus } from '../components/CommonUI';

export const Login = ({ onLogin, onSwitch }) => {
  const [formData, setFormData] = useState({ identifier: '', password: '' }); 
  const [error, setError] = useState(''); 
  const [status, setStatus] = useState('');
  
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
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">Sign In</h1>
        <DebugStatus status={status} error={error} />
        <form onSubmit={handleSubmit} className="space-y-4">
          <input className="w-full p-2 border rounded" placeholder="Username or Email" value={formData.identifier} onChange={e=>setFormData({...formData, identifier:e.target.value})}/>
          <input className="w-full p-2 border rounded" placeholder="Password" type="password" value={formData.password} onChange={e=>setFormData({...formData, password:e.target.value})}/>
          <button className="w-full bg-blue-600 text-white p-2 rounded">Sign In</button>
        </form>
        <button onClick={onSwitch} className="text-blue-600 text-sm mt-4">Register instead</button>
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
            if (res.ok) { 
                setStatus('Success!'); 
                onLogin(res.data.user); 
            } else { 
                setStatus(''); 
                // Format pydantic validation errors nicely if possible
                const errorMsg = res.data.details ? JSON.stringify(res.data.details) : (res.data.error || "Registration failed");
                setError(errorMsg); 
            }
        } catch (err) { setStatus(''); setError(`Network Error: ${err.message}`); }
    };
    
    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md space-y-4">
            <h1 className="text-2xl font-bold">Register</h1>
            <DebugStatus status={status} error={error} />
            <input className="w-full p-2 border rounded" placeholder="Username" onChange={e=>setFormData({...formData, username:e.target.value})}/>
            <input className="w-full p-2 border rounded" placeholder="Email" onChange={e=>setFormData({...formData, email:e.target.value})}/>
            <input className="w-full p-2 border rounded" type="password" placeholder="Password" onChange={e=>setFormData({...formData, password:e.target.value})}/>
            <select className="w-full p-2 border rounded" onChange={e=>setFormData({...formData, role:e.target.value})}>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
            <button className="w-full bg-green-600 text-white p-2 rounded" onClick={handleSubmit}>Register</button>
            <button onClick={onSwitch} className="text-blue-600 text-sm">Login instead</button>
          </div>
        </div>
    );
};