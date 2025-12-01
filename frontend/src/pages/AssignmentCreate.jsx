import React, { useState } from 'react';
import { api } from '../services/ApiService';

export const AssignmentCreate = ({ activeSeminar, setView, refreshAssignments }) => {
  const [formData, setFormData] = useState({
    title: '', 
    description: '', 
    grading_prompt: '', // This state already existed, just lacked an input
    language: 'python', 
    grading_type: 'ai',
    plagiarism_check_enabled: false, 
    static_analysis_enabled: false
  });
  const [file, setFile] = useState(null);
  const [testCases, setTestCases] = useState([{input: '', output: ''}]);

  const updateField = (field, val) => setFormData(prev => ({...prev, [field]: val}));
  const addTestCase = () => setTestCases([...testCases, {input: '', output: ''}]);
  const updateTestCase = (idx, field, val) => { 
    const newTC = [...testCases]; newTC[idx][field] = val; setTestCases(newTC); 
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !file) {
        alert("Please fill in title and upload a template file");
        return;
    }

    const payload = new FormData();
    payload.append('seminar_id', activeSeminar.id);
    Object.keys(formData).forEach(key => payload.append(key, formData[key]));
    payload.append('template_code', file);
    payload.append('test_cases', JSON.stringify(testCases.filter(tc => tc.input && tc.output)));

    const res = await api.request('/assignment', 'POST', payload, true);
    if (res.ok) { 
      alert("Assignment created successfully!");
      refreshAssignments(); 
      setView('dashboard'); 
    } else {
      alert(res.data.error || "Failed to create assignment");
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">New Assignment</h2>
        <button onClick={() => setView('dashboard')} className="text-slate-500 hover:text-black">Cancel</button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            placeholder="Title" 
            className="w-full p-2 border rounded focus:border-blue-500 outline-none" 
            onChange={e=>updateField('title', e.target.value)}
          />
          
          <textarea 
            placeholder="Description (Visible to students)" 
            className="w-full p-2 border rounded min-h-[100px] focus:border-blue-500 outline-none" 
            onChange={e=>updateField('description', e.target.value)}
          />

          {/* --- ADDED: AI INSTRUCTIONS FIELD --- */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
                AI Grading Instructions <span className="text-red-500 font-normal">(Hidden from Students)</span>
            </label>
            <textarea 
                placeholder="Give direct commands to the AI. E.g., 'Be strict about variable naming', 'Ensure they use a while loop', 'Deduct 10 points if they import math'."
                className="w-full p-2 border border-slate-300 bg-yellow-50 rounded min-h-[80px] focus:border-yellow-500 outline-none text-sm" 
                value={formData.grading_prompt}
                onChange={e=>updateField('grading_prompt', e.target.value)}
            />
          </div>
          {/* ------------------------------------ */}

          <div className="flex gap-4">
            <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 mb-1">Language</label>
                <select className="w-full p-2 border rounded" onChange={e=>updateField('language', e.target.value)}>
                    <option value="python">Python</option>
                    <option value="cpp">C++</option>
                    <option value="java">Java</option>
                </select>
            </div>
            <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 mb-1">Grading Mode</label>
                <select className="w-full p-2 border rounded" onChange={e=>updateField('grading_type', e.target.value)}>
                    <option value="ai">AI Analysis (Recommended)</option>
                    <option value="keyword">Keyword Match Only</option>
                </select>
            </div>
          </div>

          <div className="flex gap-4 p-4 border rounded bg-slate-50">
            <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" onChange={e=>updateField('plagiarism_check_enabled', e.target.checked)}/> 
                <span>Enable Plagiarism Check</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" onChange={e=>updateField('static_analysis_enabled', e.target.checked)}/> 
                <span>Enable Static Analysis</span>
            </label>
          </div>

          <div className="border p-4 rounded">
            <label className="block text-sm font-bold mb-2">Reference/Template Code</label>
            <input type="file" className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" onChange={e=>setFile(e.target.files[0])}/>
          </div>

          <div className="border p-4 rounded bg-slate-50">
            <h3 className="font-bold mb-2">Auto-Execution Test Cases</h3>
            {testCases.map((tc, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input placeholder="Input (stdin)" value={tc.input} onChange={e=>updateTestCase(i, 'input', e.target.value)} className="border p-1 rounded flex-1"/>
                <input placeholder="Expected Output (stdout)" value={tc.output} onChange={e=>updateTestCase(i, 'output', e.target.value)} className="border p-1 rounded flex-1"/>
              </div>
            ))}
            <button type="button" onClick={addTestCase} className="text-sm text-blue-600 hover:underline">+ Add Case</button>
          </div>

          <button className="w-full bg-blue-600 text-white p-3 rounded font-bold hover:bg-blue-700 transition-colors">Create Assignment</button>
      </form>
    </div>
  );
};