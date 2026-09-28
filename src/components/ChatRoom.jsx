import { useEffect, useRef, useState } from "react";
import EmojiPicker from "emoji-picker-react";

const QUICK_EMOJIS = [
  "😀",
  "😂",
  "❤️",
  "👍",
  "😊",
  "😍",
  "🎉",
  "🔥",
  "😎",
  "🙌",
];

const MESSAGE_COLORS = [
  "bg-orange-100 border-orange-200",
  "bg-purple-100 border-purple-200",
  "bg-yellow-100 border-yellow-200",
  "bg-green-100 border-green-200",
  "bg-blue-100 border-blue-200",
  "bg-pink-100 border-pink-200",
];

const AVATAR_COLORS = [
  "#FCE7F3",
  "#E0F2FE",
  "#FEF3C7",
  "#DCFCE7",
  "#EDE9FE",
  "#FFEDD5",
];

const MAX_FILE_SIZE = 2 * 1024 * 1024;

const getInitial = (name = "") => {
  const cleanName = name.trim();
  return cleanName ? cleanName.charAt(0).toUpperCase() : "?";
};

const getAvatarColor = (name = "") => {
  let total = 0;

  for (let i = 0; i < name.length; i++) {
    total += name.charCodeAt(i);
  }

  return AVATAR_COLORS[total % AVATAR_COLORS.length];
};

const escapeRegExp = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const formatFileSize = (size = 0) => {
  if (!size) return "";

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDuration = (seconds = 0) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${String(mins).padStart(2, "0")}:${String(
    secs
  ).padStart(2, "0")}`;
};

// ============================================================
// LETTER AVATAR
// ============================================================

const InitialAvatar = ({
  name = "",
  small = false,
  large = false,
}) => {
  const initial = getInitial(name);
  const backgroundColor = getAvatarColor(name);

  let sizeClass = "w-11 h-11 text-base";

  if (small) {
    sizeClass = "w-9 h-9 text-sm";
  }

  if (large) {
    sizeClass = "w-12 h-12 text-lg";
  }

  return (
    <div
      className={`relative shrink-0 rounded-full flex items-center justify-center font-extrabold text-[#071F49] ring-2 ring-white shadow-sm ${sizeClass}`}
      style={{
        backgroundColor,
        boxShadow: "0 3px 10px rgba(7,31,73,0.12)",
      }}
    >
      {initial}
    </div>
  );
};

const ChatRoom = ({
  username,
  room,
  socket,
  onLeave,
}) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  const messagesEndRef = useRef(null);

  const [showEmojiPicker, setShowEmojiPicker] =
    useState(false);

  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState("");

  const searchInputRef = useRef(null);

  const [showMenu, setShowMenu] = useState(false);

  const [showGroupInfo, setShowGroupInfo] =
    useState(false);

  const [memberSearch, setMemberSearch] = useState("");

  const [deletedMessages, setDeletedMessages] =
    useState([]);

  const [selectedMessageIndex, setSelectedMessageIndex] =
    useState(null);

  // ============================================================
  // MEDIA FILES
  // ============================================================

  const [selectedFile, setSelectedFile] =
    useState(null);

  const fileInputRef = useRef(null);

  // ============================================================
  // VOICE RECORDING
  // ============================================================

  const [isRecording, setIsRecording] =
    useState(false);

  const [recordingTime, setRecordingTime] =
    useState(0);

  const [selectedVoice, setSelectedVoice] =
    useState(null);

  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const recordingTimeRef = useRef(0);

  // ============================================================
  // FAVORITE MESSAGES
  // ============================================================

  const [favoriteMessages, setFavoriteMessages] =
    useState([]);

  const [showFavoriteCard, setShowFavoriteCard] =
    useState(false);

  // ============================================================
  // MEMBERS
  // ============================================================

  const [members, setMembers] = useState(() => {
    const cleanUsername = username?.trim();

    return cleanUsername ? [cleanUsername] : [];
  });

  // ============================================================
  // ADD MEMBER
  // ============================================================

  const addMember = (memberName) => {
    const cleanName = memberName?.trim();

    if (!cleanName) {
      return;
    }

    setMembers((prev) => {
      const exists = prev.some(
        (member) =>
          member.toLowerCase() ===
          cleanName.toLowerCase()
      );

      if (exists) {
        return prev;
      }

      return [...prev, cleanName];
    });
  };

  // ============================================================
  // CURRENT TIME
  // ============================================================

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ============================================================
  // SYSTEM MESSAGE
  // ============================================================

  const createSystemMessage = (
    type,
    memberName,
    time
  ) => {
    return {
      type,
      username: memberName,
      time,
      room: room?.trim(),
    };
  };

  // ============================================================
  // SOCKET RECEIVE
  // ============================================================

  useEffect(() => {
    if (!socket || !room || !username) {
      return;
    }

    const cleanUsername = username.trim();
    const cleanRoom = room.trim();

    const handleMessage = (msg) => {
      if (!msg) {
        return;
      }

      const incomingUsername =
        msg?.username?.trim();

      if (msg.type === "user-joined") {
        if (incomingUsername) {
          addMember(incomingUsername);

          if (
            incomingUsername.toLowerCase() !==
            cleanUsername.toLowerCase()
          ) {
            setMessages((prev) => [
              ...prev,
              createSystemMessage(
                "user-joined-display",
                incomingUsername,
                msg.time || getCurrentTime()
              ),
            ]);

            socket.emit("send", {
              type: "member-present",
              username: cleanUsername,
              room: cleanRoom,
            });
          }
        }

        return;
      }

      if (msg.type === "member-present") {
        if (incomingUsername) {
          addMember(incomingUsername);
        }

        return;
      }

      if (msg.type === "user-left") {
        if (incomingUsername) {
          setMembers((prev) =>
            prev.filter(
              (member) =>
                member.toLowerCase() !==
                incomingUsername.toLowerCase()
            )
          );

          setMessages((prev) => [
            ...prev,
            createSystemMessage(
              "user-left-display",
              incomingUsername,
              msg.time || getCurrentTime()
            ),
          ]);
        }

        return;
      }

      setMessages((prev) => [...prev, msg]);

      if (incomingUsername) {
        addMember(incomingUsername);
      }
    };

    socket.on("message", handleMessage);

    const joinRoomAndAnnounce = () => {
      socket.emit("join", cleanRoom);

      addMember(cleanUsername);

      socket.emit("send", {
        type: "user-joined",
        username: cleanUsername,
        room: cleanRoom,
        time: getCurrentTime(),
      });

      console.log(
        `Joined room: ${cleanRoom} as ${cleanUsername}`
      );
    };

    if (socket.connected) {
      joinRoomAndAnnounce();
    }

    socket.on("connect", joinRoomAndAnnounce);

    return () => {
      socket.off("message", handleMessage);
      socket.off("connect", joinRoomAndAnnounce);
    };
  }, [socket, room, username]);

  // ============================================================
  // AUTO SCROLL
  // ============================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // ============================================================
  // SEARCH INPUT
  // ============================================================

  useEffect(() => {
    if (showSearch) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [showSearch]);

  // ============================================================
  // HIGHLIGHT SEARCH
  // ============================================================

  const renderHighlightedText = (text = "") => {
    if (!searchText.trim()) {
      return text;
    }

    const safeSearch = escapeRegExp(
      searchText.trim()
    );

    const parts = text.split(
      new RegExp(`(${safeSearch})`, "gi")
    );

    return parts.map((part, index) => {
      const isMatch =
        part.toLowerCase() ===
        searchText.trim().toLowerCase();

      if (isMatch) {
        return (
          <mark
            key={index}
            className="bg-yellow-300 text-[#071F49] rounded px-0.5 underline decoration-2"
          >
            {part}
          </mark>
        );
      }

      return <span key={index}>{part}</span>;
    });
  };

  // ============================================================
  // MESSAGE SENDING
  // ============================================================

  const handleSend = (e) => {
    e.preventDefault();

    if (!socket) {
      console.error("Socket is not available.");
      return;
    }

    if (!socket.connected) {
      console.error("Socket is not connected.");
      return;
    }

    if (
      !message.trim() &&
      !selectedFile &&
      !selectedVoice
    ) {
      return;
    }

    const currentTime = getCurrentTime();

    const cleanUsername =
      username?.trim() || "You";

    const cleanRoom = room?.trim();

    const newMessage = {
      text: message.trim(),
      room: cleanRoom,
      username: cleanUsername,
      time: currentTime,
    };

    // ============================================================
    // MEDIA FILE
    // ============================================================

    if (selectedFile) {
      newMessage.fileName =
        selectedFile.name;

      newMessage.fileType =
        selectedFile.type;

      newMessage.fileData =
        selectedFile.data;

      newMessage.fileSize =
        selectedFile.size;
    }

    // ============================================================
    // VOICE MESSAGE
    // ============================================================

    if (selectedVoice) {
      newMessage.voiceData =
        selectedVoice.data;

      newMessage.voiceType =
        selectedVoice.type;

      newMessage.voiceSize =
        selectedVoice.size;

      newMessage.voiceDuration =
        selectedVoice.duration;
    }

    try {
      socket.emit("send", newMessage);

      console.log(
        "Message sent:",
        newMessage
      );

      setMessages((prev) => [
        ...prev,
        newMessage,
      ]);

      addMember(cleanUsername);

      setMessage("");
      setSelectedFile(null);
      setSelectedVoice(null);
      setShowEmojiPicker(false);
      setSelectedMessageIndex(null);
    } catch (error) {
      console.error(
        "Message sending error:",
        error
      );

      alert(
        "Message could not be sent."
      );
    }
  };

  // ============================================================
  // EMOJI
  // ============================================================

  const handleEmojiClick = (emojiData) => {
    setMessage(
      (prev) => prev + emojiData.emoji
    );
  };

  const addQuickEmoji = (emoji) => {
    setMessage(
      (prev) => prev + emoji
    );
  };

  // ============================================================
  // MEDIA FILE SELECT
  // ============================================================

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      alert(
        "Please select a file smaller than 2 MB."
      );

      e.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (
        typeof reader.result !==
        "string"
      ) {
        alert(
          "Unable to read this file."
        );

        return;
      }

      setSelectedFile({
        name: file.name,
        type:
          file.type ||
          "application/octet-stream",
        data: reader.result,
        size: file.size,
      });

      setSelectedVoice(null);
    };

    reader.onerror = () => {
      console.error(
        "File reading failed."
      );

      alert(
        "Unable to read this file."
      );
    };

    reader.readAsDataURL(file);

    e.target.value = "";
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
  };

  // ============================================================
  // VOICE RECORDING
  // ============================================================

  const clearRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearInterval(
        recordingTimerRef.current
      );

      recordingTimerRef.current = null;
    }
  };

  const stopMediaStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current
        .getTracks()
        .forEach((track) => {
          track.stop();
        });

      mediaStreamRef.current = null;
    }
  };

  const startVoiceRecording = async () => {
    if (isRecording) {
      return;
    }

    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      alert(
        "Voice recording is not supported in this browser."
      );

      return;
    }

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      mediaStreamRef.current =
        stream;

      audioChunksRef.current = [];
      recordingTimeRef.current = 0;

      setRecordingTime(0);
      setSelectedVoice(null);
      setSelectedFile(null);
      setIsRecording(true);

      let mimeType = "";

      if (
        typeof MediaRecorder !==
        "undefined"
      ) {
        if (
          MediaRecorder.isTypeSupported(
            "audio/webm;codecs=opus"
          )
        ) {
          mimeType =
            "audio/webm;codecs=opus";
        } else if (
          MediaRecorder.isTypeSupported(
            "audio/webm"
          )
        ) {
          mimeType =
            "audio/webm";
        } else if (
          MediaRecorder.isTypeSupported(
            "audio/mp4"
          )
        ) {
          mimeType =
            "audio/mp4";
        }
      }

      const recorder = mimeType
        ? new MediaRecorder(
            stream,
            { mimeType }
          )
        : new MediaRecorder(
            stream
          );

      mediaRecorderRef.current =
        recorder;

      recorder.ondataavailable = (
        event
      ) => {
        if (event.data?.size) {
          audioChunksRef.current.push(
            event.data
          );
        }
      };

      recorder.onstop = () => {
        const finalType =
          recorder.mimeType ||
          mimeType ||
          "audio/webm";

        const blob = new Blob(
          audioChunksRef.current,
          {
            type: finalType,
          }
        );

        if (blob.size > MAX_FILE_SIZE) {
          alert(
            "Voice message is larger than 2 MB."
          );

          audioChunksRef.current =
            [];

          setSelectedVoice(null);
          stopMediaStream();

          return;
        }

        const reader =
          new FileReader();

        reader.onloadend = () => {
          if (
            typeof reader.result ===
            "string"
          ) {
            setSelectedVoice({
              name: `voice-${Date.now()}.webm`,
              type: finalType,
              data: reader.result,
              size: blob.size,
              duration:
                recordingTimeRef.current,
            });
          }

          stopMediaStream();
        };

        reader.readAsDataURL(blob);

        clearRecordingTimer();
        setIsRecording(false);
      };

      recorder.onerror = () => {
        clearRecordingTimer();
        stopMediaStream();
        setIsRecording(false);

        alert(
          "Voice recording failed."
        );
      };

      recorder.start();

      recordingTimerRef.current =
        setInterval(() => {
          recordingTimeRef.current += 1;

          setRecordingTime(
            recordingTimeRef.current
          );
        }, 1000);
    } catch (error) {
      console.error(
        "Microphone error:",
        error
      );

      clearRecordingTimer();
      stopMediaStream();
      setIsRecording(false);

      alert(
        "Please allow microphone permission to record voice."
      );
    }
  };

  const stopVoiceRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !==
        "inactive"
    ) {
      mediaRecorderRef.current.stop();
    } else {
      clearRecordingTimer();
      stopMediaStream();
      setIsRecording(false);
    }
  };

  const cancelVoiceRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !==
        "inactive"
    ) {
      mediaRecorderRef.current.ondataavailable =
        null;

      mediaRecorderRef.current.onstop =
        null;

      mediaRecorderRef.current.stop();
    }

    clearRecordingTimer();
    stopMediaStream();

    audioChunksRef.current = [];
    mediaRecorderRef.current = null;

    recordingTimeRef.current = 0;

    setRecordingTime(0);
    setIsRecording(false);
    setSelectedVoice(null);
  };

  const removeSelectedVoice = () => {
    setSelectedVoice(null);
  };

  useEffect(() => {
    return () => {
      clearRecordingTimer();
      stopMediaStream();
    };
  }, []);

  // ============================================================
  // BLOB
  // ============================================================

  const createBlobFromData = (
    fileData,
    fileType
  ) => {
    if (!fileData) {
      return null;
    }

    const parts =
      fileData.split(",");

    if (parts.length < 2) {
      return null;
    }

    const base64Data =
      parts[1];

    const byteCharacters =
      atob(base64Data);

    const byteNumbers =
      new Array(
        byteCharacters.length
      );

    for (
      let i = 0;
      i < byteCharacters.length;
      i++
    ) {
      byteNumbers[i] =
        byteCharacters.charCodeAt(i);
    }

    const byteArray =
      new Uint8Array(
        byteNumbers
      );

    return new Blob(
      [byteArray],
      {
        type:
          fileType ||
          "application/octet-stream",
      }
    );
  };

  // ============================================================
  // MEDIA OPEN
  // ============================================================

  const openMediaInNewTab = (
    fileData,
    fileType,
    fileName
  ) => {
    if (!fileData) {
      alert(
        "File data is not available."
      );

      return;
    }

    try {
      const blob =
        createBlobFromData(
          fileData,
          fileType
        );

      if (!blob) {
        alert(
          "Unable to open this file."
        );

        return;
      }

      const blobUrl =
        URL.createObjectURL(
          blob
        );

      const canPreview =
        fileType?.startsWith(
          "image/"
        ) ||
        fileType?.startsWith(
          "video/"
        ) ||
        fileType?.startsWith(
          "audio/"
        ) ||
        fileType ===
          "application/pdf" ||
        fileType ===
          "text/plain";

      if (canPreview) {
        const newTab =
          window.open(
            blobUrl,
            "_blank"
          );

        if (!newTab) {
          URL.revokeObjectURL(
            blobUrl
          );

          alert(
            "Please allow pop-ups for this chat."
          );

          return;
        }

        newTab.focus();

        setTimeout(() => {
          URL.revokeObjectURL(
            blobUrl
          );
        }, 60000);

        return;
      }

      const link =
        document.createElement(
          "a"
        );

      link.href = blobUrl;
      link.download =
        fileName ||
        "file";

      document.body.appendChild(
        link
      );

      link.click();

      document.body.removeChild(
        link
      );

      setTimeout(() => {
        URL.revokeObjectURL(
          blobUrl
        );
      }, 1000);
    } catch (error) {
      console.error(
        "File open error:",
        error
      );

      alert(
        "Unable to open this file."
      );
    }
  };

  // ============================================================
  // DOWNLOAD
  // ============================================================

  const downloadDocument = (
    fileData,
    fileType,
    fileName
  ) => {
    if (!fileData) {
      alert(
        "File data is not available."
      );

      return;
    }

    try {
      const blob =
        createBlobFromData(
          fileData,
          fileType
        );

      if (!blob) {
        alert(
          "Unable to download this file."
        );

        return;
      }

      const blobUrl =
        URL.createObjectURL(
          blob
        );

      const link =
        document.createElement(
          "a"
        );

      link.href = blobUrl;
      link.download =
        fileName ||
        "file";

      document.body.appendChild(
        link
      );

      link.click();

      document.body.removeChild(
        link
      );

      setTimeout(() => {
        URL.revokeObjectURL(
          blobUrl
        );
      }, 1000);
    } catch (error) {
      console.error(
        "Download error:",
        error
      );

      alert(
        "Unable to download this file."
      );
    }
  };

  // ============================================================
  // MESSAGE ACTIONS
  // ============================================================

  const selectMessageForActions = (
    messageIndex
  ) => {
    setSelectedMessageIndex((prev) =>
      prev === messageIndex
        ? null
        : messageIndex
    );
  };

  const handleDeleteMessage = (
    messageIndex
  ) => {
    setDeletedMessages((prev) => {
      if (prev.includes(messageIndex)) {
        return prev;
      }

      return [...prev, messageIndex];
    });

    setFavoriteMessages((prev) =>
      prev.filter(
        (index) => index !== messageIndex
      )
    );

    setSelectedMessageIndex(null);
  };

  const toggleFavoriteMessage = (
    messageIndex
  ) => {
    setFavoriteMessages((prev) => {
      if (prev.includes(messageIndex)) {
        return prev.filter(
          (index) =>
            index !== messageIndex
        );
      }

      return [
        ...prev,
        messageIndex,
      ];
    });

    setSelectedMessageIndex(null);
  };

  // ============================================================
  // MENU
  // ============================================================

  const openFavoriteChat = () => {
    setShowMenu(false);
    setShowFavoriteCard(true);
  };

  const openGroupInfo = () => {
    setShowMenu(false);
    setShowGroupInfo(true);
  };

  const openSearch = () => {
    setShowMenu(false);
    setShowSearch(true);
  };

  // ============================================================
  // LEAVE GROUP
  // ============================================================

  const handleLeaveGroup = () => {
    const cleanUsername =
      username?.trim();

    const cleanRoom =
      room?.trim();

    if (
      socket &&
      socket.connected &&
      cleanUsername &&
      cleanRoom
    ) {
      socket.emit("send", {
        type: "user-left",
        username: cleanUsername,
        room: cleanRoom,
        time: getCurrentTime(),
      });
    }

    setShowMenu(false);

    if (onLeave) {
      onLeave();
    }
  };

  // ============================================================
  // FILTER MEMBERS
  // ============================================================

  const filteredMembers = [...members].sort(
    (a, b) => {
      if (!memberSearch.trim()) {
        return 0;
      }

      const search =
        memberSearch.toLowerCase();

      const aMatch = a
        .toLowerCase()
        .includes(search);

      const bMatch = b
        .toLowerCase()
        .includes(search);

      if (aMatch && !bMatch) {
        return -1;
      }

      if (!aMatch && bMatch) {
        return 1;
      }

      return 0;
    }
  );

  const hasMessage =
    message.trim().length > 0;

  const canSend =
    hasMessage ||
    selectedFile ||
    selectedVoice;

  // ============================================================
  // HEADER
  // ============================================================

  const headerMembers =
    members.slice(0, 4);

  const headerMemberText =
    headerMembers.length > 0
      ? `${headerMembers.join(", ")}${
          members.length > 4
            ? "..."
            : ""
        }`
      : "No members yet";

  // ============================================================
  // FAVORITE LIST
  // ============================================================

  const favoriteMessageItems =
    favoriteMessages
      .filter(
        (index) =>
          !deletedMessages.includes(index) &&
          messages[index]
      )
      .map((index) => ({
        ...messages[index],
        originalIndex: index,
      }));

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="h-screen w-full flex flex-col bg-[#FFF7ED] overflow-hidden">

      <style>{`
        @keyframes voiceMove {
          0% {
            transform: translateX(120%);
            opacity: 0.25;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateX(-120%);
            opacity: 0.25;
          }
        }

        @keyframes voiceBars {
          0%, 100% {
            transform: scaleY(0.45);
          }
          50% {
            transform: scaleY(1);
          }
        }
      `}</style>

      {/* ========================================================
          HEADER
      ======================================================== */}

      <header className="shrink-0 bg-[#F97316] text-white shadow-md z-40">

        <div className="w-full px-4 sm:px-6 py-3 flex items-center justify-between gap-4">

          <div className="flex items-center gap-3 min-w-0">

            <InitialAvatar
              name={room}
              large
            />

            <div className="min-w-0">

              <span className="block text-[10px] sm:text-xs font-bold uppercase tracking-[0.18em] text-orange-100">
                GROUP
              </span>

              <h2 className="text-lg sm:text-xl font-extrabold truncate leading-tight">
                {room}
              </h2>

              <p className="text-xs text-orange-100 truncate mt-0.5">
                {headerMemberText}
              </p>

            </div>

          </div>

          <div className="flex items-center gap-1 shrink-0">

            {showSearch && (
              <div className="flex items-center w-[180px] sm:w-[220px] h-9 rounded-lg bg-white/95 px-2 mr-1">

                <svg
                  className="shrink-0 text-slate-400"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle
                    cx="11"
                    cy="11"
                    r="7"
                  />
                  <path d="m20 20-3.5-3.5" />
                </svg>

                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchText}
                  onChange={(e) =>
                    setSearchText(
                      e.target.value
                    )
                  }
                  placeholder="Search..."
                  className="w-full min-w-0 bg-transparent text-sm text-[#071F49] placeholder:text-slate-400 pl-2 outline-none"
                />

                {searchText && (
                  <button
                    type="button"
                    onClick={() =>
                      setSearchText("")
                    }
                    className="shrink-0 text-slate-400 hover:text-[#071F49]"
                  >
                    ✕
                  </button>
                )}

              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setShowSearch(
                  (prev) => !prev
                );

                setShowMenu(false);
              }}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
                showSearch
                  ? "bg-white/25"
                  : "hover:bg-white/15"
              }`}
              aria-label="Search messages"
              title="Search"
            >
              <svg
                width="21"
                height="21"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle
                  cx="11"
                  cy="11"
                  r="7"
                />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </button>

            <div className="relative">

              <button
                type="button"
                onClick={() =>
                  setShowMenu(
                    (prev) => !prev
                  )
                }
                className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
                  showMenu
                    ? "bg-white/25"
                    : "hover:bg-white/15"
                }`}
                aria-label="More options"
                title="More"
              >
                <span className="text-2xl leading-none font-bold tracking-[2px]">
                  ⋮
                </span>
              </button>

              {showMenu && (
                <div className="absolute right-0 top-12 w-56 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden text-[#071F49] z-50">

                  <button
                    type="button"
                    onClick={openGroupInfo}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-orange-50 transition text-left"
                  >
                    <span className="text-lg">
                      👥
                    </span>
                    <span>
                      Group Info
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={openSearch}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-orange-50 transition text-left"
                  >
                    <span className="text-lg">
                      🔍
                    </span>
                    <span>
                      Search
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={
                      openFavoriteChat
                    }
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-orange-50 transition text-left"
                  >
                    <span className="text-lg text-red-500">
                      ♥
                    </span>
                    <span>
                      Favorite Chat
                    </span>
                  </button>

                  <div className="h-px bg-slate-100" />

                  <button
                    type="button"
                    onClick={
                      handleLeaveGroup
                    }
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition text-left font-semibold"
                  >
                    <span className="text-lg">
                      ↪
                    </span>
                    <span>
                      Leave Group
                    </span>
                  </button>

                </div>
              )}

            </div>

          </div>
        </div>
      </header>

      {/* ========================================================
          MESSAGES
      ======================================================== */}

      <main
        className="flex-1 overflow-y-auto px-3 sm:px-6 py-5"
        onClick={() => {
          setSelectedMessageIndex(null);
        }}
      >

        {messages.length === 0 ? (

          <div className="h-full flex flex-col items-center justify-center text-center">

            <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center text-3xl mb-3">
              💬
            </div>

            <h3 className="text-lg font-semibold text-[#071F49]">
              No messages yet
            </h3>

            <p className="text-sm text-slate-400 mt-1">
              Send a message to start the
              conversation 👋
            </p>

          </div>

        ) : (

          <div className="space-y-4">

            {messages.map(
              (msg, idx) => {

                if (
                  deletedMessages.includes(
                    idx
                  )
                ) {
                  return null;
                }

                if (
                  msg?.type ===
                  "user-joined-display"
                ) {
                  return (
                    <div
                      key={`system-join-${idx}`}
                      className="flex justify-center py-1"
                    >
                      <div className="px-4 py-2 rounded-full bg-slate-200/80 text-slate-500 text-xs font-medium text-center shadow-sm">
                        <span className="font-semibold text-slate-600">
                          {msg.username}
                        </span>{" "}
                        joined the group
                        <span className="mx-1.5 text-slate-400">
                          •
                        </span>
                        {msg.time}
                      </div>
                    </div>
                  );
                }

                if (
                  msg?.type ===
                  "user-left-display"
                ) {
                  return (
                    <div
                      key={`system-left-${idx}`}
                      className="flex justify-center py-1"
                    >
                      <div className="px-4 py-2 rounded-full bg-slate-200/80 text-slate-500 text-xs font-medium text-center shadow-sm">
                        <span className="font-semibold text-slate-600">
                          {msg.username}
                        </span>{" "}
                        left the group
                        <span className="mx-1.5 text-slate-400">
                          •
                        </span>
                        {msg.time}
                      </div>
                    </div>
                  );
                }

                const isOwn =
                  msg?.username
                    ?.trim()
                    .toLowerCase() ===
                  username
                    ?.trim()
                    .toLowerCase();

                const messageColor =
                  MESSAGE_COLORS[
                    idx %
                      MESSAGE_COLORS.length
                  ];

                const isSelected =
                  selectedMessageIndex ===
                  idx;

                const isFavorite =
                  favoriteMessages.includes(
                    idx
                  );

                const isImage =
                  msg.fileType?.startsWith(
                    "image/"
                  );

                const isVideo =
                  msg.fileType?.startsWith(
                    "video/"
                  );

                const isAudio =
                  msg.fileType?.startsWith(
                    "audio/"
                  );

                return (
                  <div
                    key={idx}
                    className={`flex flex-col max-w-[95%] sm:max-w-[75%] ${
                      isOwn
                        ? "ml-auto items-end"
                        : "mr-auto items-start"
                    }`}
                    onClick={(e) =>
                      e.stopPropagation()
                    }
                  >

                    <span className="text-xs font-semibold text-slate-500 mb-1 px-1">
                      {isOwn
                        ? "You"
                        : msg.username}
                    </span>

                    <div
                      className={`flex items-center gap-2 ${
                        isOwn
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >

                      {isSelected && (
                        <div className="flex items-center gap-1.5 shrink-0">

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();

                              toggleFavoriteMessage(
                                idx
                              );
                            }}
                            className={`w-9 h-9 rounded-full border shadow-md flex items-center justify-center transition ${
                              isFavorite
                                ? "bg-red-50 border-red-200 text-red-500"
                                : "bg-slate-100/95 border-slate-200 text-slate-400 hover:bg-slate-200 hover:text-red-500"
                            }`}
                            title={
                              isFavorite
                                ? "Remove from favorites"
                                : "Favorite message"
                            }
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill={
                                isFavorite
                                  ? "currentColor"
                                  : "none"
                              }
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();

                              handleDeleteMessage(
                                idx
                              );
                            }}
                            className="w-9 h-9 rounded-full bg-slate-100/95 border border-slate-200 text-slate-400 shadow-md flex items-center justify-center hover:bg-slate-200 hover:text-red-500 transition"
                            title="Delete message"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M3 6h18" />
                              <path d="M8 6V4h8v2" />
                              <path d="M19 6l-1 15H6L5 6" />
                              <path d="M10 11v6" />
                              <path d="M14 11v6" />
                            </svg>
                          </button>

                        </div>
                      )}

                      <div
                        className="relative"
                        onClick={() =>
                          selectMessageForActions(
                            idx
                          )
                        }
                      >

                        <div
                          className={`relative px-4 py-3 pr-16 rounded-2xl border shadow-sm ${messageColor} ${
                            isOwn
                              ? "rounded-br-sm"
                              : "rounded-bl-sm"
                          } ${
                            isSelected
                              ? "ring-2 ring-orange-300 ring-offset-1"
                              : ""
                          }`}
                        >

                          {msg.text && (
                            <p className="text-[#071F49] break-words whitespace-pre-wrap">
                              {renderHighlightedText(
                                msg.text
                              )}
                            </p>
                          )}

                          {/* MEDIA */}

                          {msg.fileData && (
                            <div
                              className={`${
                                msg.text
                                  ? "mt-3"
                                  : ""
                              } rounded-xl bg-white/90 border border-slate-200 p-3 min-w-[240px] max-w-[320px]`}
                              onClick={(e) =>
                                e.stopPropagation()
                              }
                            >

                              {isImage && (
                                <img
                                  src={msg.fileData}
                                  alt={
                                    msg.fileName ||
                                    "Image"
                                  }
                                  className="w-full max-h-64 object-cover rounded-lg border border-slate-200 mb-3 cursor-pointer"
                                  onClick={() =>
                                    openMediaInNewTab(
                                      msg.fileData,
                                      msg.fileType,
                                      msg.fileName
                                    )
                                  }
                                />
                              )}

                              {isVideo && (
                                <video
                                  src={msg.fileData}
                                  controls
                                  className="w-full max-h-64 rounded-lg border border-slate-200 mb-3 bg-black"
                                />
                              )}

                              {!isImage &&
                                !isVideo && (
                                  <div className="flex items-center gap-3">

                                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">

                                      <svg
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="#F97316"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      >
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <path d="M14 2v6h6" />
                                      </svg>

                                    </div>

                                    <div className="min-w-0 flex-1">

                                      <p className="font-semibold text-sm text-[#071F49] truncate">
                                        {msg.fileName ||
                                          "File"}
                                      </p>

                                      <p className="text-xs text-slate-400">
                                        {msg.fileType ||
                                          "File"}
                                      </p>

                                    </div>

                                  </div>
                              )}

                              {isImage && (
                                <p className="font-semibold text-xs text-[#071F49] truncate mb-2">
                                  {msg.fileName ||
                                    "Image"}
                                </p>
                              )}

                              {isVideo && (
                                <p className="font-semibold text-xs text-[#071F49] truncate mb-2">
                                  {msg.fileName ||
                                    "Video"}
                                </p>
                              )}

                              <div className="grid grid-cols-2 gap-2 mt-2">

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();

                                    openMediaInNewTab(
                                      msg.fileData,
                                      msg.fileType,
                                      msg.fileName
                                    );
                                  }}
                                  className="rounded-lg bg-[#F97316] hover:bg-orange-600 text-white text-xs font-semibold py-2 transition"
                                >
                                  Open
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();

                                    downloadDocument(
                                      msg.fileData,
                                      msg.fileType,
                                      msg.fileName
                                    );
                                  }}
                                  className="rounded-lg bg-[#071F49] hover:bg-[#0b2d63] text-white text-xs font-semibold py-2 transition"
                                >
                                  Download
                                </button>

                              </div>

                            </div>
                          )}

                          {/* VOICE */}

                          {msg.voiceData && (
                            <div
                              className={`${
                                msg.text ||
                                msg.fileData
                                  ? "mt-3"
                                  : ""
                              } rounded-xl bg-white/90 border border-slate-200 p-3 min-w-[250px]`}
                              onClick={(e) =>
                                e.stopPropagation()
                              }
                            >

                              <div className="flex items-center gap-2 mb-2">

                                <div className="w-9 h-9 rounded-full bg-orange-100 text-[#F97316] flex items-center justify-center shrink-0">
                                  🎙️
                                </div>

                                <div className="min-w-0">

                                  <p className="text-xs font-bold text-[#071F49]">
                                    Voice message
                                  </p>

                                  <p className="text-[10px] text-slate-400">
                                    {formatDuration(
                                      msg.voiceDuration
                                    )}
                                  </p>

                                </div>

                              </div>

                              <audio
                                controls
                                src={msg.voiceData}
                                className="w-full h-9"
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  downloadDocument(
                                    msg.voiceData,
                                    msg.voiceType ||
                                      "audio/webm",
                                    `voice-${idx}.webm`
                                  )
                                }
                                className="w-full mt-2 rounded-lg bg-[#071F49] hover:bg-[#0b2d63] text-white text-xs font-semibold py-2 transition"
                              >
                                Download Voice
                              </button>

                            </div>
                          )}

                          <div className="absolute right-2 bottom-1.5">

                            <span className="text-[10px] font-medium text-slate-500">
                              {msg.time}
                            </span>

                          </div>

                        </div>

                      </div>

                    </div>

                  </div>
                );
              }
            )}

            <div ref={messagesEndRef} />

          </div>
        )}

      </main>

      {/* ========================================================
          COMPOSER
      ======================================================== */}

      <footer className="shrink-0 bg-white border-t border-orange-100 px-3 sm:px-6 py-3 relative">

        {showEmojiPicker && (
          <div className="absolute bottom-full left-3 mb-2 z-50 shadow-xl rounded-xl overflow-hidden">

            <EmojiPicker
              onEmojiClick={
                handleEmojiClick
              }
              width={300}
              height={350}
              previewConfig={{
                showPreview: false,
              }}
            />

          </div>
        )}

        {/* QUICK EMOJIS */}

        <div className="flex gap-1.5 overflow-x-auto pb-2">

          {QUICK_EMOJIS.map(
            (emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() =>
                  addQuickEmoji(emoji)
                }
                className="shrink-0 h-8 w-8 rounded-lg hover:bg-orange-100 transition text-lg"
              >
                {emoji}
              </button>
            )
          )}

        </div>

        {/* SELECTED FILE */}

        {selectedFile && (
          <div className="mb-2 flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2">

            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0 text-xl">

              {selectedFile.type?.startsWith(
                "image/"
              )
                ? "🖼️"
                : selectedFile.type?.startsWith(
                    "video/"
                  )
                ? "🎥"
                : "📄"}

            </div>

            <div className="min-w-0 flex-1">

              <p className="text-sm font-semibold text-[#071F49] truncate">
                {selectedFile.name}
              </p>

              <p className="text-xs text-slate-400">
                {formatFileSize(
                  selectedFile.size
                )}{" "}
                • Ready to send
              </p>

            </div>

            <button
              type="button"
              onClick={
                removeSelectedFile
              }
              className="w-8 h-8 rounded-lg hover:bg-white text-slate-400 hover:text-red-600 transition"
              title="Remove file"
            >
              ✕
            </button>

          </div>
        )}

        {/* SELECTED VOICE */}

        {selectedVoice && !isRecording && (
          <div className="mb-2 flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2">

            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-[#F97316] shrink-0">
              🎙️
            </div>

            <div className="min-w-0 flex-1">

              <p className="text-sm font-semibold text-[#071F49]">
                Voice message
              </p>

              <p className="text-xs text-slate-400">
                {formatDuration(
                  selectedVoice.duration
                )}{" "}
                • Ready to send
              </p>

            </div>

            <audio
              controls
              src={selectedVoice.data}
              className="w-[150px] h-8 hidden sm:block"
            />

            <button
              type="button"
              onClick={
                removeSelectedVoice
              }
              className="w-8 h-8 rounded-lg hover:bg-white text-slate-400 hover:text-red-600 transition"
              title="Remove voice"
            >
              ✕
            </button>

          </div>
        )}

        {/* FORM */}

        <form
          onSubmit={handleSend}
          className="flex items-center gap-2"
        >

          {/* EMOJI */}

          <button
            type="button"
            onClick={() =>
              setShowEmojiPicker(
                (prev) => !prev
              )
            }
            className="shrink-0 w-10 h-10 rounded-xl bg-orange-100 hover:bg-orange-200 text-xl transition"
            aria-label="Open emoji picker"
            title="Emoji"
          >
            😊
          </button>

          {/* ATTACHMENT */}

          <button
            type="button"
            onClick={() =>
              fileInputRef.current?.click()
            }
            className="shrink-0 w-10 h-10 rounded-xl bg-orange-100 hover:bg-orange-200 text-[#F97316] flex items-center justify-center transition"
            aria-label="Attach file"
            title="Photo, Video or Document"
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 1 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
            onChange={
              handleFileChange
            }
            className="hidden"
          />

          {/* ONE INPUT BOX + VOICE */}

          <div className="relative flex-1 min-w-0">

            {isRecording ? (

              <div className="relative w-full h-11 rounded-xl border-2 border-[#F97316] bg-orange-50 overflow-hidden flex items-center px-3">

                <button
                  type="button"
                  onClick={
                    cancelVoiceRecording
                  }
                  className="relative z-20 shrink-0 w-8 h-8 rounded-full bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center font-bold"
                  title="Cancel recording"
                >
                  ✕
                </button>

                <div className="relative flex-1 h-full flex items-center px-3 overflow-hidden">

                  <div
                    className="absolute left-0 right-0 h-1 rounded-full bg-orange-100 overflow-hidden"
                  >
                    <div
                      className="absolute w-24 h-1 rounded-full bg-[#F97316]"
                      style={{
                        animation:
                          "voiceMove 1.2s linear infinite",
                      }}
                    />
                  </div>

                  <div className="relative z-10 flex items-center gap-2 bg-orange-50/90 pr-2">

                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />

                    <span className="text-sm font-semibold text-[#071F49]">
                      Recording
                    </span>

                    <span className="text-xs font-bold text-[#F97316]">
                      {formatDuration(
                        recordingTime
                      )}
                    </span>

                  </div>

                  <div className="absolute right-2 flex items-center gap-1 h-7">

                    {[4, 7, 10, 6, 9, 5, 8].map(
                      (height, index) => (
                        <span
                          key={index}
                          className="w-1 rounded-full bg-[#F97316]"
                          style={{
                            height: `${height * 2}px`,
                            animation:
                              `voiceBars 0.7s ease-in-out ${
                                index * 0.08
                              }s infinite`,
                          }}
                        />
                      )
                    )}

                  </div>

                </div>

                <button
                  type="button"
                  onClick={
                    stopVoiceRecording
                  }
                  className="relative z-20 shrink-0 w-9 h-9 rounded-full bg-[#F97316] hover:bg-orange-600 text-white flex items-center justify-center shadow-sm"
                  title="Stop recording"
                >
                  <span className="w-3.5 h-3.5 rounded-sm bg-white" />
                </button>

              </div>

            ) : (

              <div className="relative w-full">

                <input
                  type="text"
                  placeholder={
                    selectedVoice
                      ? "Voice message ready..."
                      : "Type a message..."
                  }
                  value={message}
                  onChange={(e) =>
                    setMessage(
                      e.target.value
                    )
                  }
                  disabled={
                    !!selectedVoice
                  }
                  className="w-full h-11 rounded-xl border-2 border-orange-300 bg-orange-50/30 pl-4 pr-14 py-2.5 text-[#071F49] placeholder:text-slate-400 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 focus:bg-white transition disabled:cursor-default disabled:text-slate-500"
                  autoFocus
                />

                {/* MIC INSIDE INPUT */}

                <button
                  type="button"
                  onClick={
                    startVoiceRecording
                  }
                  disabled={
                    !!selectedVoice
                  }
                  className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center transition ${
                    selectedVoice
                      ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                      : "bg-orange-100 text-[#F97316] hover:bg-orange-200"
                  }`}
                  title="Record voice"
                  aria-label="Record voice"
                >
                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect
                      x="9"
                      y="2"
                      width="6"
                      height="12"
                      rx="3"
                    />
                    <path d="M5 10a7 7 0 0 0 14 0" />
                    <path d="M12 19v3" />
                    <path d="M8 22h8" />
                  </svg>
                </button>

              </div>

            )}

          </div>

          {/* SEND */}

          <button
            type="submit"
            disabled={!canSend || isRecording}
            className={`shrink-0 px-5 py-2.5 rounded-xl text-white font-semibold shadow-sm transition ${
              canSend && !isRecording
                ? "bg-[#F97316] hover:bg-orange-600"
                : "bg-orange-200 cursor-not-allowed"
            }`}
          >
            Send
          </button>

        </form>

      </footer>

      {/* ========================================================
          GROUP INFO
      ======================================================== */}

      {showGroupInfo && (
        <div
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() =>
            setShowGroupInfo(false)
          }
        >

          <div
            className="w-full max-w-md max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="bg-[#F97316] text-white px-5 py-4 flex items-center justify-between">

              <h3 className="text-lg font-bold">
                Group Info
              </h3>

              <button
                type="button"
                onClick={() =>
                  setShowGroupInfo(false)
                }
                className="w-9 h-9 rounded-full hover:bg-white/15 flex items-center justify-center text-xl"
              >
                ✕
              </button>

            </div>

            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">

              <InitialAvatar
                name={room}
                large
              />

              <div className="min-w-0">

                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-orange-500">
                  GROUP
                </p>

                <h4 className="text-base font-bold text-[#071F49] truncate">
                  {room}
                </h4>

                <p className="text-xs text-slate-400">
                  {members.length}{" "}
                  {members.length === 1
                    ? "member"
                    : "members"}
                </p>

              </div>

            </div>

            <div className="p-4 border-b border-slate-100">

              <div className="relative">

                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle
                    cx="11"
                    cy="11"
                    r="7"
                  />
                  <path d="m20 20-3.5-3.5" />
                </svg>

                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) =>
                    setMemberSearch(
                      e.target.value
                    )
                  }
                  placeholder="Search members..."
                  className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-10 py-2.5 text-[#071F49] placeholder:text-slate-400 outline-none focus:border-orange-400 focus:bg-white transition"
                />

              </div>

            </div>

            <div className="px-4 py-3">

              <div className="flex items-center justify-between mb-2">

                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Members
                </p>

                <span className="text-xs font-semibold text-orange-500">
                  {members.length}
                </span>

              </div>

              <div className="max-h-[48vh] overflow-y-auto">

                {filteredMembers.map(
                  (member, index) => {
                    const isCurrentUser =
                      member
                        .toLowerCase() ===
                      username
                        ?.trim()
                        .toLowerCase();

                    return (
                      <div
                        key={`${member}-${index}`}
                        className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0"
                      >

                        <InitialAvatar
                          name={member}
                          small
                        />

                        <div className="min-w-0 flex-1">

                          <div className="flex items-center gap-2">

                            <p className="font-semibold text-sm text-[#071F49] truncate">
                              {member}
                            </p>

                            {isCurrentUser && (
                              <span className="shrink-0 text-[9px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">
                                YOU
                              </span>
                            )}

                          </div>

                          {isCurrentUser && (
                            <p className="text-xs text-slate-400 mt-0.5">
                              You
                            </p>
                          )}

                        </div>

                      </div>
                    );
                  }
                )}

                {filteredMembers.length ===
                  0 && (
                  <div className="py-8 text-center">

                    <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                      🔍
                    </div>

                    <p className="text-sm font-semibold text-slate-500">
                      Not Found
                    </p>

                    <p className="text-xs text-slate-400 mt-1">
                      This member is not in the group.
                    </p>

                  </div>
                )}

              </div>

            </div>

          </div>

        </div>
      )}

      {/* ========================================================
          FAVORITE MESSAGES
      ======================================================== */}

      {showFavoriteCard && (
        <div
          className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() =>
            setShowFavoriteCard(false)
          }
        >

          <div
            className="w-full max-w-md max-h-[80vh] bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="bg-[#F97316] text-white px-5 py-4 flex items-center justify-between">

              <div className="flex items-center gap-3">

                <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">

                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>

                </div>

                <div>

                  <h3 className="text-lg font-bold">
                    Favorite Messages
                  </h3>

                  <p className="text-xs text-orange-100">
                    {favoriteMessageItems.length}{" "}
                    {favoriteMessageItems.length ===
                    1
                      ? "favorite"
                      : "favorites"}
                  </p>

                </div>

              </div>

              <button
                type="button"
                onClick={() =>
                  setShowFavoriteCard(false)
                }
                className="w-9 h-9 rounded-full hover:bg-white/15 flex items-center justify-center text-xl"
              >
                ✕
              </button>

            </div>

            <div className="p-4 max-h-[60vh] overflow-y-auto">

              {favoriteMessageItems.length ===
              0 ? (

                <div className="py-10 text-center">

                  <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-100 flex items-center justify-center text-2xl mb-3">
                    ♡
                  </div>

                  <h4 className="font-semibold text-[#071F49]">
                    No Favorite Messages
                  </h4>

                  <p className="text-xs text-slate-400 mt-1 max-w-[260px] mx-auto">
                    Click a message and use the heart
                    icon to add it to favorites.
                  </p>

                </div>

              ) : (

                <div className="space-y-3">

                  {favoriteMessageItems.map(
                    (msg) => {
                      const isOwn =
                        msg?.username
                          ?.trim()
                          .toLowerCase() ===
                        username
                          ?.trim()
                          .toLowerCase();

                      return (
                        <div
                          key={
                            msg.originalIndex
                          }
                          className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                        >

                          <div className="flex items-center justify-between gap-3 mb-2">

                            <div className="flex items-center gap-2 min-w-0">

                              <InitialAvatar
                                name={
                                  msg.username
                                }
                                small
                              />

                              <div className="min-w-0">

                                <p className="text-xs font-bold text-[#071F49] truncate">
                                  {isOwn
                                    ? "You"
                                    : msg.username}
                                </p>

                                <p className="text-[10px] text-slate-400">
                                  {msg.time}
                                </p>

                              </div>

                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                toggleFavoriteMessage(
                                  msg.originalIndex
                                )
                              }
                              className="shrink-0 w-8 h-8 rounded-full bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition"
                              title="Remove favorite"
                            >
                              <svg
                                width="15"
                                height="15"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
                              </svg>
                            </button>

                          </div>

                          {msg.text && (
                            <p className="text-sm text-[#071F49] whitespace-pre-wrap break-words">
                              {msg.text}
                            </p>
                          )}

                          {msg.fileName && (
                            <div className="mt-2 rounded-lg bg-white border border-slate-200 px-3 py-2">

                              <p className="text-xs font-semibold text-[#071F49] truncate">
                                📄{" "}
                                {msg.fileName}
                              </p>

                              {msg.fileData && (
                                <div className="flex gap-3 mt-2">

                                  <button
                                    type="button"
                                    onClick={() =>
                                      openMediaInNewTab(
                                        msg.fileData,
                                        msg.fileType,
                                        msg.fileName
                                      )
                                    }
                                    className="text-xs font-semibold text-[#F97316] hover:underline"
                                  >
                                    Open
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      downloadDocument(
                                        msg.fileData,
                                        msg.fileType,
                                        msg.fileName
                                      )
                                    }
                                    className="text-xs font-semibold text-[#071F49] hover:underline"
                                  >
                                    Download
                                  </button>

                                </div>
                              )}

                            </div>
                          )}

                          {msg.voiceData && (
                            <div className="mt-2 rounded-lg bg-white border border-slate-200 px-3 py-2">

                              <p className="text-xs font-semibold text-[#071F49] mb-2">
                                🎙️ Voice message
                              </p>

                              <audio
                                controls
                                src={msg.voiceData}
                                className="w-full h-8"
                              />

                            </div>
                          )}

                        </div>
                      );
                    }
                  )}

                </div>

              )}

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default ChatRoom;