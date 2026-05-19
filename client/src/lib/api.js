import axios from "axios";

export const API_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000/api";

export const api = axios.create({
  baseURL: API_URL
});

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
    delete axios.defaults.headers.common.Authorization;
  }
};

export const clearAuthStorage = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  setAuthToken(null);
};

const redirectToLogin = () => {
  clearAuthStorage();
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
};

let isRefreshing = false;
let refreshQueue = [];

const processRefreshQueue = (error, token = null) => {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  refreshQueue = [];
};

const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken || refreshToken === "undefined") {
    throw new Error("No refresh token");
  }

  const { data } = await axios.post(`${API_URL}/auth/refresh-token`, { refreshToken });
  const newToken = data.token;
  if (!newToken) {
    throw new Error("No token in refresh response");
  }

  localStorage.setItem("token", newToken);
  setAuthToken(newToken);
  return newToken;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isExpiredToken =
      error.response?.status === 401 &&
      error.response?.data?.message === "Token expired";

    if (!isExpiredToken || originalRequest._retry || originalRequest.url?.includes("/auth/refresh-token")) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const newToken = await refreshAccessToken();
      const { store } = await import("../store/store");
      const { setToken } = await import("../store/slices/authSlice");
      store.dispatch(setToken(newToken));
      processRefreshQueue(null, newToken);
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processRefreshQueue(refreshError, null);
      redirectToLogin();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export const initializeAuth = () => {
  const token = localStorage.getItem("token");
  setAuthToken(token);
};
