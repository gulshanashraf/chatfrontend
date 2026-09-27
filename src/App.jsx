import { useEffect, useState } from "react";
import JoinGroup from "./components/JoinGroup.jsx";
import ChatRoom from "./components/ChatRoom.jsx";
import "./App.css";
import { io } from "socket.io-client";



const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "https://gulchatbackend-g62x.vercel.app";


function App() {
  const [joined, setJoined] = useState(false);

  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");

   

  const [socket, setSocket] = useState(null);

  // ==========================================================
  // CONNECT SOCKET
  // ==========================================================

  useEffect(() => {
    const newSocket = io(SOCKET_URL);

    setSocket(newSocket);

    // SIR'S CODE
    newSocket.on("connect", () => {
      console.log("Connected to server:", newSocket.id);
    });

    // SIR'S CODE
    newSocket.on("disconnect", () => {
      console.log("Disconnected from server");
    });

    // Extra useful error log
    newSocket.on("connect_error", (error) => {
      console.error(
        "Socket connection error:",
        error.message
      );
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // ==========================================================
  // LEAVE
  // ==========================================================

  const handleLeave = () => {
    setUsername("");
    setRoom("");
    setJoined(false);
  };

  // ==========================================================
  // JOIN GROUP
  // ==========================================================

  const handleJoin = ({ username, room }) => {
    const cleanUsername = username?.trim();
    const cleanRoom = room?.trim();

    if (!cleanUsername || !cleanRoom) {
      return;
    }

    setUsername(cleanUsername);
    setRoom(cleanRoom);

    
    if (socket) {
      socket.emit("join", cleanRoom);
    }

    setJoined(true);
  };

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <>
      {!joined ? (
        <JoinGroup onJoin={handleJoin} />
      ) : (
        <ChatRoom
          username={username}
          room={room}
          socket={socket}
          onLeave={handleLeave}
        />
      )}
    </>
  );
}

export default App;