import { io } from "socket.io-client";
import { API_URL } from "./api";

export const SOCKET_URL =
  process.env.REACT_APP_SOCKET_URL ||
  API_URL.replace(/\/api\/?$/, "");

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ["websocket", "polling"]
    });
  }
  return socket;
};

export const connectSocket = (token) => {
  const instance = getSocket();
  if (!token) return instance;

  instance.auth = { token };
  if (!instance.connected) {
    instance.connect();
  }
  return instance;
};

export const disconnectSocket = () => {
  if (socket?.connected) {
    socket.disconnect();
  }
};
