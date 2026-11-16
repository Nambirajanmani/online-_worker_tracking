import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { getMyReports, downloadAttachment } from "../../store/slices/reportSlice";
import {
  FileText,
  Download,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  XCircle,
  Loader,
  Plus,
} from "lucide-react";
import EmployeeLayout from "../../components/employee/EmployeeLayout";

const MyReports = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { myReports, pagination, loading } = useSelector(
    (state) => state.reports
  );

  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    dispatch(getMyReports({ page: currentPage, limit: 10 }));
  }, [currentPage, dispatch]);

  const handleDownload = async (reportId) => {
    try {
      const blob = await dispatch(downloadAttachment(reportId)).unwrap();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-${reportId}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      Pending: {
        bg: "bg-yellow-50",
        border: "border-yellow-200",
        text: "text-yellow-700",
        icon: Clock,
      },
      "In Review": {
        bg: "bg-blue-50",
        border: "border-blue-200",
        text: "text-blue-700",
        icon: FileText,
      },
      Resolved: {
        bg: "bg-green-50",
        border: "border-green-200",
        text: "text-green-700",
        icon: CheckCircle,
      },
      Rejected: {
        bg: "bg-red-50",
        border: "border-red-200",
        text: "text-red-700",
        icon: XCircle,
      },
    };

    const config = statusConfig[status] || statusConfig.Pending;
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${config.bg} border ${config.border} ${config.text}`}
      >
        <Icon className="h-4 w-4" />
        {status}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      Low: "bg-gray-100 text-gray-700",
      Medium: "bg-blue-100 text-blue-700",
      High: "bg-orange-100 text-orange-700",
      Urgent: "bg-red-100 text-red-700",
    };

    return (
      <span
        className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
          priorityConfig[priority] || priorityConfig.Medium
        }`}
      >
        {priority}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <EmployeeLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">My Reports</h1>
            <p className="text-gray-600">Track and manage your submitted reports</p>
          </div>
          <button
            onClick={() => navigate("/employee/report-submission")}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            <Plus className="h-5 w-5" />
            New Report
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center h-96">
            <div className="text-center">
              <Loader className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading your reports...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && myReports.length === 0 && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              No Reports Submitted
            </h2>
            <p className="text-gray-600 mb-6">
              You haven't submitted any reports yet. Create your first report to get started.
            </p>
            <button
              onClick={() => navigate("/employee/report-submission")}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              <Plus className="h-5 w-5" />
              Submit Report
            </button>
          </div>
        )}

        {/* Reports Table */}
        {!loading && myReports.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Title
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Priority
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Submitted
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {myReports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <div>
                          <p className="font-medium">{report.title}</p>
                          <p className="text-gray-500 text-xs truncate max-w-xs">
                            {report.description}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {report.report_type}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {getPriorityBadge(report.priority)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {getStatusBadge(report.status)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(report.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/employee/report/${report.id}`)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 text-sm font-medium rounded transition-colors"
                          >
                            View
                          </button>
                          {report.attachment && (
                            <button
                              onClick={() => handleDownload(report.id)}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 hover:bg-green-100 text-green-600 text-sm font-medium rounded transition-colors"
                              title="Download attachment"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.pages} (
                  {pagination.total} total)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setCurrentPage(Math.max(1, currentPage - 1))
                    }
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage(Math.min(pagination.pages, currentPage + 1))
                    }
                    disabled={currentPage === pagination.pages}
                    className="flex items-center gap-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </EmployeeLayout>
  );
};

export default MyReports;
