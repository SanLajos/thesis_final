import React, { useState, useEffect } from 'react';
import { api } from '../services/ApiService';
import { useToast } from '../context/ToastContext';

export const SeminarList = ({ setActiveSeminar, setView, user }) => {
  const { addToast } = useToast();
  
  const [seminars, setSeminars] = useState([]);
  const [joinCode, setJoinCode] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newSem, setNewSem] = useState({title:'', invite_code:''});

  useEffect(() => { 
    // ADDED: Error handling for initial fetch
    const fetchSeminars = async () => {
        try {
            const res = await api.request('/seminars'); 
            if(res.ok) setSeminars(res.data);
            else addToast("Could not load seminars", "error");
        } catch (e) {
            addToast("Network Error: Is the backend running?", "error");
        }
    };
    fetchSeminars();
  }, []); // Empty dependency array ok

  const join = async () => { 
    if(!joinCode) return; 
    try {
        const res = await api.request('/seminar/join', 'POST', {invite_code: joinCode}); 
        if(res.ok){ 
          addToast("Successfully joined seminar!", "success");
          // Refresh list
          const listRes = await api.request('/seminars');
          if(listRes.ok) setSeminars(listRes.data); 
          setJoinCode(''); 
        } else {
          addToast(res.data.error || "Failed to join seminar.", "error"); 
        }
    } catch (e) {
        addToast("Network Error during join", "error");
    }
  };

  const create = async () => { 
    if (!newSem.title || !newSem.invite_code) {
        addToast("Please fill in both Title and Invite Code", "info");
        return;
    }
    try {
        const res = await api.request('/seminar', 'POST', newSem); 
        if(res.ok){ 
          addToast("Seminar created successfully!", "success");
          const listRes = await api.request('/seminars');
          if(listRes.ok) setSeminars(listRes.data); 
          setShowCreate(false); 
          setNewSem({title:'', invite_code:''}); 
        } else {
          addToast(res.data.error || "Failed to create seminar", "error"); 
        }
    } catch (e) {
        addToast("Network Error during creation", "error");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pt-6">
      <div className="flex justify-between items-end border-b pb-4">
        <h2 className="text-2xl font-bold">My Seminars</h2>
        <div className="flex gap-2">
          <input value={joinCode} onChange={e=>setJoinCode(e.target.value)} placeholder="Invite Code" className="border p-2 rounded outline-none focus:border-[#40E0D0]"/>
          <button onClick={join} className="bg-[#1B3147] hover:bg-[#243b55] text-white px-4 rounded transition-colors">Join</button>
          {user.role === 'teacher' && <button onClick={()=>setShowCreate(!showCreate)} className="bg-green-600 hover:bg-green-700 text-white px-4 rounded transition-colors">Create</button>}
        </div>
      </div>
      
      {showCreate && (
        <div className="bg-green-50 p-4 rounded border border-green-200 flex gap-2 animate-in slide-in-from-top-2 fade-in">
          <input placeholder="Title" value={newSem.title} onChange={e=>setNewSem({...newSem, title:e.target.value})} className="p-2 rounded flex-1 border border-green-200 outline-none"/>
          <input placeholder="Code" value={newSem.invite_code} onChange={e=>setNewSem({...newSem, invite_code:e.target.value})} className="p-2 rounded border border-green-200 outline-none"/>
          <button onClick={create} className="bg-green-600 text-white px-4 rounded hover:bg-green-700">Save</button>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {seminars.map(s => (
          <div key={s.id} onClick={()=>{setActiveSeminar(s); setView('dashboard')}} className="bg-white p-6 rounded shadow cursor-pointer hover:shadow-md transition-shadow border border-slate-100 hover:border-[#40E0D0]">
            <h3 className="font-bold text-lg text-[#1B3147]">{s.title}</h3>
            <p className="text-gray-500 text-sm">Code: {s.invite_code}</p>
            {s.creator_name && <p className="text-xs text-gray-400 mt-2">By {s.creator_name}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};