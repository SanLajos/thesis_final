import React, { useState, useEffect } from 'react';
import { api } from '../services/ApiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, FileText, AlertTriangle } from 'lucide-react';

export const SeminarAnalytics = ({ activeSeminar, setView }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.request(`/seminar/${activeSeminar.id}/analytics`);
        if (res.ok) setData(res.data);
      } catch (e) {
        console.error("Analytics error", e);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [activeSeminar]);

  if (loading) return <div className="p-10 text-center text-slate-500">Calculating statistics...</div>;
  if (!data) return <div className="p-10 text-center text-red-500">Failed to load analytics.</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pt-6 pb-20">
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
            <h2 className="text-2xl font-bold text-[#1B3147]">Seminar Analytics</h2>
            <p className="text-slate-500">{activeSeminar.title}</p>
        </div>
        <button onClick={() => setView('dashboard')} className="text-slate-500 hover:text-[#1B3147]">
            &larr; Back to Dashboard
        </button>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-full"><Users size={24}/></div>
            <div>
                <div className="text-2xl font-bold">{data.student_count}</div>
                <div className="text-sm text-slate-500">Active Students</div>
            </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-full"><FileText size={24}/></div>
            <div>
                <div className="text-2xl font-bold">{data.assignment_count}</div>
                <div className="text-sm text-slate-500">Total Assignments</div>
            </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-full"><div className="font-bold text-lg">Avg</div></div>
            <div>
                <div className="text-2xl font-bold">
                    {data.assignment_performance.length > 0 
                        ? Math.round(data.assignment_performance.reduce((acc, curr) => acc + curr.avg_score, 0) / data.assignment_performance.length) 
                        : 0}%
                </div>
                <div className="text-sm text-slate-500">Class Average</div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart: Assignment Performance */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4">Average Score per Assignment</h3>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.assignment_performance}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="title" tick={{fontSize: 12}} interval={0} angle={-15} textAnchor="end" height={60}/>
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Bar dataKey="avg_score" fill="#40E0D0" radius={[4, 4, 0, 0]} name="Avg Score" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Table: At Risk Students */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <AlertTriangle size={18} className="text-red-500" /> At-Risk Students (Avg &lt; 70%)
            </h3>
            {data.at_risk_students.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-green-600 font-medium">
                    🎉 No students currently at risk!
                </div>
            ) : (
                <div className="overflow-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600">
                            <tr>
                                <th className="p-3 rounded-tl">Student</th>
                                <th className="p-3">Avg Grade</th>
                                <th className="p-3 rounded-tr">Submissions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.at_risk_students.map((s, i) => (
                                <tr key={i}>
                                    <td className="p-3 font-medium">{s.username}</td>
                                    <td className="p-3 text-red-600 font-bold">{Math.round(s.avg_grade)}%</td>
                                    <td className="p-3 text-slate-500">{s.submissions}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};