import React, { useState } from 'react';
import { api } from '../services/ApiService';
import { RefreshCw } from 'lucide-react';

export const StudentSubmission = ({ currentAssignment, setView, setGradingResult }) => {
  const [mode, setMode] = useState('xml');
  const [xmlType, setXmlType] = useState('flowchart');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    const formData = new FormData(); 
    formData.append('diagram_file', file); 
    formData.append('submission_mode', mode);
    if (mode === 'image') formData.append('description', description); 
    if (mode === 'xml') formData.append('diagram_type', xmlType);
    
    try {
      const res = await api.request(`/submit/${currentAssignment.id}`, 'POST', formData, true);
      if (!res.ok) { 
        alert("Failed:\n" + (res.data.error || "Unknown")); 
      } else { 
        const data = res.data;
        setGradingResult({
            ...data,
            method_used: mode,
            is_correct: data.grading_result?.is_correct,
            logic_errors: data.grading_result?.logic_errors
        });
        setView('grading'); 
      }
    } catch (err) { alert("Failed."); } 
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-lg border border-slate-200 mt-10">
        <button onClick={() => setView('dashboard')} className="text-slate-500 mb-4">&larr; Back</button>
        <h2 className="text-2xl font-bold mb-2">Submit: {currentAssignment.title}</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex gap-4 p-1 bg-slate-100 rounded-lg w-fit">
              <button type="button" onClick={() => setMode('xml')} className={`px-4 py-2 rounded ${mode === 'xml' ? 'bg-white shadow text-blue-600' : ''}`}>XML File</button>
              <button type="button" onClick={() => setMode('image')} className={`px-4 py-2 rounded ${mode === 'image' ? 'bg-white shadow text-purple-600' : ''}`}>Image</button>
            </div>
            {mode === 'xml' && (
              <div className="flex gap-4">
                <label><input type="radio" checked={xmlType === 'flowchart'} onChange={() => setXmlType('flowchart')} /> Flowchart (.xml)</label>
                <label><input type="radio" checked={xmlType === 'nassi_shneiderman'} onChange={() => setXmlType('nassi_shneiderman')} /> Nassi-Shneiderman (.xml)</label>
              </div>
            )}
            {mode === 'image' && <textarea className="w-full p-2 border rounded" placeholder="Describe logic..." value={description} onChange={e => setDescription(e.target.value)} />}
            <div className="border-2 border-dashed border-slate-300 p-8 text-center rounded"><input required type="file" onChange={e => setFile(e.target.files[0])} /></div>
            <button disabled={loading} className="w-full py-3 bg-blue-600 text-white rounded font-bold">{loading ? <RefreshCw className="animate-spin inline" /> : "Submit & Grade"}</button>
        </form>
    </div>
  );
};