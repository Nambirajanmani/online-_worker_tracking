import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import axios from "axios";
import io from "socket.io-client";

const LiveMonitoring = () => {
  const [activeSessions, setActiveSessions] = useState([]);
  const [stats, setStats] = useState({ working: 0, idle: 0, paused: 0 });

  useEffect(() => {
    fetchLiveStatus();

    const token = localStorage.getItem("token");
    const socket = io(process.env.REACT_APP_API_URL || "http://localhost:5000", {
      auth: { token }
    });

    socket.on("timer_update", () => {
      fetchLiveStatus(); // Refresh data on any timer update
    });
    
    socket.on("timer:status_update", () => {
       fetchLiveStatus();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchLiveStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://localhost:5000/api/timer/live", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        const sessions = res.data.activeSessions || [];
        setActiveSessions(sessions);
        
        let working = 0, idle = 0, paused = 0;
        sessions.forEach(s => {
          if(s.status === 'running') working++;
          else if(s.status === 'idle') idle++;
          else paused++;
        });
        setStats({ working, idle, paused });
      }
    } catch (error) {
      console.error("Failed to fetch live status", error);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "running": return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold uppercase">Working</span>;
      case "paused": return <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs font-bold uppercase">Paused</span>;
      case "idle": return <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold uppercase">Idle</span>;
      default: return null;
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-semibold text-gray-800">Live Monitoring</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Active Timers</p>
              <h3 className="text-3xl font-bold text-gray-800">{activeSessions.length}</h3>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xl font-bold">
               {activeSessions.length}
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Currently Working</p>
              <h3 className="text-3xl font-bold text-green-600">{stats.working}</h3>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-xl font-bold">
               {stats.working}
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Idle Detect</p>
              <h3 className="text-3xl font-bold text-red-600">{stats.idle}</h3>
            </div>
            <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 text-xl font-bold">
               {stats.idle}
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">On Break / Paused</p>
              <h3 className="text-3xl font-bold text-orange-600">{stats.paused}</h3>
            </div>
            <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 text-xl font-bold">
               {stats.paused}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
             <h2 className="font-semibold text-gray-800 text-lg">Live Employee Status</h2>
             <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
               <span className="relative flex h-3 w-3">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
               </span>
               Live Updates Active
             </div>
          </div>
          <div className="divide-y divide-gray-100">
            {activeSessions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No active timers running right now.</div>
            ) : (
              activeSessions.map(session => (
                <div key={session.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <img 
                      src={session.profile_pic ? `http://localhost:5000${session.profile_pic}` : "https://ui-avatars.com/api/?name="+encodeURIComponent(session.employee_name)} 
                      alt={session.employee_name} 
                      className="w-12 h-12 rounded-full border border-gray-200"
                    />
                    <div>
                      <h4 className="font-bold text-gray-800">{session.employee_name}</h4>
                      <p className="text-sm text-gray-500">Task: <span className="font-medium text-blue-600">{session.task_name}</span></p>
                      {session.notes && <p className="text-xs text-gray-400 mt-1 italic w-64 truncate">"{session.notes}"</p>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getStatusBadge(session.status)}
                    <span className="text-sm font-mono font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded">
                      Started: {new Date(session.start_time).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default LiveMonitoring;
