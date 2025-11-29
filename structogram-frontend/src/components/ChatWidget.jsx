import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Sparkles, X, Send } from 'lucide-react';
import { api } from '../services/ApiService'; // Importing the singleton

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([{role: 'ai', text: "Hi! I'm your IT Tutor. Ask me about Flowcharts, Structograms, Python, C++, or Java."}]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
  useEffect(() => { scrollToBottom(); }, [messages, isOpen]);

  const sendMessage = async (e) => {
    e.preventDefault(); 
    if (!input.trim()) return;
    
    const userMsg = { role: 'student', text: input };
    const newHistory = [...messages, userMsg];
    
    setMessages(newHistory); 
    setInput(''); 
    setIsTyping(true);
    
    try {
      // Cleaner Call using Service Object
      const res = await api.chat(userMsg.text, newHistory.slice(-10));
      
      if (res.ok) {
          setMessages(prev => [...prev, { role: 'ai', text: res.data.response }]);
      } else {
          setMessages(prev => [...prev, { role: 'ai', text: "Error: " + (res.data.error || "Unknown error") }]);
      }
    } catch (err) { 
        setMessages(prev => [...prev, { role: 'ai', text: "Network connection failed." }]); 
    } finally { 
        setIsTyping(false); 
    }
  };

  if (!isOpen) return (<button onClick={() => setIsOpen(true)} className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all z-50 flex items-center gap-2"><MessageSquare size={24} /><span className="font-bold hidden md:inline">AI Tutor</span></button>);

  return (
    <div className="fixed bottom-6 right-6 w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 z-50 flex flex-col h-[500px] animate-in slide-in-from-bottom-10 fade-in">
      <div className="bg-slate-900 text-white p-4 rounded-t-xl flex justify-between items-center"><div className="flex items-center gap-2"><Sparkles size={18} className="text-yellow-400"/><h3 className="font-bold">IT Tutor Bot</h3></div><button onClick={() => setIsOpen(false)} className="hover:bg-slate-700 p-1 rounded"><X size={18}/></button></div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">{messages.map((msg, i) => (<div key={i} className={`flex ${msg.role === 'student' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] p-3 rounded-lg text-sm whitespace-pre-wrap ${msg.role === 'student' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'}`}>{msg.text}</div></div>))}{isTyping && (<div className="flex justify-start"><div className="bg-slate-200 text-slate-500 p-3 rounded-lg rounded-bl-none text-xs animate-pulse">Typing...</div></div>)}<div ref={messagesEndRef} /></div>
      <form onSubmit={sendMessage} className="p-3 border-t border-slate-200 bg-white rounded-b-xl flex gap-2"><input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question..." className="flex-1 p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"/><button type="submit" disabled={!input.trim() || isTyping} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"><Send size={18} /></button></form>
    </div>
  );
};

export default ChatWidget;