import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { getReportById, updateReport, downloadAttachment } from "../../store/slices/reportSlice";
import {
  ArrowLeft,
  Download,
  MessageSquare,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  Loader,
  Send,
} from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import toast from "react-hot-toast";

const AdminReportDetail = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentReport, loading } = useSelector((state) => state.reports);

  const [status, setStatus] = useState("");
  const [adminRemarks, setAdminRemarks] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    dispatch(getReportById(id));
  }, [id, dispatch]);

  useEffect(() => {
    if (currentReport) {
      setStatus(currentReport.status);
      setAdminRemarks(currentReport.admin_remarks || "");
    }
  }, [currentReport]);

  const handleDownload = async () => {
    if (!currentReport?.attachment) {
      toast.error("No attachment available");
      return;
    }

    try {
      const blob = await dispatch(downloadAttachment(id)).unwrap();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-${currentReport.report_id}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      await dispatch(
        updateReport({ id, status, adminRemarks })
      ).unwrap();

      // Update local state
      setStatus(status);
      setAdminRemarks(adminRemarks);
    } catch (error) {
      console.error("Update failed:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (st) => {
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
        icon: AlertCircle,
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

    const config = statusConfig[st] || statusConfig.Pending;
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${config.bg} border ${config.border} ${config.text}`}
      >
        <Icon className="h-4 w-4" />
        {st}
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
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="flex justify-center items-center h-96">
            <div className="text-center">
              <Loader className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading report details...</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!currentReport) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <AlertCircle className="h-16 w-16 text-red-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Report Not Found
            </h2>
            <p className="text-gray-600 mb-6">
              The report you're looking for doesn't exist or has been deleted.
            </p>
            <button
              onClick={() => navigate("/admin/reports")}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Reports
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate("/admin/reports")}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-6 w-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              {currentReport.title}
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Report Details Card */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Report Details
              </h2>

              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">
                      Employee Name
                    </p>
                    <p className="text-lg text-gray-900 font-medium">
                      {currentReport.employee_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">
                      Department
                    </p>
                    <p className="text-lg text-gray-900 font-medium">
                      {currentReport.department}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">
                      Report Type
                    </p>
                    <p className="text-lg text-gray-900 font-medium">
                      {currentReport.report_type}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">
                      Priority
                    </p>
                    <div className="mt-1">
                      {getPriorityBadge(currentReport.priority)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <p className="text-sm text-gray-600 font-medium mb-2">
                  Description
                </p>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {currentReport.description}
                </p>
              </div>

              {currentReport.attachment && (
                <div className="border-t border-gray-200 pt-6 mt-6">
                  <p className="text-sm text-gray-600 font-medium mb-3">
                    Attachment
                  </p>
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <FileText className="h-6 w-6 text-blue-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {currentReport.attachment}
                      </p>
                      <p className="text-xs text-gray-500">
                        Uploaded file
                      </p>
                    </div>
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-2 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-600 text-sm font-medium rounded transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                  </div>
                </div>
              )}

              <div className="border-t border-gray-200 pt-6 mt-6 text-xs text-gray-500">
                <p>Submitted: {formatDate(currentReport.created_at)}</p>
                <p>Last Updated: {formatDate(currentReport.updated_at)}</p>
              </div>
            </div>
          </div>

          {/* Sidebar - Update Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Update Report
              </h2>

              <form onSubmit={handleUpdate} className="space-y-4">
                {/* Current Status Display */}
                <div>
                  <p className="text-sm text-gray-600 font-medium mb-2">
                    Current Status
                  </p>
                  <div>{getStatusBadge(currentReport.status)}</div>
                </div>

                {/* Status Update */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Change Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Review">In Review</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                {/* Admin Remarks */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Remarks
                  </label>
                  <textarea
                    value={adminRemarks}
                    onChange={(e) => setAdminRemarks(e.target.value)}
                    placeholder="Add your remarks or comments here..."
                    rows="6"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {adminRemarks.length} characters
                  </p>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  {isUpdating ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Update Report
                    </>
                  )}
                </button>
              </form>

              {/* Additional Info */}
              <div className="border-t border-gray-200 mt-6 pt-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex gap-3">
                    <MessageSquare className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        Update Notification
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        The employee will be notified when you update the report status.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminReportDetail;
