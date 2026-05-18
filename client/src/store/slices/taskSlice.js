import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import toast from "react-hot-toast";
import { api } from "../../lib/api";

export const fetchTasks = createAsyncThunk(
  "tasks/fetchAll",
  async (filters = {}, { getState, rejectWithValue }) => {
    try {
      const role = getState().auth.user?.role;
      const endpoint =
        filters.endpoint || (role === "employee" ? "/employee/tasks" : "/admin/tasks");
      const { endpoint: _endpoint, ...params } = filters;
      const { data } = await api.get(endpoint, { params });
      return Array.isArray(data) ? data : data.data || [];
    } catch (error) {
      const message = error.response?.data?.message || "Failed to fetch tasks";
      toast.error(message);
      return rejectWithValue(error.response?.data || { message });
    }
  }
);

export const createTask = createAsyncThunk(
  "tasks/create",
  async (taskData, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/admin/tasks", taskData);
      toast.success("Task created successfully");
      return data.data || data;
    } catch (error) {
      const message = error.response?.data?.message || "Failed to create task";
      toast.error(message);
      return rejectWithValue(error.response?.data || { message });
    }
  }
);

export const updateTaskStatus = createAsyncThunk(
  "tasks/updateStatus",
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`/employee/tasks/${id}/status`, { status });
      toast.success("Task status updated");
      return data.data || data;
    } catch (error) {
      const message = error.response?.data?.message || "Failed to update task status";
      toast.error(message);
      return rejectWithValue(error.response?.data || { message });
    }
  }
);

const taskSlice = createSlice({
  name: "tasks",
  initialState: {
    tasks: [],
    loading: false,
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks = action.payload;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.tasks.push(action.payload);
      })
      .addCase(updateTaskStatus.fulfilled, (state, action) => {
        const index = state.tasks.findIndex((task) => task.id === action.payload.id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }
      });
  }
});

export default taskSlice.reducer;
