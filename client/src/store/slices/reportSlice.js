import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import toast from "react-hot-toast";
import { api } from "../../lib/api";

export const createReport = createAsyncThunk(
  "reports/create",
  async (formData, { rejectWithValue }) => {
    try {
      console.log("🚀 Sending report creation request to API");
      console.log("📦 FormData entries:", Array.from(formData.entries()));
      
      // Simply post the FormData - let axios and browser handle Content-Type
      const response = await api.post("/reports/create", formData);
      
      console.log("✅ Report created successfully:", response.data);
      toast.success("Report submitted successfully!");
      return response.data.data;
    } catch (error) {
      console.error("❌ Report creation error:", error);
      console.error("Error details:", {
        status: error.response?.status,
        message: error.response?.data?.message,
        data: error.response?.data,
      });
      const message = error.response?.data?.message || "Failed to create report";
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const getMyReports = createAsyncThunk(
  "reports/getMyReports",
  async ({ page = 1, limit = 10 } = {}, { rejectWithValue }) => {
    try {
      const response = await api.get(`/reports/my-reports?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || "Failed to fetch reports";
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const getAllReports = createAsyncThunk(
  "reports/getAllReports",
  async (
    { status, department, employeeId, search, page = 1, limit = 10 } = {},
    { rejectWithValue }
  ) => {
    try {
      const params = new URLSearchParams();
      if (status) params.append("status", status);
      if (department) params.append("department", department);
      if (employeeId) params.append("employeeId", employeeId);
      if (search) params.append("search", search);
      params.append("page", page);
      params.append("limit", limit);

      const response = await api.get(`/reports/admin/all?${params.toString()}`);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || "Failed to fetch reports";
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const getReportById = createAsyncThunk(
  "reports/getReportById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/reports/admin/${id}`);
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || "Failed to fetch report";
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateReport = createAsyncThunk(
  "reports/updateReport",
  async ({ id, status, adminRemarks }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/reports/admin/${id}`, {
        status,
        adminRemarks,
      });
      toast.success("Report updated successfully!");
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || "Failed to update report";
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const getReportStatistics = createAsyncThunk(
  "reports/getStatistics",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/reports/admin/stats");
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || "Failed to fetch statistics";
      return rejectWithValue(message);
    }
  }
);

export const downloadAttachment = createAsyncThunk(
  "reports/downloadAttachment",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/reports/download/${id}`, {
        responseType: "blob",
      });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || "Failed to download attachment";
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

const initialState = {
  myReports: [],
  allReports: [],
  currentReport: null,
  statistics: {
    total: 0,
    pending: 0,
    inReview: 0,
    resolved: 0,
    rejected: 0,
  },
  pagination: {
    total: 0,
    page: 1,
    limit: 10,
    pages: 0,
  },
  loading: false,
  error: null,
};

const reportsSlice = createSlice({
  name: "reports",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearReports: (state) => {
      state.myReports = [];
      state.allReports = [];
      state.currentReport = null;
    },
    addNewReportToList: (state, action) => {
      state.allReports.unshift(action.payload);
    },
    updateReportInList: (state, action) => {
      const index = state.allReports.findIndex(
        (r) => r.id === action.payload.id
      );
      if (index !== -1) {
        state.allReports[index] = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    // Create Report
    builder
      .addCase(createReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createReport.fulfilled, (state, action) => {
        state.loading = false;
        state.myReports.unshift(action.payload);
      })
      .addCase(createReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Get My Reports
    builder
      .addCase(getMyReports.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getMyReports.fulfilled, (state, action) => {
        state.loading = false;
        state.myReports = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(getMyReports.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Get All Reports
    builder
      .addCase(getAllReports.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllReports.fulfilled, (state, action) => {
        state.loading = false;
        state.allReports = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(getAllReports.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Get Report By ID
    builder
      .addCase(getReportById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getReportById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentReport = action.payload;
      })
      .addCase(getReportById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Update Report
    builder
      .addCase(updateReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateReport.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.allReports.findIndex(
          (r) => r.id === action.payload.id
        );
        if (index !== -1) {
          state.allReports[index] = action.payload;
        }
        state.currentReport = action.payload;
      })
      .addCase(updateReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Get Statistics
    builder
      .addCase(getReportStatistics.pending, (state) => {
        state.loading = true;
      })
      .addCase(getReportStatistics.fulfilled, (state, action) => {
        state.loading = false;
        state.statistics = action.payload;
      })
      .addCase(getReportStatistics.rejected, (state) => {
        state.loading = false;
      });

    // Download Attachment
    builder
      .addCase(downloadAttachment.pending, (state) => {
        state.loading = true;
      })
      .addCase(downloadAttachment.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(downloadAttachment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  clearReports,
  addNewReportToList,
  updateReportInList,
} = reportsSlice.actions;

export default reportsSlice.reducer;
