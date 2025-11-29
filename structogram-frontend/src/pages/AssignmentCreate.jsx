import React, { useState } from 'react';
import { api } from '../services/ApiService';

export const AssignmentCreate = ({ activeSeminar, setView, refreshAssignments }) => {
  const [formData, setFormData] = useState({
    title: '', description: '', grading_prompt: '', 
    language: 'python', grading_type: 'ai',
    plagiarism_check_enabled: false, static_analysis_enabled: false
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
    const payload = new FormData();
    payload.append('seminar_id', activeSeminar.id);
    Object.keys(formData).forEach(key => payload.append(key, formData[key]));
    payload.append('template_code', file);
    payload.append('test_cases', JSON.stringify(testCases.filter(tc => tc.input && tc.output)));

    const res = await api.request('/assignment', 'POST', payload, true);
    if (res.ok) { 
      refreshAssignments(); 
      setView('dashboard'); 
    } else alert("Failed: " + (res.data.error || "Unknown"));
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded shadow">
      <h2 className="text-2xl font-bold mb-4">New Assignment for {activeSeminar.title}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
          <input placeholder="Title" className="w-full p-2 border rounded" onChange={e=>updateField('title', e.target.value)}/>
          <textarea placeholder="Description" className="w-full p-2 border rounded" onChange={e=>updateField('description', e.target.value)}/>
          <div className="flex gap-4">
            <select className="p-2 border rounded" onChange={e=>updateField('language', e.target.value)}>
              <option value="python">Python</option><option value="cpp">C++</option><option value="java">Java</option>
            </select>
            <select className="p-2 border rounded" onChange={e=>updateField('grading_type', e.target.value)}>
              <option value="ai">AI Grading</option><option value="keyword">Keyword Match</option>
            </select>
          </div>
          <div className="flex gap-4">
            <label><input type="checkbox" onChange={e=>updateField('plagiarism_check_enabled', e.target.checked)}/> Plagiarism Check</label>
            <label><input type="checkbox" onChange={e=>updateField('static_analysis_enabled', e.target.checked)}/> Static Analysis</label>
          </div>
          <div className="border p-2 rounded">
            <label className="block text-sm font-bold mb-1">Template Code File</label>
            <input type="file" onChange={e=>setFile(e.target.files[0])}/>
          </div>
          <div className="border p-4 rounded bg-slate-50">
            <h3 className="font-bold mb-2">Auto-Execution Test Cases</h3>
            {testCases.map((tc, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input placeholder="Input (stdin)" value={tc.input} onChange={e=>updateTestCase(i, 'input', e.target.value)} className="border p-1 rounded flex-1"/>
                <input placeholder="Expected Output (stdout)" value={tc.output} onChange={e=>updateTestCase(i, 'output', e.target.value)} className="border p-1 rounded flex-1"/>
              </div>
            ))}
            <button type="button" onClick={addTestCase} className="text-sm text-blue-600">+ Add Case</button>
          </div>
          <button className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">Create Assignment</button>
      </form>
    </div>
  );
};