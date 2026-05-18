import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import toast from "react-hot-toast";
import { api, setAuthToken } from "../../lib/api";

const storedUser = localStorage.getItem("user");
const storedToken = localStorage.getItem("token");

let parsedUser = null;
try {
  if (storedUser && storedUser !== "undefined") {
    parsedUser = JSON.parse(storedUser);
    // Set initial token for axios if it exists to prevent 401 on refresh
    if (storedToken && storedToken !== "undefined") {
      setAuthToken(storedToken);
    }
  }
} catch (error) {
  console.error("Failed to parse user from localStorage", error);
  localStorage.clear();
}

export const login = createAsyncThunk(
  "auth/login",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await api.post("/auth/login", { email, password });
      
      if (!response.data) throw new Error("Empty response from server");

      const rawData = response.data.data || response.data;
      
      const token = rawData.token;
      const user = rawData.user || (rawData.role ? rawData : null);

      if (!token) throw new Error("No token received from server");

      localStorage.setItem("token", token);
      localStorage.setItem("refreshToken", rawData.refreshToken || "");
      localStorage.setItem("user", JSON.stringify(user));
      setAuthToken(token);
      toast.success("Login successful");
      return { user, token, refreshToken: rawData.refreshToken };
    } catch (error) {
      const message =
        error.response?.data?.message ||
        (error.request
          ? `Cannot connect to the server. Make sure the backend is running at ${process.env.REACT_APP_API_URL}`
          : "Login failed");
      toast.error(message);
      return rejectWithValue(error.response?.data || { message });
    }
  }
);

export const logout = createAsyncThunk("auth/logout", async () => {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  setAuthToken(null);
  toast.success("Logged out successfully");
  return null;
});

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: parsedUser,
    token: storedToken && storedToken !== "undefined" ? storedToken : null,
    isAuthenticated: !!storedToken && storedToken !== "undefined",
    loading: false,
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(logout.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
      });
  }
});

export default authSlice.reducer;
