import React, { useEffect, useState } from "react";
import EmployeeLayout from "../../components/employee/EmployeeLayout";
import axios from "axios";

const SessionHistory = () => {
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState({ total_duration: 0, active_duration: 0, idle_duration: 0 });

  useEffect(() => {
    fetchHistory();
    fetchSummary();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
  };

  const fetchHistory = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if(!user.id) return;
      const res = await axios.get(`http://localhost:5000/api/timer/history/${user.id}`, { headers: getAuthHeaders() });
      if (res.data.success) {
        setHistory(res.data.history);
      }
    } catch (error) {
      console.error("Failed to fetch history");
    }
  };

  const fetchSummary = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if(!user.id) return;
      const res = await axios.get(`http://localhost:5000/api/timer/summary/${user.id}`, { headers: getAuthHeaders() });
      if (res.data.success) {
        setSummary(res.data.summary);
      }
    } catch (error) {
      console.error("Failed to fetch summary");
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "0h 0m";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <EmployeeLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-semibold text-gray-800">My Session History</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
             <p className="text-sm text-gray-500 mb-1 font-medium">Today's Total Time</p>
             <p className="text-3xl font-bold text-blue-600">{formatDuration(summary.total_duration)}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
             <p className="text-sm text-gray-500 mb-1 font-medium">Active Working Time</p>
             <p className="text-3xl font-bold text-green-600">{formatDuration(summary.active_duration)}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
             <p className="text-sm text-gray-500 mb-1 font-medium">Idle Time Detected</p>
             <p className="text-3xl font-bold text-red-600">{formatDuration(summary.idle_duration)}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
             <h2 className="font-semibold text-gray-800">Previous Sessions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-3 border-b border-gray-100">Date</th>
                  <th className="px-6 py-3 border-b border-gray-100">Task</th>
                  <th className="px-6 py-3 border-b border-gray-100">Start Time</th>
                  <th className="px-6 py-3 border-b border-gray-100">End Time</th>
                  <th className="px-6 py-3 border-b border-gray-100">Status</th>
                  <th className="px-6 py-3 border-b border-gray-100">Total Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.length === 0 ? (
                   <tr>
                     <td colSpan="6" className="px-6 py-8 text-center text-gray-500">No session history found.</td>
                   </tr>
                ) : (
                  history.map((session) => (
                    <tr key={session.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-800">{new Date(session.start_time).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-800">{session.task_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{new Date(session.start_time).toLocaleTimeString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{session.end_time ? new Date(session.end_time).toLocaleTimeString() : '-'}</td>
                      <td className="px-6 py-4">
                         <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                           session.status === 'stopped' ? 'bg-gray-100 text-gray-800' : 
                           session.status === 'running' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                         }`}>
                           {session.status.toUpperCase()}
                         </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-800">{formatDuration(session.total_duration)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </EmployeeLayout>
  );
};

export default SessionHistory;
