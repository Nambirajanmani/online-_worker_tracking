import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { getReportById, downloadAttachment } from "../../store/slices/reportSlice";
import {
  ArrowLeft,
  Download,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  Loader,
  MessageSquare,
} from "lucide-react";
import EmployeeLayout from "../../components/employee/EmployeeLayout";

const EmployeeReportDetail = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentReport, loading } = useSelector((state) => state.reports);

  useEffect(() => {
    dispatch(getReportById(id));
  }, [id, dispatch]);

  const handleDownload = async () => {
    if (!currentReport?.attachment) {
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
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <EmployeeLayout>
        <div className="p-6">
          <div className="flex justify-center items-center h-96">
            <div className="text-center">
              <Loader className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading report details...</p>
            </div>
          </div>
        </div>
      </EmployeeLayout>
    );
  }

  if (!currentReport) {
    return (
      <EmployeeLayout>
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
              onClick={() => navigate("/employee/my-reports")}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to My Reports
            </button>
          </div>
        </div>
      </EmployeeLayout>
    );
  }

  return (
    <EmployeeLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate("/employee/my-reports")}
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
            {/* Status Card */}
            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-600">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Report Status
              </h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Current Status</p>
                  <div className="mt-2">{getStatusBadge(currentReport.status)}</div>
                </div>
                <div className="text-right">
                  <p className="text-gray-600 text-sm">Priority</p>
                  <div className="mt-2">
                    {getPriorityBadge(currentReport.priority)}
                  </div>
                </div>
              </div>
            </div>

            {/* Report Details */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Report Details
              </h2>

              <div className="space-y-6">
                {/* Type and Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">
                      Report Type
                    </p>
                    <p className="text-lg text-gray-900 font-medium mt-1">
                      {currentReport.report_type}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">
                      Submitted Date
                    </p>
                    <p className="text-lg text-gray-900 font-medium mt-1">
                      {formatDate(currentReport.created_at)}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm text-gray-600 font-medium mb-2">
                    Description
                  </p>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {currentReport.description}
                  </p>
                </div>

                {/* Attachment */}
                {currentReport.attachment && (
                  <div className="border-t border-gray-200 pt-4">
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
              </div>
            </div>
          </div>

          {/* Sidebar - Admin Remarks */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-800">
                  Admin Remarks
                </h2>
              </div>

              {currentReport.admin_remarks ? (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-gray-700 text-sm whitespace-pre-wrap">
                    {currentReport.admin_remarks}
                  </p>
                  <p className="text-xs text-gray-500 mt-3">
                    Updated: {formatDate(currentReport.updated_at)}
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-center">
                  <MessageSquare className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">
                    No remarks yet. The admin will add remarks when reviewing your report.
                  </p>
                </div>
              )}

              {/* Timeline */}
              <div className="border-t border-gray-200 mt-6 pt-6">
                <h3 className="text-sm font-semibold text-gray-800 mb-4">
                  Timeline
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex gap-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-800">Submitted</p>
                      <p className="text-gray-500 text-xs">
                        {formatDate(currentReport.created_at)}
                      </p>
                    </div>
                  </div>
                  {currentReport.status !== "Pending" && (
                    <div className="flex gap-3">
                      <div className="w-2 h-2 bg-green-600 rounded-full mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-800">
                          Status: {currentReport.status}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {formatDate(currentReport.updated_at)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </EmployeeLayout>
  );
};

export default EmployeeReportDetail;
