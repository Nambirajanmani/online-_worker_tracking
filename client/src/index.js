import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import App from "./App";
import { initializeAuth } from "./lib/api";
import { store } from "./store/store";
import "./styles/global.css";

// Global error handlers for boot/import errors
window.addEventListener("error", (event) => {
  const rootEl = document.getElementById("root");
  if (rootEl) {
    rootEl.innerHTML = `
      <div style="font-family: system-ui, sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto; background: #fff5f5; border: 1px solid #feb2b2; border-radius: 8px; margin-top: 2rem;">
        <h1 style="color: #c53030; font-size: 1.5rem; margin-top: 0;">Application Runtime Error</h1>
        <p style="color: #2d3748; font-weight: bold;">${event.message}</p>
        <p style="color: #718096; font-size: 0.875rem;">Source: ${event.filename}:${event.lineno}:${event.colno}</p>
        <pre style="background: #1a202c; color: #fff; padding: 1rem; border-radius: 4px; overflow-x: auto; font-family: monospace; font-size: 0.875rem;">${event.error?.stack || 'No stack trace available'}</pre>
        <button onclick="localStorage.clear(); sessionStorage.clear(); window.location.reload();" style="background: #c53030; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; font-weight: bold; cursor: pointer;">Clear Cache & Reload</button>
      </div>
    `;
  }
});

window.addEventListener("unhandledrejection", (event) => {
  const rootEl = document.getElementById("root");
  if (rootEl) {
    rootEl.innerHTML = `
      <div style="font-family: system-ui, sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto; background: #fff5f5; border: 1px solid #feb2b2; border-radius: 8px; margin-top: 2rem;">
        <h1 style="color: #c53030; font-size: 1.5rem; margin-top: 0;">Unhandled Promise Rejection</h1>
        <p style="color: #2d3748; font-weight: bold;">${event.reason?.message || event.reason}</p>
        <pre style="background: #1a202c; color: #fff; padding: 1rem; border-radius: 4px; overflow-x: auto; font-family: monospace; font-size: 0.875rem;">${event.reason?.stack || 'No stack trace available'}</pre>
        <button onclick="localStorage.clear(); sessionStorage.clear(); window.location.reload();" style="background: #c53030; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; font-weight: bold; cursor: pointer;">Clear Cache & Reload</button>
      </div>
    `;
  }
});

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  handleClearAndReload = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          fontFamily: "system-ui, sans-serif",
          padding: "2rem",
          maxWidth: "800px",
          margin: "0 auto",
          background: "#fff5f5",
          border: "1px solid #feb2b2",
          borderRadius: "8px",
          marginTop: "2rem"
        }}>
          <h1 style={{ color: "#c53030", fontSize: "1.5rem", marginTop: 0 }}>
            Application Render Error
          </h1>
          <p style={{ color: "#2d3748", fontWeight: "bold" }}>
            {this.state.error?.message || "An unexpected error occurred during rendering."}
          </p>
          <pre style={{
            background: "#1a202c",
            color: "#fff",
            padding: "1rem",
            borderRadius: "4px",
            overflowX: "auto",
            fontFamily: "monospace",
            fontSize: "0.875rem"
          }}>
            {this.state.error?.stack || "No stack trace available"}
          </pre>
          <button
            onClick={this.handleClearAndReload}
            style={{
              background: "#c53030",
              color: "white",
              border: "none",
              padding: "0.5rem 1rem",
              borderRadius: "4px",
              fontWeight: "bold",
              cursor: "pointer"
            }}
          >
            Clear Cache & Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

initializeAuth();

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </Provider>
  </React.StrictMode>
);
