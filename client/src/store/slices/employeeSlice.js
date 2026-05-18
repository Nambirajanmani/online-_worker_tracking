import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import toast from "react-hot-toast";
import { api } from "../../lib/api";

export const fetchEmployees = createAsyncThunk(
  "employees/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/admin/employees");
      return Array.isArray(data) ? data : data.data || [];
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch employees");
      return rejectWithValue(error.response?.data || { message: "Failed to fetch employees" });
    }
  }
);

export const createEmployee = createAsyncThunk(
  "employees/create",
  async (employeeData, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/admin/employees", employeeData);
      toast.success("Employee created successfully");
      return data.data || data;
    } catch (error) {
      const message = error.response?.data?.message || "Failed to create employee";
      toast.error(message);
      return rejectWithValue(error.response?.data || { message });
    }
  }
);

export const updateEmployee = createAsyncThunk(
  "employees/update",
  async ({ id, data: payload }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`/admin/employees/${id}`, payload);
      toast.success("Employee updated successfully");
      return data.data || data;
    } catch (error) {
      const message = error.response?.data?.message || "Failed to update employee";
      toast.error(message);
      return rejectWithValue(error.response?.data || { message });
    }
  }
);

export const deleteEmployee = createAsyncThunk(
  "employees/delete",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/admin/employees/${id}`);
      toast.success("Employee deleted successfully");
      return id;
    } catch (error) {
      const message = error.response?.data?.message || "Failed to delete employee";
      toast.error(message);
      return rejectWithValue(error.response?.data || { message });
    }
  }
);

const employeeSlice = createSlice({
  name: "employees",
  initialState: {
    employees: [],
    loading: false,
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmployees.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.loading = false;
        state.employees = action.payload;
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createEmployee.fulfilled, (state, action) => {
        state.employees.push(action.payload);
      })
      .addCase(updateEmployee.fulfilled, (state, action) => {
        const index = state.employees.findIndex((employee) => employee.id === action.payload.id);
        if (index !== -1) {
          state.employees[index] = action.payload;
        }
      })
      .addCase(deleteEmployee.fulfilled, (state, action) => {
        state.employees = state.employees.filter((employee) => employee.id !== action.payload);
      });
  }
});

export default employeeSlice.reducer;
