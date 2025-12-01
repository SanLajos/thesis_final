import React from 'react';
import { api } from '../services/ApiService';
import { Plus, Trash2, Eye, History } from 'lucide-react'; // Added History icon
import { LanguageBadge } from '../components/CommonUI';

export const AssignmentDashboard = ({ activeSeminar, setView, user, assignments, setAssignments, setCurrentAssignment, fetchSubmissions }) => {
  const handleDelete = async (id) => { 
    if(window.confirm("Delete?")) { 
      await api.request(`/assignment/${id}`, 'DELETE'); 
      setAssignments(assignments.filter(a => a.id !== id)); 
    } 
  };

  return (
      <div className="max-w-6xl mx-auto space-y-6 pt-6">
          <div className="flex justify-between items-center">
            <button onClick={()=>setView('seminars')} className="text-gray-500 hover:text-black">&larr; Back</button>
            <h2 className="text-2xl font-bold">{activeSeminar.title}</h2>
            {user.role === 'teacher' && <button onClick={()=>setView('create')} className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2"><Plus size={16}/> New Assignment</button>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignments.map(a => (
              <div key={a.id} className="bg-white p-6 rounded shadow border border-slate-100 hover:border-blue-200 transition-all">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-lg">{a.title}</h3>
                  <div className="flex gap-2">
                    {(user.role === 'teacher' || user.role === 'admin') && (
                      <>
                        <button onClick={()=>{setCurrentAssignment(a); fetchSubmissions(a.id)}} className="text-blue-500 hover:bg-blue-50 p-1 rounded"><Eye size={18}/></button>
                        <button onClick={()=>handleDelete(a.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={18}/></button>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 my-2 line-clamp-2">{a.description}</p>
                <div className="flex justify-between items-center mt-4">
                  <LanguageBadge lang={a.language} />
                  
                  {/* --- CHANGED SECTION FOR STUDENTS --- */}
                  {user.role === 'student' && (
                    <div className="flex gap-2">
                        <button 
                            onClick={()=>{setCurrentAssignment(a); setView('history')}} 
                            className="bg-white border border-slate-200 text-slate-600 px-3 py-1 rounded text-sm font-medium hover:bg-slate-50 flex items-center gap-1"
                        >
                            <History size={14}/> History
                        </button>
                        <button 
                            onClick={()=>{setCurrentAssignment(a); setView('submit')}} 
                            className="bg-blue-100 text-blue-600 px-4 py-1 rounded text-sm font-bold hover:bg-blue-200"
                        >
                            Start
                        </button>
                    </div>
                  )}
                  {/* ------------------------------------ */}

                </div>
              </div>
            ))}
          </div>
          {assignments.length === 0 && <div className="text-center text-gray-400 py-10">No assignments yet.</div>}
      </div>
  );
};