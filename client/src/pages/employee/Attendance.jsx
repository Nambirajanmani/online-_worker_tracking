import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { useSelector } from "react-redux";
import EmployeeLayout from "../../components/employee/EmployeeLayout";
import { api } from "../../lib/api";

const Attendance = () => {
  const { token } = useSelector((state) => state.auth);
  const currentYear = new Date().getFullYear();
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [summary, setSummary] = useState({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    totalHours: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  useEffect(() => {
    const fetchAttendanceHistory = async () => {
      setLoading(true);
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const monthStart = String(selectedMonth).padStart(2, "0");
        const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
        const response = await api.get("/employee/attendance", {
          headers,
          params: {
            startDate: `${selectedYear}-${monthStart}-01`,
            endDate: `${selectedYear}-${monthStart}-${String(lastDay).padStart(2, "0")}`
          }
        });

        const data = Array.isArray(response.data?.data) ? response.data.data : [];
        setAttendanceHistory(data);
        setSummary({
          totalDays: response.data?.summary?.totalDays ?? data.length,
          presentDays: response.data?.summary?.presentDays ?? data.filter((record) => record.status === "present").length,
          absentDays: response.data?.summary?.absentDays ?? data.filter((record) => record.status === "absent").length,
          lateDays: response.data?.summary?.lateDays ?? data.filter((record) => record.status === "late").length,
          totalHours: response.data?.summary?.totalHours ?? data.reduce((sum, record) => sum + Number(record.total_hours || 0), 0)
        });
      } catch (error) {
        console.error("Failed to fetch attendance history", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceHistory();
  }, [selectedMonth, selectedYear, token]);

  const years = Array.from({ length: 5 }, (_, index) => currentYear - index);
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];

  return (
    <EmployeeLayout>
      <div className="p-6">
        <h1 className="text-3xl font-semibold text-stone-900">Attendance History</h1>
        <p className="mt-2 text-stone-600">Review monthly attendance, punctuality, and logged hours.</p>

        <div className="mt-6 rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-stone-200">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Month</label>
              <select className="input-field" value={selectedMonth} onChange={(event) => setSelectedMonth(Number(event.target.value))}>
                {months.map((month, index) => (
                  <option key={month} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Year</label>
              <select className="input-field" value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))}>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
          {[
            ["Total Days", summary.totalDays],
            ["Present", summary.presentDays],
            ["Absent", summary.absentDays],
            ["Late", summary.lateDays],
            ["Total Hours", summary.totalHours.toFixed(1)]
          ].map(([label, value]) => (
            <div key={label} className="rounded-[1.5rem] bg-white p-5 text-center shadow-sm ring-1 ring-stone-200">
              <p className="text-sm text-stone-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-stone-900">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 overflow-hidden rounded-[1.5rem] bg-white shadow-sm ring-1 ring-stone-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200">
              <thead className="bg-stone-50">
                <tr>
                  {["Date", "Day", "Clock In", "Clock Out", "Total Hours", "Status"].map((heading) => (
                    <th key={heading} className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.15em] text-stone-500">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-10 text-center">
                      <div className="spinner mx-auto" />
                    </td>
                  </tr>
                ) : attendanceHistory.length ? (
                  attendanceHistory.map((record) => (
                    <tr key={record.id}>
                      <td className="px-6 py-4 text-sm text-stone-700">{format(new Date(record.date), "MMM dd, yyyy")}</td>
                      <td className="px-6 py-4 text-sm text-stone-500">{format(new Date(record.date), "EEEE")}</td>
                      <td className="px-6 py-4 text-sm text-stone-700">{record.clock_in_time || "-"}</td>
                      <td className="px-6 py-4 text-sm text-stone-700">{record.clock_out_time || "-"}</td>
                      <td className="px-6 py-4 text-sm text-stone-700">{record.total_hours || 0} hrs</td>
                      <td className="px-6 py-4 text-sm text-stone-700">{record.status || "unknown"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-10 text-center text-stone-500">
                      No attendance records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </EmployeeLayout>
  );
};

export default Attendance;
