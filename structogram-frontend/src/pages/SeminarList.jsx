import React, { useState, useEffect } from 'react';
import { api } from '../services/ApiService';

export const SeminarList = ({ setActiveSeminar, setView, user }) => {
  const [seminars, setSeminars] = useState([]);
  const [joinCode, setJoinCode] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newSem, setNewSem] = useState({title:'', invite_code:''});

  useEffect(() => { 
    api.request('/seminars').then(res => { if(res.ok) setSeminars(res.data); }); 
  }, []);

  const join = async () => { 
    if(!joinCode) return; 
    const res = await api.request('/seminar/join', 'POST', {invite_code: joinCode}); 
    if(res.ok){ 
      const listRes = await api.request('/seminars');
      if(listRes.ok) setSeminars(listRes.data); 
      setJoinCode(''); 
    } else alert("Failed to join"); 
  };

  const create = async () => { 
    const res = await api.request('/seminar', 'POST', newSem); 
    if(res.ok){ 
      const listRes = await api.request('/seminars');
      if(listRes.ok) setSeminars(listRes.data); 
      setShowCreate(false); 
    } else alert(res.data.error || "Failed"); 
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pt-6">
      <div className="flex justify-between items-end border-b pb-4">
        <h2 className="text-2xl font-bold">My Seminars</h2>
        <div className="flex gap-2">
          <input value={joinCode} onChange={e=>setJoinCode(e.target.value)} placeholder="Invite Code" className="border p-2 rounded"/>
          <button onClick={join} className="bg-blue-600 text-white px-4 rounded">Join</button>
          {user.role === 'teacher' && <button onClick={()=>setShowCreate(!showCreate)} className="bg-green-600 text-white px-4 rounded">Create</button>}
        </div>
      </div>
      {showCreate && (
        <div className="bg-green-50 p-4 rounded border flex gap-2">
          <input placeholder="Title" onChange={e=>setNewSem({...newSem, title:e.target.value})} className="p-2 rounded flex-1"/>
          <input placeholder="Code" onChange={e=>setNewSem({...newSem, invite_code:e.target.value})} className="p-2 rounded"/>
          <button onClick={create} className="bg-green-600 text-white px-4 rounded">Save</button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {seminars.map(s => (
          <div key={s.id} onClick={()=>{setActiveSeminar(s); setView('dashboard')}} className="bg-white p-6 rounded shadow cursor-pointer hover:shadow-md transition-shadow">
            <h3 className="font-bold text-lg">{s.title}</h3>
            <p className="text-gray-500 text-sm">Code: {s.invite_code}</p>
            {s.creator_name && <p className="text-xs text-gray-400 mt-2">By {s.creator_name}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};