import React from 'react';
import { Book, Code, UploadCloud, CheckCircle, MessageSquare, Shield, Users } from 'lucide-react';

export const Help = ({ setView }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pt-6 pb-20">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
            <h2 className="text-3xl font-bold text-[#1B3147]">Help & Documentation</h2>
            <p className="text-slate-500 mt-1">Learn how to use the StructogramAI platform effectively.</p>
        </div>
        <button onClick={() => setView('seminars')} className="text-slate-500 hover:text-[#1B3147] font-medium">
            &larr; Back to App
        </button>
      </div>

      <div className="grid gap-6">
        
        {/* Section 1: Getting Started */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-xl font-bold text-[#1B3147] flex items-center gap-2 mb-4">
                <Users className="text-[#40E0D0]" /> Getting Started
            </h3>
            <div className="space-y-3 text-slate-700">
                <p><strong>Registration:</strong> Create an account by selecting your role. 
                <ul className="list-disc list-inside ml-4 mt-1 text-sm text-slate-600">
                    <li><strong>Student:</strong> Can join seminars and submit assignments.</li>
                    <li><strong>Teacher:</strong> Can create seminars, assignments, and view analytics.</li>
                </ul>
                </p>
                <p><strong>Login:</strong> Use your registered username or email to access your dashboard.</p>
            </div>
        </section>

        {/* Section 2: Seminars */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-xl font-bold text-[#1B3147] flex items-center gap-2 mb-4">
                <Book className="text-[#40E0D0]" /> Seminars
            </h3>
            <div className="space-y-3 text-slate-700">
                <p><strong>For Teachers:</strong> Click "Create" in the Seminars dashboard. You will receive a unique <strong>Invite Code</strong>.</p>
                <p><strong>For Students:</strong> Enter the Invite Code provided by your teacher in the top bar to join a seminar.</p>
            </div>
        </section>

        {/* Section 3: Assignments & Submissions */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-xl font-bold text-[#1B3147] flex items-center gap-2 mb-4">
                <UploadCloud className="text-[#40E0D0]" /> Submissions
            </h3>
            <div className="space-y-4 text-slate-700">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h4 className="font-bold text-blue-800 mb-2">Supported Formats</h4>
                    <ul className="list-disc list-inside text-sm text-blue-700">
                        <li><strong>Draw.io XML:</strong> Export your diagram as uncompressed XML.</li>
                        <li><strong>Images (PNG/JPG):</strong> Clear screenshots of your flowchart or structogram.</li>
                    </ul>
                </div>
                <p>
                    When submitting an image, provide a brief text description of the algorithm to help the AI understand your logic better.
                </p>
            </div>
        </section>

        {/* Section 4: Grading Logic */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-xl font-bold text-[#1B3147] flex items-center gap-2 mb-4">
                <CheckCircle className="text-[#40E0D0]" /> How Grading Works
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
                <div>
                    <h4 className="font-bold text-slate-800 mb-2">AI Grading</h4>
                    <p className="text-sm text-slate-600">
                        The system uses advanced AI to analyze your diagram's logic against the teacher's template. It checks for correctness, edge cases, and algorithmic efficiency.
                    </p>
                </div>
                <div>
                    <h4 className="font-bold text-slate-800 mb-2">Static Analysis</h4>
                    <p className="text-sm text-slate-600">
                        We generate actual code (Python/C++/Java) from your diagram and check it for style issues, complexity (Cyclomatic/Halstead), and potential bugs.
                    </p>
                </div>
            </div>
        </section>

        {/* Section 5: AI Tutor */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-xl font-bold text-[#1B3147] flex items-center gap-2 mb-4">
                <MessageSquare className="text-[#40E0D0]" /> AI Tutor
            </h3>
            <p className="text-slate-700">
                Stuck on a concept? Click the <span className="font-bold text-[#40E0D0]">turquoise chat button</span> in the bottom right corner. 
                The AI Tutor is context-aware and can explain programming concepts, help debug logic, or clarify assignment requirements.
            </p>
        </section>

        {/* Section 6: Security & Privacy */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-xl font-bold text-[#1B3147] flex items-center gap-2 mb-4">
                <Shield className="text-[#40E0D0]" /> Security
            </h3>
            <p className="text-slate-700">
                All submissions are checked for <strong>Plagiarism</strong> against previous student work. 
                Code execution runs in a secure sandbox to prevent malicious inputs.
            </p>
        </section>

      </div>
    </div>
  );
};