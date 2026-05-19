import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import toast from "react-hot-toast";
import { api } from "../../lib/api";

// Fetch all tasks (for admin)
export const fetchTasks = createAsyncThunk(
  "tasks/fetchAll",
  async (filters = {}, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/tasks", { params: filters });
      return data.data || [];
    } catch (error) {
      const message = error.response?.data?.message || "Failed to fetch tasks";
      toast.error(message);
      return rejectWithValue(error.response?.data || { message });
    }
  }
);

// Fetch my tasks (for employee)
export const fetchMyTasks = createAsyncThunk(
  "tasks/fetchMyTasks",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/tasks/my/tasks");
      return data.data || [];
    } catch (error) {
      const message = error.response?.data?.message || "Failed to fetch your tasks";
      toast.error(message);
      return rejectWithValue(error.response?.data || { message });
    }
  }
);

// Fetch single task by ID
export const fetchTaskById = createAsyncThunk(
  "tasks/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/tasks/${id}`);
      return data.data;
    } catch (error) {
      const message = error.response?.data?.message || "Failed to fetch task";
      toast.error(message);
      return rejectWithValue(error.response?.data || { message });
    }
  }
);

// Create task
export const createTask = createAsyncThunk(
  "tasks/create",
  async (taskData, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/tasks", taskData);
      toast.success("Task created successfully");
      return data.data;
    } catch (error) {
      const message = error.response?.data?.message || "Failed to create task";
      toast.error(message);
      return rejectWithValue(error.response?.data || { message });
    }
  }
);

// Update task
export const updateTask = createAsyncThunk(
  "tasks/update",
  async ({ id, taskData }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`/tasks/${id}`, taskData);
      toast.success("Task updated successfully");
      return data.data;
    } catch (error) {
      const message = error.response?.data?.message || "Failed to update task";
      toast.error(message);
      return rejectWithValue(error.response?.data || { message });
    }
  }
);

// Delete task
export const deleteTask = createAsyncThunk(
  "tasks/delete",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/tasks/${id}`);
      toast.success("Task deleted successfully");
      return id;
    } catch (error) {
      const message = error.response?.data?.message || "Failed to delete task";
      toast.error(message);
      return rejectWithValue(error.response?.data || { message });
    }
  }
);

// Add task update/comment
export const addTaskUpdate = createAsyncThunk(
  "tasks/addUpdate",
  async ({ id, updateData }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/tasks/${id}/updates`, updateData);
      toast.success("Update added successfully");
      return data.data;
    } catch (error) {
      const message = error.response?.data?.message || "Failed to add update";
      toast.error(message);
      return rejectWithValue(error.response?.data || { message });
    }
  }
);

// Fetch task stats (admin dashboard)
export const fetchTaskStats = createAsyncThunk(
  "tasks/fetchStats",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/tasks/stats/admin");
      return data.data;
    } catch (error) {
      const message = error.response?.data?.message || "Failed to fetch task stats";
      return rejectWithValue(error.response?.data || { message });
    }
  }
);

// Fetch my task stats (employee dashboard)
export const fetchMyTaskStats = createAsyncThunk(
  "tasks/fetchMyStats",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/tasks/stats/my");
      return data.data;
    } catch (error) {
      const message = error.response?.data?.message || "Failed to fetch your task stats";
      return rejectWithValue(error.response?.data || { message });
    }
  }
);

const taskSlice = createSlice({
  name: "tasks",
  initialState: {
    tasks: [],
    currentTask: null,
    stats: null,
    loading: false,
    error: null,
  },
  reducers: {
    setTasks: (state, action) => {
      state.tasks = action.payload;
    },
    addTaskLocally: (state, action) => {
      state.tasks.push(action.payload);
    },
    updateTaskLocally: (state, action) => {
      const index = state.tasks.findIndex((t) => t.id === action.payload.id);
      if (index !== -1) {
        state.tasks[index] = action.payload;
      }
      if (state.currentTask?.id === action.payload.id) {
        state.currentTask = action.payload;
      }
    },
    removeTaskLocally: (state, action) => {
      state.tasks = state.tasks.filter((t) => t.id !== action.payload);
      if (state.currentTask?.id === action.payload) {
        state.currentTask = null;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all tasks
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
      // Fetch my tasks
      .addCase(fetchMyTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks = action.payload;
      })
      .addCase(fetchMyTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch single task
      .addCase(fetchTaskById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTaskById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentTask = action.payload;
      })
      .addCase(fetchTaskById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create task
      .addCase(createTask.fulfilled, (state, action) => {
        state.tasks.push(action.payload);
      })
      // Update task
      .addCase(updateTask.fulfilled, (state, action) => {
        const index = state.tasks.findIndex((t) => t.id === action.payload.id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }
        if (state.currentTask?.id === action.payload.id) {
          state.currentTask = action.payload;
        }
      })
      // Delete task
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.tasks = state.tasks.filter((t) => t.id !== action.payload);
        if (state.currentTask?.id === action.payload) {
          state.currentTask = null;
        }
      })
      // Task stats
      .addCase(fetchTaskStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })
      .addCase(fetchMyTaskStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      });
  },
});

export const { setTasks, addTaskLocally, updateTaskLocally, removeTaskLocally } = taskSlice.actions;
export default taskSlice.reducer;
