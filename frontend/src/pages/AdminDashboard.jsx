import React, { useState, useEffect } from 'react';
import { api } from '../services/ApiService';
import { Trash2, Users, BookOpen, FileText } from 'lucide-react';

export const AdminDashboard = ({ setView }) => {
  const [stats, setStats] = useState({ users: 0, seminars: 0, submissions: 0 });
  const [users, setUsers] = useState([]);
  const [seminars, setSeminars] = useState([]);
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'seminars'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, usersRes, semRes] = await Promise.all([
        api.request('/admin/stats'),
        api.request('/admin/users'),
        api.request('/admin/seminars')
      ]);

      if (statsRes.ok) setStats(statsRes.data);
      if (usersRes.ok) setUsers(usersRes.data);
      if (semRes.ok) setSeminars(semRes.data);
    } catch (e) {
      alert("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm("Are you sure? This will delete all their submissions.")) return;
    const res = await api.request(`/admin/user/${id}`, 'DELETE');
    if (res.ok) {
      alert("User deleted permanently");
      setUsers(users.filter(u => u.id !== id));
      setStats(prev => ({ ...prev, users: prev.users - 1 }));
    } else {
      alert(res.data.error || "Delete failed");
    }
  };

  const handleDeleteSeminar = async (id) => {
    if (!window.confirm("Delete seminar? All assignments will be lost.")) return;
    const res = await api.request(`/admin/seminar/${id}`, 'DELETE');
    if (res.ok) {
      alert("Seminar deleted");
      setSeminars(seminars.filter(s => s.id !== id));
      setStats(prev => ({ ...prev, seminars: prev.seminars - 1 }));
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-500">Loading Admin Panel...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-[#1B3147]">System Administration</h2>
        <button onClick={() => setView('seminars')} className="text-slate-500 hover:text-[#1B3147]">Exit Admin</button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full"><Users size={24} /></div>
          <div><div className="text-2xl font-bold">{stats.users}</div><div className="text-sm text-slate-500">Total Users</div></div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-full"><BookOpen size={24} /></div>
          <div><div className="text-2xl font-bold">{stats.seminars}</div><div className="text-sm text-slate-500">Active Seminars</div></div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-full"><FileText size={24} /></div>
          <div><div className="text-2xl font-bold">{stats.submissions}</div><div className="text-sm text-slate-500">Total Submissions</div></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-6">
        <button 
          onClick={() => setActiveTab('users')} 
          className={`pb-2 px-1 font-medium transition-colors ${activeTab === 'users' ? 'border-b-2 border-[#40E0D0] text-[#1B3147]' : 'text-slate-400'}`}
        >
          Manage Users
        </button>
        <button 
          onClick={() => setActiveTab('seminars')} 
          className={`pb-2 px-1 font-medium transition-colors ${activeTab === 'seminars' ? 'border-b-2 border-[#40E0D0] text-[#1B3147]' : 'text-slate-400'}`}
        >
          Manage Seminars
        </button>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {activeTab === 'users' && (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="p-4">ID</th>
                <th className="p-4">Username</th>
                <th className="p-4">Email</th>
                <th className="p-4">Role</th>
                <th className="p-4">Joined</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="p-4 text-slate-400">#{u.id}</td>
                  <td className="p-4 font-medium">{u.username}</td>
                  <td className="p-4 text-slate-600">{u.email}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs uppercase font-bold ${u.role==='admin'?'bg-red-100 text-red-700': u.role==='teacher'?'bg-blue-100 text-blue-700':'bg-slate-100 text-slate-600'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4 text-slate-500 text-sm">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="p-4 text-right">
                    {u.role !== 'admin' && (
                      <button onClick={() => handleDeleteUser(u.id)} className="text-red-400 hover:text-red-600 p-2 rounded hover:bg-red-50" title="Delete User">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'seminars' && (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="p-4">ID</th>
                <th className="p-4">Title</th>
                <th className="p-4">Code</th>
                <th className="p-4">Creator</th>
                <th className="p-4">Created</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {seminars.map(s => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="p-4 text-slate-400">#{s.id}</td>
                  <td className="p-4 font-medium">{s.title}</td>
                  <td className="p-4 font-mono text-blue-600">{s.invite_code}</td>
                  <td className="p-4">{s.creator || "Unknown"}</td>
                  <td className="p-4 text-slate-500 text-sm">{new Date(s.created_at).toLocaleDateString()}</td>
                  <td className="p-4 text-right">
                    <button onClick={() => handleDeleteSeminar(s.id)} className="text-red-400 hover:text-red-600 p-2 rounded hover:bg-red-50">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};