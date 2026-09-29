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

const REACTION_EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "😡"];

// Light Mode message colors
const LIGHT_MESSAGE_COLORS = [
  "#EDEEF0", "#6D849E", "#999EB0", "#C1D7A5", "#F5A6AB",
  "#92ADD3", "#9BBDDD", "#F3A773", "#F3A773",
];

// Dark Mode message colors
const DARK_MESSAGE_COLORS = [
  "#26364A", "#34495E", "#3B4252", "#3F4E3A", "#51383E",
  "#334B69", "#36546B", "#5A4434", "#4B3A2C",
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

  if (size < 1024) return `${size} B`;

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDuration = (seconds = 0) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(
    2,
    "0"
  )}`;
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

  if (small) sizeClass = "w-9 h-9 text-sm";
  if (large) sizeClass = "w-12 h-12 text-lg";

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

const ChatRoom = ({ username, room, socket, onLeave }) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  const messagesEndRef = useRef(null);
  const messageRefs = useRef({});

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState("");
  const searchInputRef = useRef(null);

  const [showMenu, setShowMenu] = useState(false);

  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");

  const [deletedMessages, setDeletedMessages] = useState([]);
  const [selectedMessageIndex, setSelectedMessageIndex] = useState(null);

  // ============================================================
  // THEME
  // ============================================================

  const [darkMode, setDarkMode] = useState(false);

  // ============================================================
  // PINNED MESSAGE
  // ============================================================

  const [pinnedMessageIndex, setPinnedMessageIndex] = useState(null);
  const [pinnedFlashIndex, setPinnedFlashIndex] = useState(null);

  // ============================================================
  // MESSAGE REACTIONS
  // ============================================================

  const [messageReactions, setMessageReactions] = useState({});

  const [showReactionPicker, setShowReactionPicker] = useState(false);

  // ============================================================
  // MEDIA FILES
  // ============================================================

  const [selectedFile, setSelectedFile] = useState(null);
  const [viewOnce, setViewOnce] = useState(false);
  const [viewedOnceMessages, setViewedOnceMessages] = useState([]);

  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  const fileInputRef = useRef(null);
  const mediaInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // ============================================================
  // VOICE RECORDING
  // ============================================================

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const autoSendVoiceRef = useRef(false);
  const voiceAudioRef = useRef(null);
  const [playingVoiceIndex, setPlayingVoiceIndex] = useState(null);
  const [voiceProgress, setVoiceProgress] = useState(0);
  const [voiceSpeed, setVoiceSpeed] = useState(1);

  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const recordingTimeRef = useRef(0);

  // ============================================================
  // FAVORITE MESSAGES
  // ============================================================

  const [favoriteMessages, setFavoriteMessages] = useState([]);
  const [showFavoriteCard, setShowFavoriteCard] = useState(false);

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

    if (!cleanName) return;

    setMembers((prev) => {
      const exists = prev.some(
        (member) =>
          member.toLowerCase() === cleanName.toLowerCase()
      );

      if (exists) return prev;

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

  const createSystemMessage = (type, memberName, time) => {
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
    if (!socket || !room || !username) return;

    const cleanUsername = username.trim();
    const cleanRoom = room.trim();

    const handleMessage = (msg) => {
      if (!msg) return;

      const incomingUsername = msg?.username?.trim();

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
        if (incomingUsername) addMember(incomingUsername);
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

      if (incomingUsername) addMember(incomingUsername);
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
    if (!searchText.trim()) return text;

    const safeSearch = escapeRegExp(searchText.trim());

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

    if (!socket || !socket.connected) {
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

    const cleanUsername = username?.trim() || "You";
    const cleanRoom = room?.trim();

    const newMessage = {
      text: message.trim(),
      room: cleanRoom,
      username: cleanUsername,
      time: currentTime,
    };

    if (selectedFile) {
      newMessage.fileName = selectedFile.name;
      newMessage.fileType = selectedFile.type;
      newMessage.fileData = selectedFile.data;
      newMessage.fileSize = selectedFile.size;
      newMessage.mediaKind = selectedFile.mediaKind || "document";
      newMessage.viewOnce =
        selectedFile.mediaKind === "media" && viewOnce;
    }

    if (selectedVoice) {
      newMessage.voiceData = selectedVoice.data;
      newMessage.voiceType = selectedVoice.type;
      newMessage.voiceSize = selectedVoice.size;
      newMessage.voiceDuration = selectedVoice.duration;
    }

    try {
      socket.emit("send", newMessage);

      setMessages((prev) => [...prev, newMessage]);

      addMember(cleanUsername);

      setMessage("");
      setSelectedFile(null);
      setSelectedVoice(null);
      setViewOnce(false);
      setShowEmojiPicker(false);
      setShowAttachmentMenu(false);
      setSelectedMessageIndex(null);
    } catch (error) {
      console.error("Message sending error:", error);
      alert("Message could not be sent.");
    }
  };

  // ============================================================
  // EMOJI
  // ============================================================

  const handleEmojiClick = (emojiData) => {
    setMessage((prev) => prev + emojiData.emoji);
  };

  const addQuickEmoji = (emoji) => {
    setMessage((prev) => prev + emoji);
  };

  // ============================================================
  // MEDIA FILE SELECT
  // ============================================================

  const processSelectedFile = (
    file,
    inputElement,
    source = "document"
  ) => {
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      alert("Please select a file smaller than 2 MB.");

      if (inputElement) inputElement.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        alert("Unable to read this file.");
        return;
      }

      setSelectedFile({
        name: file.name,
        type:
          file.type || "application/octet-stream",
        data: reader.result,
        size: file.size,
        mediaKind: source === "media" ? "media" : "document",
      });

      setSelectedVoice(null);
      setViewOnce(false);
      setShowAttachmentMenu(false);
    };

    reader.onerror = () => {
      alert("Unable to read this file.");
    };

    reader.readAsDataURL(file);

    if (inputElement) inputElement.value = "";
  };

  const handleFileChange = (e) => {
    processSelectedFile(
      e.target.files?.[0],
      e.target,
      "document"
    );
  };

  const handleMediaChange = (e) => {
    processSelectedFile(
      e.target.files?.[0],
      e.target,
      "media"
    );
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setViewOnce(false);
  };

  // ============================================================
  // VOICE RECORDING
  // ============================================================

  const clearRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const stopMediaStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });

      mediaStreamRef.current = null;
    }
  };

  const startVoiceRecording = async () => {
    if (isRecording) return;

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

      mediaStreamRef.current = stream;

      audioChunksRef.current = [];
      recordingTimeRef.current = 0;

      setRecordingTime(0);
      setSelectedVoice(null);
      setSelectedFile(null);
      setViewOnce(false);
      setIsRecording(true);

      let mimeType = "";

      if (typeof MediaRecorder !== "undefined") {
        if (
          MediaRecorder.isTypeSupported(
            "audio/webm;codecs=opus"
          )
        ) {
          mimeType = "audio/webm;codecs=opus";
        } else if (
          MediaRecorder.isTypeSupported("audio/webm")
        ) {
          mimeType = "audio/webm";
        } else if (
          MediaRecorder.isTypeSupported("audio/mp4")
        ) {
          mimeType = "audio/mp4";
        }
      }

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data?.size) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const finalType =
          recorder.mimeType ||
          mimeType ||
          "audio/webm";

        const blob = new Blob(
          audioChunksRef.current,
          { type: finalType }
        );

        if (blob.size > MAX_FILE_SIZE) {
          alert("Voice message is larger than 2 MB.");

          audioChunksRef.current = [];
          setSelectedVoice(null);
          stopMediaStream();

          return;
        }

        const reader = new FileReader();

        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            setSelectedVoice({
              name: `voice-${Date.now()}.webm`,
              type: finalType,
              data: reader.result,
              size: blob.size,
              duration: recordingTimeRef.current,
            });
            autoSendVoiceRef.current = true;
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

        alert("Voice recording failed.");
      };

      recorder.start();

      recordingTimerRef.current = setInterval(() => {
        recordingTimeRef.current += 1;

        setRecordingTime(recordingTimeRef.current);
      }, 1000);
    } catch (error) {
      console.error("Microphone error:", error);

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
      mediaRecorderRef.current.state !== "inactive"
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
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
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

  useEffect(() => {
    if (
      selectedVoice &&
      autoSendVoiceRef.current &&
      socket?.connected
    ) {
      autoSendVoiceRef.current = false;
      const timer = setTimeout(() => {
        handleSend({ preventDefault: () => {} });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [selectedVoice, socket]);

  // ============================================================
  // VOICE PLAYBACK
  // ============================================================

  const playVoiceMessage = (msg, index) => {
    if (!msg?.voiceData) return;

    if (playingVoiceIndex === index) {
      if (voiceAudioRef.current?.paused) {
        voiceAudioRef.current.play().catch(() => {});
      } else {
        voiceAudioRef.current.pause();
      }
      return;
    }

    if (voiceAudioRef.current) {
      voiceAudioRef.current.pause();
    }

    const audio = new Audio(msg.voiceData);
    voiceAudioRef.current = audio;
    audio.playbackRate = 1;
    setVoiceSpeed(1);
    setVoiceProgress(0);
    setPlayingVoiceIndex(index);

    audio.ontimeupdate = () => {
      const duration = audio.duration || msg.voiceDuration || 1;
      setVoiceProgress(Math.min(100, (audio.currentTime / duration) * 100));
    };

    audio.onended = () => {
      setPlayingVoiceIndex(null);
      setVoiceProgress(0);
      setVoiceSpeed(1);
    };

    audio.play().catch(() => setPlayingVoiceIndex(null));
  };

  const cycleVoiceSpeed = () => {
    const next = voiceSpeed === 1 ? 1.5 : voiceSpeed === 1.5 ? 2 : 1;
    setVoiceSpeed(next);
    if (voiceAudioRef.current) {
      voiceAudioRef.current.playbackRate = next;
    }
  };

  useEffect(() => {
    return () => {
      if (voiceAudioRef.current) {
        voiceAudioRef.current.pause();
        voiceAudioRef.current = null;
      }
    };
  }, []);

  // ============================================================
  // BLOB
  // ============================================================

  const createBlobFromData = (
    fileData,
    fileType
  ) => {
    if (!fileData) return null;

    try {
      const parts = fileData.split(",");

      if (parts.length < 2) return null;

      const base64Data = parts[1];

      const byteCharacters = atob(base64Data);

      const byteNumbers = new Array(
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

      const byteArray = new Uint8Array(byteNumbers);

      return new Blob([byteArray], {
        type:
          fileType ||
          "application/octet-stream",
      });
    } catch (error) {
      console.error("Blob creation error:", error);
      return null;
    }
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
      alert("File data is not available.");
      return;
    }

    try {
      const blob = createBlobFromData(
        fileData,
        fileType
      );

      if (!blob) {
        alert("Unable to open this file.");
        return;
      }

      const blobUrl = URL.createObjectURL(blob);

      const canPreview =
        fileType?.startsWith("image/") ||
        fileType?.startsWith("video/") ||
        fileType?.startsWith("audio/") ||
        fileType === "application/pdf" ||
        fileType === "text/plain";

      if (canPreview) {
        const newTab = window.open(
          blobUrl,
          "_blank"
        );

        if (!newTab) {
          URL.revokeObjectURL(blobUrl);
          alert(
            "Please allow pop-ups for this chat."
          );
          return;
        }

        newTab.focus();

        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 60000);

        return;
      }

      const link = document.createElement("a");

      link.href = blobUrl;
      link.download = fileName || "file";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 1000);
    } catch (error) {
      console.error("File open error:", error);
      alert("Unable to open this file.");
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
      alert("File data is not available.");
      return;
    }

    try {
      const blob = createBlobFromData(
        fileData,
        fileType
      );

      if (!blob) {
        alert("Unable to download this file.");
        return;
      }

      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = blobUrl;
      link.download = fileName || "file";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 1000);
    } catch (error) {
      console.error("Download error:", error);
      alert("Unable to download this file.");
    }
  };

  // ============================================================
  // MESSAGE ACTIONS
  // ============================================================

  const selectMessageForActions = (messageIndex) => {
    setSelectedMessageIndex((prev) =>
      prev === messageIndex
        ? null
        : messageIndex
    );

    setShowReactionPicker(false);
  };

  const handleDeleteMessage = (messageIndex) => {
    setDeletedMessages((prev) => {
      if (prev.includes(messageIndex)) return prev;

      return [...prev, messageIndex];
    });

    setFavoriteMessages((prev) =>
      prev.filter((index) => index !== messageIndex)
    );

    if (pinnedMessageIndex === messageIndex) {
      setPinnedMessageIndex(null);
    }

    setMessageReactions((prev) => {
      const next = { ...prev };
      delete next[messageIndex];
      return next;
    });

    setSelectedMessageIndex(null);
    setShowReactionPicker(false);
  };

  const toggleFavoriteMessage = (messageIndex) => {
    setFavoriteMessages((prev) => {
      if (prev.includes(messageIndex)) {
        return prev.filter(
          (index) => index !== messageIndex
        );
      }

      return [...prev, messageIndex];
    });

    setSelectedMessageIndex(null);
  };

  // ============================================================
  // REACTION
  // ============================================================

  const addReaction = (messageIndex, emoji) => {
    setMessageReactions((prev) => ({
      ...prev,
      [messageIndex]: emoji,
    }));

    setSelectedMessageIndex(null);
    setShowReactionPicker(false);
  };

  const removeReaction = (messageIndex) => {
    setMessageReactions((prev) => {
      const next = { ...prev };
      delete next[messageIndex];
      return next;
    });

    setSelectedMessageIndex(null);
    setShowReactionPicker(false);
  };

  // ============================================================
  // PIN MESSAGE
  // ============================================================

  const pinSelectedMessage = () => {
    if (
      selectedMessageIndex === null ||
      deletedMessages.includes(selectedMessageIndex) ||
      !messages[selectedMessageIndex]
    ) {
      return;
    }

    setPinnedMessageIndex(selectedMessageIndex);
    setSelectedMessageIndex(null);
    setShowMenu(false);
  };

  const unpinMessage = () => {
    setPinnedMessageIndex(null);
    setSelectedMessageIndex(null);
    setShowMenu(false);
  };

  const scrollToPinnedMessage = () => {
    if (
      pinnedMessageIndex === null ||
      !messages[pinnedMessageIndex]
    ) {
      return;
    }

    setPinnedFlashIndex(pinnedMessageIndex);

    requestAnimationFrame(() => {
      messageRefs.current[pinnedMessageIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });

    setTimeout(() => setPinnedFlashIndex(null), 1600);
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

  const enableDarkMode = () => {
    setDarkMode(true);
    setShowMenu(false);
  };

  const enableLightMode = () => {
    setDarkMode(false);
    setShowMenu(false);
  };

  // ============================================================
  // LEAVE GROUP
  // ============================================================

  const handleLeaveGroup = () => {
    const cleanUsername = username?.trim();
    const cleanRoom = room?.trim();

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

    if (onLeave) onLeave();
  };

  // ============================================================
  // FILTER MEMBERS
  // ============================================================

  const filteredMembers = [...members].sort(
    (a, b) => {
      if (!memberSearch.trim()) return 0;

      const search = memberSearch.toLowerCase();

      const aMatch = a
        .toLowerCase()
        .includes(search);

      const bMatch = b
        .toLowerCase()
        .includes(search);

      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;

      return 0;
    }
  );

  const hasMessage = message.trim().length > 0;

  const canSend =
    hasMessage ||
    selectedFile ||
    selectedVoice;

  // ============================================================
  // HEADER
  // ============================================================

  const headerMembers = members.slice(0, 4);

  const headerMemberText =
    headerMembers.length > 0
      ? `${headerMembers.join(", ")}${
          members.length > 4 ? "..." : ""
        }`
      : "No members yet";

  // ============================================================
  // FAVORITE LIST
  // ============================================================

  const favoriteMessageItems = favoriteMessages
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
  // PINNED MESSAGE
  // ============================================================

  const pinnedMessage =
    pinnedMessageIndex !== null &&
    messages[pinnedMessageIndex] &&
    !deletedMessages.includes(pinnedMessageIndex)
      ? messages[pinnedMessageIndex]
      : null;

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div
      className={`h-[100dvh] min-h-0 w-full flex flex-col overflow-hidden transition-colors duration-200 ${
        darkMode
          ? "bg-[#07111f] text-white"
          : "bg-[#FFF7ED] text-[#071F49]"
      }`}
    >
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

      <header
        className={`shrink-0 shadow-md z-40 transition-colors duration-200 ${
          darkMode
            ? "bg-slate-800/85 backdrop-blur-xl text-white border-b border-white/10"
            : "bg-[#F97316] text-white"
        }`}
      >
        <div className="w-full px-3 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <InitialAvatar name={room} large />

            <div className="min-w-0">
              <span className={`block text-[10px] sm:text-xs font-bold uppercase tracking-[0.18em] ${
                  darkMode ? "text-slate-300" : "text-orange-100"
                }`}>
                GROUP
              </span>

              <h2 className="text-lg sm:text-xl font-extrabold truncate leading-tight">
                {room}
              </h2>

              <p className={`text-xs truncate mt-0.5 ${
                darkMode ? "text-slate-300" : "text-orange-100"
              }`}>
                {headerMemberText}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {showSearch && (
              <div className="hidden xs:flex sm:flex items-center w-[170px] sm:w-[220px] h-9 rounded-lg bg-white/95 px-2 mr-1">
                <svg
                  className="shrink-0 text-slate-400"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>

                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchText}
                  onChange={(e) =>
                    setSearchText(e.target.value)
                  }
                  placeholder="Search..."
                  className="w-full min-w-0 bg-transparent text-sm text-[#071F49] placeholder:text-slate-400 pl-2 outline-none"
                />

                {searchText && (
                  <button
                    type="button"
                    onClick={() => setSearchText("")}
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
                setShowSearch((prev) => !prev);
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
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setShowMenu((prev) => !prev)
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
                <div
                  className={`absolute right-0 top-12 w-60 rounded-xl shadow-2xl border overflow-hidden z-50 ${
                    darkMode
                      ? "bg-[#101c2c] border-slate-700 text-white"
                      : "bg-white border-slate-100 text-[#071F49]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={openGroupInfo}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition text-left ${
                      darkMode
                        ? "hover:bg-slate-800"
                        : "hover:bg-orange-50"
                    }`}
                  >
                    <span className="text-lg">👥</span>
                    <span>Group Info</span>
                  </button>

                  <button
                    type="button"
                    onClick={openSearch}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition text-left ${
                      darkMode
                        ? "hover:bg-slate-800"
                        : "hover:bg-orange-50"
                    }`}
                  >
                    <span className="text-lg">🔍</span>
                    <span>Search</span>
                  </button>

                  <button
                    type="button"
                    onClick={openFavoriteChat}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition text-left ${
                      darkMode
                        ? "hover:bg-slate-800"
                        : "hover:bg-orange-50"
                    }`}
                  >
                    <span className="text-lg text-red-500">
                      ♥
                    </span>
                    <span>Favorite Chat</span>
                  </button>

                  {/* PIN / UNPIN */}

                  <button
                    type="button"
                    onClick={() => {
                      if (
                        selectedMessageIndex !== null &&
                        pinnedMessageIndex === selectedMessageIndex
                      ) {
                        unpinMessage();
                      } else {
                        pinSelectedMessage();
                      }
                    }}
                    disabled={
                      selectedMessageIndex === null ||
                      deletedMessages.includes(
                        selectedMessageIndex
                      )
                    }
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition text-left ${
                      selectedMessageIndex === null
                        ? "text-slate-400 cursor-not-allowed"
                        : darkMode
                        ? "text-white hover:bg-slate-800"
                        : "text-[#071F49] hover:bg-orange-50"
                    }`}
                  >
                    <span className="text-lg">
                      {pinnedMessageIndex === selectedMessageIndex
                        ? "📍"
                        : "📌"}
                    </span>
                    <span>
                      {pinnedMessageIndex === selectedMessageIndex
                        ? "Unpin Message"
                        : "Pin Message"}
                    </span>
                  </button>

                  {/* DARK MODE */}

                  <button
                    type="button"
                    onClick={enableDarkMode}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition text-left ${
                      darkMode
                        ? "bg-slate-800 hover:bg-slate-700"
                        : "hover:bg-orange-50"
                    }`}
                  >
                    <span className="text-lg">🌙</span>
                    <span>Dark Mode</span>

                    {darkMode && (
                      <span className="ml-auto text-xs font-bold text-orange-400">
                        ON
                      </span>
                    )}
                  </button>

                  {/* LIGHT MODE */}

                  <button
                    type="button"
                    onClick={enableLightMode}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition text-left ${
                      !darkMode
                        ? "bg-orange-50"
                        : "hover:bg-slate-800"
                    }`}
                  >
                    <span className="text-lg">☀️</span>
                    <span>Light Mode</span>

                    {!darkMode && (
                      <span className="ml-auto text-xs font-bold text-orange-500">
                        ON
                      </span>
                    )}
                  </button>

                  <div
                    className={`h-px ${
                      darkMode
                        ? "bg-slate-700"
                        : "bg-slate-100"
                    }`}
                  />

                  <button
                    type="button"
                    onClick={handleLeaveGroup}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50/10 transition text-left font-semibold"
                  >
                    <span className="text-lg">↪</span>
                    <span>Leave Group</span>
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

      {pinnedMessage && (
        <button
          type="button"
          onClick={scrollToPinnedMessage}
          className={`shrink-0 w-full px-3 sm:px-6 py-2 border-b text-left transition-colors ${
            darkMode
              ? "bg-slate-800/75 border-white/10 text-slate-100"
              : "bg-white/80 border-orange-100 text-[#071F49]"
          }`}
          title="Go to pinned message"
        >
          <div className="w-full max-w-5xl mx-auto flex items-center gap-2 min-w-0">
            <span className="shrink-0 text-base">📌</span>
            <span className="text-[10px] uppercase tracking-wider font-bold text-orange-500 shrink-0">
              Pinned
            </span>
            <span className="text-sm font-medium truncate">
              {pinnedMessage.fileName ||
                pinnedMessage.text ||
                (pinnedMessage.voiceData ? "Voice message" : "Message")}
            </span>
            <span className="ml-auto shrink-0 text-slate-400">›</span>
          </div>
        </button>
      )}

      <main
        className={`flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 py-5 transition-colors ${
          darkMode
            ? "bg-[#07111f]"
            : "bg-[#FFF7ED]"
        }`}
        onClick={() => {
          setSelectedMessageIndex(null);
          setShowReactionPicker(false);
        }}
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center text-3xl mb-3">
              💬
            </div>

            <h3
              className={`text-lg font-semibold ${
                darkMode
                  ? "text-white"
                  : "text-[#071F49]"
              }`}
            >
              No messages yet
            </h3>

            <p className="text-sm text-slate-400 mt-1">
              Send a message to start the conversation 👋
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, idx) => {
              if (deletedMessages.includes(idx)) {
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
                    <div className={`px-4 py-2 rounded-full text-xs font-medium text-center shadow-sm ${
                      darkMode
                        ? "bg-slate-700/80 text-slate-300"
                        : "bg-slate-200/80 text-slate-500"
                    }`}>
                      <span className={`font-semibold ${
                        darkMode ? "text-slate-200" : "text-slate-600"
                      }`}>
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
                    <div className={`px-4 py-2 rounded-full text-xs font-medium text-center shadow-sm ${
                      darkMode
                        ? "bg-slate-700/80 text-slate-300"
                        : "bg-slate-200/80 text-slate-500"
                    }`}>
                      <span className={`font-semibold ${
                        darkMode ? "text-slate-200" : "text-slate-600"
                      }`}>
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
                (darkMode ? DARK_MESSAGE_COLORS : LIGHT_MESSAGE_COLORS)[
                  idx %
                    (darkMode
                      ? DARK_MESSAGE_COLORS.length
                      : LIGHT_MESSAGE_COLORS.length)
                ];

              const isSelected =
                selectedMessageIndex === idx;

              const isFavorite =
                favoriteMessages.includes(idx);

              const isMediaMessage = msg.mediaKind === "media";

              const isImage =
                isMediaMessage &&
                msg.fileType?.startsWith("image/");

              const isVideo =
                isMediaMessage &&
                msg.fileType?.startsWith("video/");

              const isReaction =
                messageReactions[idx];

              const isViewedOnce =
                viewedOnceMessages.includes(idx);

              return (
                <div
                  key={idx}
                  ref={(node) => {
                    messageRefs.current[idx] = node;
                  }}
                  className={`flex flex-col max-w-[96%] sm:max-w-[75%] ${
                    isOwn
                      ? "ml-auto items-end"
                      : "mr-auto items-start"
                  } ${
                    pinnedFlashIndex === idx
                      ? "ring-2 ring-orange-400 ring-offset-4 rounded-2xl"
                      : ""
                  }`}
                  onClick={(e) =>
                    e.stopPropagation()
                  }
                >
                  <span className="text-xs font-semibold text-slate-500 mb-1 px-1">
                    {isOwn ? "You" : msg.username}
                  </span>

                  <div
                    className={`flex items-center gap-2 ${
                      isOwn
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    {isSelected && (
                      <div
                        className={`flex items-center gap-1.5 shrink-0 rounded-full p-1 ${
                          darkMode
                            ? "bg-[#101c2c]"
                            : "bg-white"
                        } shadow-lg`}
                      >
                        {/* REACTION */}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();

                            setShowReactionPicker(
                              (prev) => !prev
                            );
                          }}
                          className="w-9 h-9 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center hover:bg-orange-100 transition"
                          title="React"
                        >
                          😊
                        </button>

                        {/* FAVORITE */}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();

                            toggleFavoriteMessage(idx);
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

                        {/* DELETE */}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();

                            handleDeleteMessage(idx);
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
                        selectMessageForActions(idx)
                      }
                    >
                      {/* REACTION POPUP */}

                      {isSelected &&
                        showReactionPicker && (
                          <div
                            className={`absolute z-30 bottom-full mb-2 left-1/2 -translate-x-1/2 flex items-center gap-1 p-2 rounded-full shadow-xl border ${
                              darkMode
                                ? "bg-[#101c2c] border-slate-700"
                                : "bg-white border-slate-200"
                            }`}
                            onClick={(e) =>
                              e.stopPropagation()
                            }
                          >
                            {REACTION_EMOJIS.map(
                              (emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() =>
                                    addReaction(
                                      idx,
                                      emoji
                                    )
                                  }
                                  className="w-8 h-8 rounded-full hover:bg-orange-100 text-lg transition"
                                >
                                  {emoji}
                                </button>
                              )
                            )}
                          </div>
                        )}

                      <div
                        className={`relative px-4 py-3 pr-16 rounded-2xl border shadow-sm ${
                          isOwn
                            ? "rounded-br-sm"
                            : "rounded-bl-sm"
                        } ${
                          isSelected
                            ? "ring-2 ring-orange-300 ring-offset-1"
                            : ""
                        } ${
                          darkMode
                            ? "border-white/10 text-white"
                            : "border-black/5 text-[#071F49]"
                        }`}
                        style={{ backgroundColor: messageColor }}
                      >
                        {msg.text && (
                          <p
                            className={`break-words whitespace-pre-wrap ${
                              darkMode ? "text-white" : "text-[#071F49]"
                            }`}
                          >
                            {renderHighlightedText(
                              msg.text
                            )}
                          </p>
                        )}

                        {/* MEDIA / DOCUMENT */}

                        {msg.fileData && (
                          <div
                            className={`${
                              msg.text ? "mt-3" : ""
                            } rounded-xl ${
                              darkMode
                                ? "bg-black/15 border-white/10"
                                : "bg-white/75 border-black/5"
                            } border p-2 min-w-[210px] max-w-[340px]`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {msg.viewOnce && isMediaMessage && isViewedOnce ? (
                              <div className="h-24 rounded-lg flex flex-col items-center justify-center bg-black/10 text-center px-3">
                                <span className="text-2xl">👁️</span>
                                <p className={`text-xs font-semibold mt-1 ${
                                  darkMode ? "text-white" : "text-[#071F49]"
                                }`}>
                                  View once opened
                                </p>
                              </div>
                            ) : (
                              <>
                                {isImage && (
                                  <button
                                    type="button"
                                    className="block w-full"
                                    onClick={() => {
                                      if (msg.viewOnce) {
                                        setViewedOnceMessages((prev) =>
                                          prev.includes(idx) ? prev : [...prev, idx]
                                        );
                                      }
                                      openMediaInNewTab(
                                        msg.fileData,
                                        msg.fileType,
                                        msg.fileName
                                      );
                                    }}
                                  >
                                    <img
                                      src={msg.fileData}
                                      alt={msg.fileName || "Image"}
                                      className="w-full max-h-64 object-cover rounded-lg border border-slate-200 cursor-pointer"
                                    />
                                  </button>
                                )}

                                {isVideo && (
                                  <video
                                    src={msg.fileData}
                                    controls
                                    playsInline
                                    preload="metadata"
                                    onPlay={() => {
                                      if (msg.viewOnce) {
                                        setViewedOnceMessages((prev) =>
                                          prev.includes(idx) ? prev : [...prev, idx]
                                        );
                                      }
                                    }}
                                    className="w-full max-h-64 rounded-lg border border-slate-200 bg-black"
                                  />
                                )}

                                {!isImage && !isVideo && (
                                  <div className="flex items-center gap-3 p-1">
                                    <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 text-lg">
                                      📄
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className={`font-semibold text-sm truncate ${
                                        darkMode ? "text-white" : "text-[#071F49]"
                                      }`}>
                                        {msg.fileName || "File"}
                                      </p>
                                      <p className="text-xs text-slate-400">
                                        {msg.fileType || "Document"}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {(isImage || isVideo) && (
                                  <p className={`font-semibold text-xs truncate px-1 mt-1 ${
                                    darkMode ? "text-slate-200" : "text-[#071F49]"
                                  }`}>
                                    {msg.fileName || (isImage ? "Image" : "Video")}
                                    {msg.viewOnce ? " • View once" : ""}
                                  </p>
                                )}

                                {!isOwn && (
                                  <div className="grid grid-cols-2 gap-2 mt-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openMediaInNewTab(
                                          msg.fileData,
                                          msg.fileType,
                                          msg.fileName
                                        )
                                      }
                                      className="rounded-lg bg-[#F97316] hover:bg-orange-600 text-white text-xs font-semibold py-2 transition"
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
                                      className="rounded-lg bg-[#071F49] hover:bg-[#0b2d63] text-white text-xs font-semibold py-2 transition"
                                    >
                                      Save As
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}

                        {/* VOICE */}

                        {msg.voiceData && (
                          <div
                            className={`${
                              msg.text || msg.fileData ? "mt-3" : ""
                            } w-[270px] max-w-full rounded-2xl px-2.5 py-2 ${
                              darkMode ? "bg-black/15" : "bg-white/70"
                            }`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-2">
                              {playingVoiceIndex === idx ? (
                                <button
                                  type="button"
                                  onClick={cycleVoiceSpeed}
                                  className="w-10 h-10 rounded-full bg-[#071F49] text-white text-[11px] font-bold flex items-center justify-center shrink-0 shadow-sm"
                                  title="Playback speed"
                                >
                                  {voiceSpeed}x
                                </button>
                              ) : (
                                <InitialAvatar name={msg.username} small />
                              )}

                              <button
                                type="button"
                                onClick={() => playVoiceMessage(msg, idx)}
                                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                                  darkMode ? "bg-slate-700 text-white" : "bg-[#071F49] text-white"
                                }`}
                                aria-label={playingVoiceIndex === idx ? "Pause voice" : "Play voice"}
                              >
                                {playingVoiceIndex === idx ? (
                                  <span className="text-sm font-bold tracking-[-2px]">Ⅱ</span>
                                ) : (
                                  <span className="ml-0.5 text-sm">▶</span>
                                )}
                              </button>

                              <div className="flex-1 min-w-0">
                                <div className="relative h-7 flex items-center gap-1 overflow-hidden">
                                  {[3,6,4,8,5,10,4,7,5,9,3,6,8,4,7,5].map((height,waveIndex) => {
                                    const waveProgress = ((waveIndex + 1) / 16) * 100;
                                    const active = playingVoiceIndex === idx && voiceProgress >= waveProgress;
                                    return (
                                      <span
                                        key={waveIndex}
                                        className={`w-[3px] rounded-full transition-colors ${
                                          active ? "bg-[#F97316]" : darkMode ? "bg-slate-500" : "bg-slate-300"
                                        }`}
                                        style={{ height: `${height * 1.6}px` }}
                                      />
                                    );
                                  })}
                                  {playingVoiceIndex === idx && (
                                    <span
                                      className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#F97316] shadow-sm transition-all duration-100"
                                      style={{ left: `calc(${Math.max(0, Math.min(100, voiceProgress))}% - 5px)` }}
                                    />
                                  )}
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className={`text-[10px] font-semibold ${
                                    darkMode ? "text-slate-300" : "text-slate-500"
                                  }`}>
                                    Voice message
                                  </span>
                                  <span className="text-[10px] text-slate-400 shrink-0">
                                    {formatDuration(msg.voiceDuration)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="absolute right-2 bottom-1.5">
                          <span className={`text-[10px] font-medium ${
                              darkMode ? "text-slate-300" : "text-slate-500"
                            }`}>
                            {msg.time}
                            {isOwn && (
                              <span className={`ml-1 text-[11px] font-bold ${
                                darkMode ? "text-slate-200" : "text-[#071F49]"
                              }`}>
                                ✓✓
                              </span>
                            )}
                          </span>
                        </div>

                        {/* REACTION DISPLAY */}

                        {isReaction && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeReaction(idx);
                            }}
                            className="absolute -bottom-3 left-3 min-w-7 h-7 px-1.5 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-sm hover:scale-110 transition"
                            title="Remove reaction"
                          >
                            {isReaction}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* ========================================================
          COMPOSER
      ======================================================== */}

      <footer
        className={`shrink-0 border-t pl-3 pr-4 sm:px-6 pt-2.5 pb-[max(0.7rem,env(safe-area-inset-bottom))] relative z-50 transition-colors ${
          darkMode
            ? "bg-slate-800/70 backdrop-blur-xl border-white/10"
            : "bg-white/85 backdrop-blur-xl border-orange-100"
        }`}
      >
        {showEmojiPicker && (
          <div className="absolute bottom-full left-3 mb-2 z-50 shadow-xl rounded-xl overflow-hidden">
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              width={300}
              height={350}
              previewConfig={{
                showPreview: false,
              }}
            />
          </div>
        )}

        {/* ATTACHMENT MENU */}

        {showAttachmentMenu && (
          <div
            className={`absolute bottom-full left-[50px] sm:left-[70px] mb-2 w-60 rounded-2xl shadow-2xl border overflow-hidden z-50 ${
              darkMode
                ? "bg-[#101c2c] border-slate-700"
                : "bg-white border-slate-100"
            }`}
          >
            <div
              className={`px-4 py-3 text-xs font-bold uppercase tracking-wider ${
                darkMode
                  ? "text-slate-300 border-b border-slate-700"
                  : "text-slate-400 border-b border-slate-100"
              }`}
            >
              Attach
            </div>

            {/* DOCUMENTS */}

            <button
              type="button"
              onClick={() => {
                setShowAttachmentMenu(false);
                fileInputRef.current?.click();
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${
                darkMode
                  ? "hover:bg-slate-800 text-white"
                  : "hover:bg-orange-50 text-[#071F49]"
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-lg">
                📄
              </div>

              <div>
                <p className="text-sm font-semibold">
                  Documents
                </p>

                <p className="text-xs text-slate-400">
                  PDF, Word, Excel, ZIP...
                </p>
              </div>
            </button>

            {/* PICTURES / VIDEOS */}

            <button
              type="button"
              onClick={() => {
                setShowAttachmentMenu(false);
                mediaInputRef.current?.click();
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${
                darkMode
                  ? "hover:bg-slate-800 text-white"
                  : "hover:bg-orange-50 text-[#071F49]"
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-lg">
                🖼️
              </div>

              <div>
                <p className="text-sm font-semibold">
                  Pictures & Videos
                </p>

                <p className="text-xs text-slate-400">
                  Select photos or videos
                </p>
              </div>
            </button>

            {/* CAMERA */}

            <button
              type="button"
              onClick={() => {
                setShowAttachmentMenu(false);
                cameraInputRef.current?.click();
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${
                darkMode
                  ? "hover:bg-slate-800 text-white"
                  : "hover:bg-orange-50 text-[#071F49]"
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-lg">
                📷
              </div>

              <div>
                <p className="text-sm font-semibold">
                  Camera
                </p>

                <p className="text-xs text-slate-400">
                  Take a picture
                </p>
              </div>
            </button>
          </div>
        )}

        {/* HIDDEN INPUTS */}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
          onChange={handleFileChange}
          className="hidden"
        />

        <input
          ref={mediaInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleMediaChange}
          className="hidden"
        />

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*,video/*"
          capture="environment"
          onChange={handleMediaChange}
          className="hidden"
        />

        {/* QUICK EMOJIS */}

        <div className="flex gap-1.5 overflow-x-auto pb-2 max-w-full">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => addQuickEmoji(emoji)}
              className={`shrink-0 h-8 w-8 rounded-lg transition text-lg ${
                darkMode
                  ? "hover:bg-slate-700"
                  : "hover:bg-orange-100"
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* SELECTED FILE */}

        {selectedFile && (
          <div
            className={`mb-2 flex items-center gap-3 rounded-xl border px-3 py-2 ${
              darkMode
                ? "border-orange-800 bg-orange-950/30"
                : "border-orange-200 bg-orange-50"
            }`}
          >
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0 text-xl">
              {selectedFile.type?.startsWith("image/")
                ? "🖼️"
                : selectedFile.type?.startsWith(
                    "video/"
                  )
                ? "🎥"
                : "📄"}
            </div>

            <div className="min-w-0 flex-1">
              <p
                className={`text-sm font-semibold truncate ${
                  darkMode
                    ? "text-white"
                    : "text-[#071F49]"
                }`}
              >
                {selectedFile.name}
              </p>

              <p className="text-xs text-slate-400">
                {formatFileSize(selectedFile.size)} •
                {selectedFile.mediaKind === "media"
                  ? "Media ready to send"
                  : "Document ready to send"}
              </p>
            </div>

            <button
              type="button"
              onClick={removeSelectedFile}
              className="w-8 h-8 rounded-lg hover:bg-white text-slate-400 hover:text-red-600 transition"
              title="Remove file"
            >
              ✕
            </button>
          </div>
        )}

        {/* VIEW ONCE */}

        {selectedFile?.mediaKind === "media" && (
          <div
            className={`mb-2 flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${
              darkMode
                ? "border-white/10 bg-slate-900/40"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg">👁️</span>
              <div className="min-w-0">
                <p className={`text-xs font-bold ${
                  darkMode ? "text-white" : "text-[#071F49]"
                }`}>
                  View once
                </p>
                <p className="text-[10px] text-slate-400">
                  Media disappears after it is opened.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setViewOnce((prev) => !prev)}
              className={`shrink-0 w-11 h-6 rounded-full p-0.5 transition ${
                viewOnce
                  ? "bg-[#F97316]"
                  : darkMode ? "bg-slate-600" : "bg-slate-300"
              }`}
              aria-label="Toggle view once"
            >
              <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                viewOnce ? "translate-x-5" : "translate-x-0"
              }`} />
            </button>
          </div>
        )}

        {/* SELECTED VOICE */}

        {selectedVoice && !isRecording && (
          <div
            className={`mb-2 flex items-center gap-3 rounded-xl border px-3 py-2 ${
              darkMode
                ? "border-orange-800 bg-orange-950/30"
                : "border-orange-200 bg-orange-50"
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-[#F97316] shrink-0">
              🎙️
            </div>

            <div className="min-w-0 flex-1">
              <p
                className={`text-sm font-semibold ${
                  darkMode
                    ? "text-white"
                    : "text-[#071F49]"
                }`}
              >
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
              onClick={removeSelectedVoice}
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
          className="flex items-center gap-2 w-full max-w-5xl mx-auto pr-1 sm:pr-2"
        >
          {/* EMOJI */}

          <button
            type="button"
            onClick={() => {
              setShowEmojiPicker((prev) => !prev);
              setShowAttachmentMenu(false);
            }}
            className={`shrink-0 w-10 h-10 rounded-full text-xl transition flex items-center justify-center ${
              darkMode
                ? "bg-slate-700/80 hover:bg-slate-600 text-white"
                : "bg-orange-100 hover:bg-orange-200"
            }`}
            aria-label="Open emoji picker"
            title="Emoji"
          >
            😊
          </button>

          {/* ATTACHMENT */}

          <button
            type="button"
            onClick={() => {
              setShowAttachmentMenu((prev) => !prev);
              setShowEmojiPicker(false);
            }}
            className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition ${
              darkMode
                ? "bg-slate-700/80 hover:bg-slate-600 text-white"
                : "bg-orange-100 hover:bg-orange-200 text-[#F97316]"
            }`}
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

          {/* INPUT */}

          <div className="relative flex-1 min-w-0">
            {isRecording ? (
              <div
                className={`relative w-full h-11 rounded-full border-2 overflow-hidden flex items-center px-2 ${
                  darkMode
                    ? "border-[#F97316] bg-slate-900/70"
                    : "border-[#F97316] bg-orange-50/80"
                }`}
              >
                <button
                  type="button"
                  onClick={cancelVoiceRecording}
                  className="relative z-20 shrink-0 w-8 h-8 rounded-full bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center font-bold"
                  title="Cancel recording"
                >
                  ✕
                </button>

                <div className="relative flex-1 h-full flex items-center px-3 overflow-hidden">
                  <div className="absolute left-3 right-3 h-1 rounded-full bg-orange-100/30 overflow-hidden">
                    <div
                      className="absolute w-20 h-1 rounded-full bg-[#F97316]"
                      style={{ animation: "voiceMove 1.2s linear infinite" }}
                    />
                  </div>
                  <div className={`relative z-10 flex items-center gap-2 pr-2 ${
                    darkMode ? "bg-slate-900/80" : "bg-orange-50/90"
                  }`}>
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className={`text-sm font-semibold ${
                      darkMode ? "text-white" : "text-[#071F49]"
                    }`}>
                      Recording
                    </span>
                    <span className="text-xs font-bold text-[#F97316] tabular-nums">
                      {formatDuration(recordingTime)}
                    </span>
                  </div>
                  <div className="absolute right-2 flex items-center gap-1 h-7">
                    {[4,7,10,6,9,5,8].map((height,index) => (
                      <span
                        key={index}
                        className="w-1 rounded-full bg-[#F97316]"
                        style={{
                          height: `${height * 2}px`,
                          animation: `voiceBars 0.7s ease-in-out ${index * 0.08}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={stopVoiceRecording}
                  className="relative z-20 shrink-0 w-9 h-9 rounded-full bg-[#071F49] hover:bg-[#0b2d63] text-white flex items-center justify-center shadow-sm"
                  title="Finish recording and send"
                >
                  <span className="w-3.5 h-3.5 rounded-sm bg-white" />
                </button>
              </div>
            ) : (
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder={selectedVoice ? "Voice message ready..." : "Type a message..."}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={!!selectedVoice}
                  className={`w-full h-11 rounded-full border-2 pl-4 pr-24 py-2.5 outline-none transition ${
                    darkMode
                      ? "border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-950"
                      : "border-slate-200 bg-[#FFF7ED]/75 text-[#071F49] placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 focus:bg-white"
                  }`}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }}
                />

                {/* MIC */}

                <button
                  type="button"
                  onClick={startVoiceRecording}
                  disabled={!!selectedVoice}
                  className={`absolute right-[52px] top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition ${
                    selectedVoice
                      ? darkMode
                        ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                        : "bg-slate-100 text-slate-300 cursor-not-allowed"
                      : darkMode
                      ? "bg-slate-700 text-white hover:bg-slate-600"
                      : "bg-orange-100 text-[#F97316] hover:bg-orange-200"
                  } ${isRecording ? "animate-pulse" : ""}`}
                  title="Record voice"
                  aria-label="Record voice"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="9" y="2" width="6" height="12" rx="3" />
                    <path d="M5 10a7 7 0 0 0 14 0" />
                    <path d="M12 19v3" />
                    <path d="M8 22h8" />
                  </svg>
                </button>

                {/* SEND INSIDE INPUT */}

                <button
                  type="submit"
                  disabled={!canSend || isRecording}
                  className={`absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center shadow-md transition ${
                    canSend && !isRecording
                      ? "bg-[#071F49] text-white hover:bg-[#0b2d63] hover:scale-105"
                      : darkMode
                      ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                  title="Send"
                  aria-label="Send message"
                >
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 2 11 13" />
                    <path d="m22 2-7 20-4-9-9-4Z" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </form>
      </footer>

      {/* ========================================================
          GROUP INFO
      ======================================================== */}

      {showGroupInfo && (
        <div
          className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowGroupInfo(false)}
        >
          <div
            className={`w-full max-w-md max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden ${
              darkMode
                ? "bg-[#101c2c] text-white"
                : "bg-white"
            }`}
            onClick={(e) => e.stopPropagation()}
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

            <div
              className={`px-5 py-4 border-b flex items-center gap-3 ${
                darkMode
                  ? "border-slate-700"
                  : "border-slate-100"
              }`}
            >
              <InitialAvatar name={room} large />

              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-orange-500">
                  GROUP
                </p>

                <h4
                  className={`text-base font-bold truncate ${
                    darkMode
                      ? "text-white"
                      : "text-[#071F49]"
                  }`}
                >
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

            <div
              className={`p-4 border-b ${
                darkMode
                  ? "border-slate-700"
                  : "border-slate-100"
              }`}
            >
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
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>

                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) =>
                    setMemberSearch(e.target.value)
                  }
                  placeholder="Search members..."
                  className={`w-full rounded-xl border-2 px-10 py-2.5 outline-none transition ${
                    darkMode
                      ? "border-slate-600 bg-[#0b1726] text-white placeholder:text-slate-500 focus:border-orange-400"
                      : "border-slate-200 bg-slate-50 text-[#071F49] placeholder:text-slate-400 focus:border-orange-400 focus:bg-white"
                  }`}
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
                      member.toLowerCase() ===
                      username
                        ?.trim()
                        .toLowerCase();

                    return (
                      <div
                        key={`${member}-${index}`}
                        className={`flex items-center gap-3 py-3 border-b last:border-0 ${
                          darkMode
                            ? "border-slate-800"
                            : "border-slate-50"
                        }`}
                      >
                        <InitialAvatar
                          name={member}
                          small
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p
                              className={`font-semibold text-sm truncate ${
                                darkMode
                                  ? "text-white"
                                  : "text-[#071F49]"
                              }`}
                            >
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

                {filteredMembers.length === 0 && (
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
          className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() =>
            setShowFavoriteCard(false)
          }
        >
          <div
            className={`w-full max-w-md max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden ${
              darkMode
                ? "bg-[#101c2c]"
                : "bg-white"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#F97316] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
                  ♥
                </div>

                <div>
                  <h3 className="text-lg font-bold">
                    Favorite Messages
                  </h3>

                  <p className="text-xs text-orange-100">
                    {favoriteMessageItems.length}{" "}
                    {favoriteMessageItems.length === 1
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
              {favoriteMessageItems.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-100 flex items-center justify-center text-2xl mb-3">
                    ♡
                  </div>

                  <h4
                    className={`font-semibold ${
                      darkMode
                        ? "text-white"
                        : "text-[#071F49]"
                    }`}
                  >
                    No Favorite Messages
                  </h4>

                  <p className="text-xs text-slate-400 mt-1 max-w-[260px] mx-auto">
                    Click a message and use the heart icon
                    to add it to favorites.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {favoriteMessageItems.map((msg) => {
                    const isOwn =
                      msg?.username
                        ?.trim()
                        .toLowerCase() ===
                      username
                        ?.trim()
                        .toLowerCase();

                    return (
                      <div
                        key={msg.originalIndex}
                        className={`rounded-xl border p-3 ${
                          darkMode
                            ? "border-slate-700 bg-[#0b1726]"
                            : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <InitialAvatar
                              name={msg.username}
                              small
                            />

                            <div className="min-w-0">
                              <p
                                className={`text-xs font-bold truncate ${
                                  darkMode
                                    ? "text-white"
                                    : "text-[#071F49]"
                                }`}
                              >
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
                            ♥
                          </button>
                        </div>

                        {msg.text && (
                          <p
                            className={`text-sm whitespace-pre-wrap break-words ${
                              darkMode
                                ? "text-slate-200"
                                : "text-[#071F49]"
                            }`}
                          >
                            {msg.text}
                          </p>
                        )}

                        {msg.fileName && (
                          <div className="mt-2 rounded-lg bg-white border border-slate-200 px-3 py-2">
                            <p className="text-xs font-semibold text-[#071F49] truncate">
                              📄 {msg.fileName}
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
                  })}
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