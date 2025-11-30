import React, { useState, useCallback } from 'react';
import { api } from '../services/ApiService';
import { RefreshCw, UploadCloud, File, X } from 'lucide-react'; // Added icons
import { useToast } from '../context/ToastContext';
import { useDropzone } from 'react-dropzone'; // 1. Import Dropzone Hook

export const StudentSubmission = ({ currentAssignment, setView, setGradingResult }) => {
  const { addToast } = useToast();
  const [mode, setMode] = useState('xml');
  const [xmlType, setXmlType] = useState('flowchart');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  // 2. Dropzone Handler
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles?.length > 0) {
      setFile(acceptedFiles[0]);
      addToast("File selected!", "success");
    }
  }, [addToast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    multiple: false,
    accept: mode === 'image' 
      ? {'image/*': ['.png', '.jpg', '.jpeg', '.webp']} 
      : {'text/xml': ['.xml'], 'application/xml': ['.xml'], 'text/plain': ['.txt']}
  });

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    if(!file) {
        addToast("Please upload a file first.", "error");
        return;
    }
    setLoading(true);
    
    const formData = new FormData(); 
    formData.append('diagram_file', file); 
    formData.append('submission_mode', mode);
    if (mode === 'image') formData.append('description', description); 
    if (mode === 'xml') formData.append('diagram_type', xmlType);
    
    try {
      const res = await api.request(`/submit/${currentAssignment.id}`, 'POST', formData, true);
      if (!res.ok) { 
        addToast("Submission Failed: " + (res.data.error || "Unknown"), "error");
      } else { 
        addToast("Grading complete!", "success");
        const data = res.data;
        setGradingResult({
            ...data,
            method_used: mode,
            is_correct: data.grading_result?.is_correct,
            logic_errors: data.grading_result?.logic_errors
        });
        setView('grading'); 
      }
    } catch (err) { 
        addToast("Network Error: Could not submit.", "error"); 
    } finally { 
        setLoading(false); 
    }
  };

  const removeFile = (e) => {
      e.stopPropagation();
      setFile(null);
  }

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-lg border border-slate-200 mt-10">
        <button onClick={() => setView('dashboard')} className="text-slate-500 mb-4 hover:text-[#1B3147]">&larr; Back</button>
        <h2 className="text-2xl font-bold mb-2 text-[#1B3147]">Submit: {currentAssignment.title}</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Mode Selection */}
            <div className="flex gap-4 p-1 bg-[#F5F7FA] rounded-lg w-fit border border-slate-200">
              <button 
                type="button" 
                onClick={() => {setMode('xml'); setFile(null);}} 
                className={`px-4 py-2 rounded transition-all font-medium ${mode === 'xml' ? 'bg-white shadow text-[#1B3147]' : 'text-slate-500 hover:text-slate-700'}`}
              >
                XML File
              </button>
              <button 
                type="button" 
                onClick={() => {setMode('image'); setFile(null);}} 
                className={`px-4 py-2 rounded transition-all font-medium ${mode === 'image' ? 'bg-white shadow text-[#1B3147]' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Image
              </button>
            </div>

            {mode === 'xml' && (
              <div className="flex gap-6 pl-2">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="xmlType" checked={xmlType === 'flowchart'} onChange={() => setXmlType('flowchart')} className="accent-[#40E0D0]" /> 
                    <span>Flowchart (.xml)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="xmlType" checked={xmlType === 'nassi_shneiderman'} onChange={() => setXmlType('nassi_shneiderman')} className="accent-[#40E0D0]" /> 
                    <span>Nassi-Shneiderman (.xml)</span>
                </label>
              </div>
            )}

            {mode === 'image' && (
                <textarea 
                    className="w-full p-3 border border-slate-300 rounded focus:border-[#40E0D0] outline-none" 
                    placeholder="Describe your logic briefly to help the AI (e.g., 'This calculates the factorial of N')..." 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                />
            )}

            {/* 3. Drag & Drop Zone */}
            <div 
                {...getRootProps()} 
                className={`
                    border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
                    ${isDragActive ? 'border-[#40E0D0] bg-[#40E0D0]/10' : 'border-slate-300 hover:border-[#1B3147] hover:bg-slate-50'}
                    ${file ? 'bg-green-50 border-green-300' : ''}
                `}
            >
                <input {...getInputProps()} />
                
                {!file ? (
                    <div className="flex flex-col items-center gap-3 text-slate-500">
                        <UploadCloud size={48} className={isDragActive ? "text-[#40E0D0]" : "text-slate-300"} />
                        <p className="font-medium text-lg text-[#1B3147]">
                            {isDragActive ? "Drop it here!" : "Drag & drop your file here"}
                        </p>
                        <p className="text-sm">or click to browse</p>
                        <p className="text-xs text-slate-400 mt-2">
                            Supported: {mode === 'xml' ? '.xml, .txt' : '.png, .jpg, .webp'}
                        </p>
                    </div>
                ) : (
                    <div className="flex items-center justify-between bg-white p-4 rounded shadow-sm border border-green-200">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded text-green-700"><File size={24} /></div>
                            <div className="text-left">
                                <p className="font-bold text-[#1B3147]">{file.name}</p>
                                <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                        </div>
                        <button type="button" onClick={removeFile} className="text-slate-400 hover:text-red-500 p-2"><X size={20} /></button>
                    </div>
                )}
            </div>

            <button 
                disabled={loading || !file} 
                className="w-full py-3 bg-[#1B3147] hover:bg-[#243b55] disabled:bg-slate-300 text-white rounded-lg font-bold transition-all flex justify-center items-center gap-2"
            >
                {loading ? <><RefreshCw className="animate-spin" /> Grading...</> : "Submit & Grade"}
            </button>
        </form>
    </div>
  );
};