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

const getInitial = (name = "") => {
  const cleanName = name.trim();

  if (!cleanName) return "?";

  return cleanName.charAt(0).toUpperCase();
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

  const [selectedFile, setSelectedFile] =
    useState(null);

  // ==========================================================
  // FAVORITE MESSAGES
  // ==========================================================

  const [favoriteMessages, setFavoriteMessages] =
    useState([]);

  const [showFavoriteCard, setShowFavoriteCard] =
    useState(false);

  const fileInputRef = useRef(null);

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

      // ========================================================
      // USER JOINED
      // ========================================================

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

            // Existing member tells new member
            // that this member is already present.
            socket.emit("send", {
              type: "member-present",
              username: cleanUsername,
              room: cleanRoom,
            });
          }
        }

        return;
      }

      // ========================================================
      // MEMBER PRESENT
      // ========================================================

      if (msg.type === "member-present") {
        if (incomingUsername) {
          addMember(incomingUsername);
        }

        return;
      }

      // ========================================================
      // USER LEFT
      // ========================================================

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

      // ========================================================
      // NORMAL MESSAGE
      // ========================================================

      setMessages((prev) => [...prev, msg]);

      if (incomingUsername) {
        addMember(incomingUsername);
      }
    };

    socket.on("message", handleMessage);

    // ==========================================================
    // JOIN ROOM
    // ==========================================================

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
  // SEARCH INPUT AUTO FOCUS
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

  const renderHighlightedText = (text) => {
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
  // SEND MESSAGE
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

    if (!message.trim() && !selectedFile) {
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

    // ==========================================================
    // DOCUMENT
    // ==========================================================

    if (selectedFile) {
      newMessage.fileName =
        selectedFile.name;

      newMessage.fileType =
        selectedFile.type;

      newMessage.fileData =
        selectedFile.data;
    }

    // ==========================================================
    // SEND TO BACKEND
    // ==========================================================

    socket.emit("send", newMessage);

    console.log(
      "Message sent:",
      newMessage
    );

    // Backend does not return sender's own message.
    setMessages((prev) => [
      ...prev,
      newMessage,
    ]);

    addMember(cleanUsername);

    setMessage("");
    setSelectedFile(null);
    setShowEmojiPicker(false);
    setSelectedMessageIndex(null);
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
  // DOCUMENT SELECT
  // ============================================================

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    // TODO BACKEND:
    // Production mein file backend/cloud storage par upload hogi
    // aur Socket.IO ke through sirf file URL send hoga.

    if (file.size > 5 * 1024 * 1024) {
      alert(
        "Please select a document smaller than 5 MB."
      );

      e.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setSelectedFile({
        name: file.name,
        type:
          file.type ||
          "application/octet-stream",
        data: reader.result,
      });
    };

    reader.readAsDataURL(file);

    e.target.value = "";
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
  };

  // ============================================================
  // OPEN DOCUMENT
  // ============================================================
  //
  // FIX FOR about:blank
  //
  // Data URL ko direct window.open karne ke bajaye
  // Blob URL create kiya ja raha hai.
  //
  // Images / PDFs browser ke new tab mein properly open honge.
  //
  // ============================================================

  const openDocumentInNewTab = (
    fileData,
    fileType
  ) => {
    if (!fileData) {
      return;
    }

    try {
      const base64Data =
        fileData.split(",")[1];

      if (!base64Data) {
        const newTab = window.open(
          fileData,
          "_blank"
        );

        if (!newTab) {
          alert(
            "Please allow pop-ups for this chat."
          );
        }

        return;
      }

      const byteCharacters =
        atob(base64Data);

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

      const byteArray = new Uint8Array(
        byteNumbers
      );

      const blob = new Blob(
        [byteArray],
        {
          type:
            fileType ||
            "application/octet-stream",
        }
      );

      const blobUrl =
        URL.createObjectURL(blob);

      const newTab = window.open(
        blobUrl,
        "_blank"
      );

      if (!newTab) {
        URL.revokeObjectURL(blobUrl);

        alert(
          "Please allow pop-ups for this chat to open the document."
        );

        return;
      }

      newTab.focus();

      // Keep the Blob alive while the new tab loads.
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 60000);
    } catch (error) {
      console.error(
        "Document open error:",
        error
      );

      // Fallback
      const newTab = window.open(
        fileData,
        "_blank"
      );

      if (!newTab) {
        alert(
          "Unable to open this document. Please allow pop-ups."
        );
      }
    }
  };

  // ============================================================
  // MESSAGE SELECT
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

  // ============================================================
  // DELETE MESSAGE
  // ============================================================

  const handleDeleteMessage = (
    messageIndex
  ) => {
    setDeletedMessages((prev) => {
      if (prev.includes(messageIndex)) {
        return prev;
      }

      return [...prev, messageIndex];
    });

    // Remove from favorites also.
    setFavoriteMessages((prev) =>
      prev.filter(
        (index) => index !== messageIndex
      )
    );

    setSelectedMessageIndex(null);

    // TODO BACKEND:
    // Teacher backend currently has no delete-message event.
    // Current deletion is ONLY on this browser/user side.
  };

  // ============================================================
  // FAVORITE MESSAGE
  // ============================================================

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
  // FAVORITE CHAT CARD
  // ============================================================

  const openFavoriteChat = () => {
    setShowMenu(false);
    setShowFavoriteCard(true);
  };

  // ============================================================
  // GROUP INFO
  // ============================================================

  const openGroupInfo = () => {
    setShowMenu(false);
    setShowGroupInfo(true);
  };

  // ============================================================
  // SEARCH
  // ============================================================

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

  // ============================================================
  // HEADER MEMBERS
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
  // FAVORITE MESSAGE LIST
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

  return (
    <div className="h-screen w-full flex flex-col bg-[#f3f4f6] overflow-hidden">

      {/* ========================================================
          HEADER
      ======================================================== */}

      <header className="shrink-0 bg-[#F97316] text-white shadow-md z-40">

        <div className="w-full px-4 sm:px-6 py-3 flex items-center justify-between gap-4">

          {/* GROUP IDENTITY */}

          <div className="flex items-center gap-3 min-w-0">

            <InitialAvatar
              name={room}
              large
            />

            <div className="min-w-0">

              {/* GROUP LABEL */}

              <span className="block text-[10px] sm:text-xs font-bold uppercase tracking-[0.18em] text-orange-100">
                GROUP
              </span>

              {/* ACTUAL GROUP NAME */}

              <h2 className="text-lg sm:text-xl font-extrabold truncate leading-tight">
                {room}
              </h2>

              {/* MEMBERS */}

              <p className="text-xs text-orange-100 truncate mt-0.5">
                {headerMemberText}
              </p>

            </div>
          </div>

          {/* HEADER ACTIONS */}

          <div className="flex items-center gap-1 shrink-0">

            {/* SEARCH */}

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

            {/* SEARCH BUTTON */}

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

            {/* THREE DOTS */}

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

                  {/* GROUP INFO */}

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

                  {/* SEARCH */}

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

                  {/* FAVORITE CHAT */}

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

                  {/* LEAVE GROUP */}

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

                // ==================================================
                // JOIN NOTIFICATION
                // ==================================================

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

                // ==================================================
                // LEAVE NOTIFICATION
                // ==================================================

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

                return (
                  <div
                    key={idx}
                    className={`flex flex-col max-w-[90%] sm:max-w-[70%] ${
                      isOwn
                        ? "ml-auto items-end"
                        : "mr-auto items-start"
                    }`}
                    onClick={(e) =>
                      e.stopPropagation()
                    }
                  >

                    {/* SENDER */}

                    <span className="text-xs font-semibold text-slate-500 mb-1 px-1">
                      {isOwn
                        ? "You"
                        : msg.username}
                    </span>

                    {/* MESSAGE ROW */}

                    <div
                      className={`flex items-center gap-2 ${
                        isOwn
                          ? "justify-end"
                          : "justify-start"
                      }`}
                      onClick={(e) =>
                        e.stopPropagation()
                      }
                    >

                      {/* ACTION ICONS */}

                      {isSelected && (
                        <div className="flex items-center gap-1.5 shrink-0">

                          {/* FAVORITE */}

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
                            aria-label={
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
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                          </button>

                          {/* DELETE */}

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
                            aria-label="Delete message"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
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

                      {/* MESSAGE BOX */}

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

                          {/* TEXT */}

                          {msg.text && (
                            <p className="text-[#071F49] break-words whitespace-pre-wrap">
                              {renderHighlightedText(
                                msg.text
                              )}
                            </p>
                          )}

                          {/* DOCUMENT */}

                          {msg.fileData && (
                            <div
                              className={`${
                                msg.text
                                  ? "mt-3"
                                  : ""
                              } rounded-xl bg-white/80 border border-slate-200 p-3 min-w-[220px]`}
                              onClick={(e) =>
                                e.stopPropagation()
                              }
                            >

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
                                    <path d="M8 13h8" />
                                    <path d="M8 17h5" />
                                  </svg>

                                </div>

                                <div className="min-w-0 flex-1">

                                  <p className="font-semibold text-sm text-[#071F49] truncate">
                                    {msg.fileName}
                                  </p>

                                  <p className="text-xs text-slate-400">
                                    Document
                                  </p>

                                </div>

                              </div>

                              {/* OPEN IN NEW TAB */}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();

                                  openDocumentInNewTab(
                                    msg.fileData,
                                    msg.fileType
                                  );
                                }}
                                className="w-full block mt-3 text-center rounded-lg bg-[#F97316] hover:bg-orange-600 text-white text-xs font-semibold py-2 transition"
                              >
                                Open Document
                              </button>

                            </div>
                          )}

                          {/* TIME */}

                          <div className="absolute right-2 bottom-1.5 flex items-center gap-1">

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

      <footer className="shrink-0 bg-white border-t border-slate-200 px-3 sm:px-6 py-3 relative">

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

        {/* SELECTED DOCUMENT */}

        {selectedFile && (
          <div className="mb-2 flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2">

            <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">

              <svg
                width="18"
                height="18"
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

              <p className="text-sm font-semibold text-[#071F49] truncate">
                {selectedFile.name}
              </p>

              <p className="text-xs text-slate-400">
                Ready to send
              </p>

            </div>

            <button
              type="button"
              onClick={
                removeSelectedFile
              }
              className="w-8 h-8 rounded-lg hover:bg-white text-slate-400 hover:text-red-600 transition"
              title="Remove document"
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

          {/* DOCUMENT */}

          <button
            type="button"
            onClick={() =>
              fileInputRef.current?.click()
            }
            className="shrink-0 w-10 h-10 rounded-xl bg-orange-100 hover:bg-orange-200 text-[#F97316] flex items-center justify-center transition"
            aria-label="Attach document"
            title="Attach document"
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
            onChange={
              handleFileChange
            }
            className="hidden"
          />

          {/* MESSAGE INPUT */}

          <input
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={(e) =>
              setMessage(
                e.target.value
              )
            }
            className="flex-1 min-w-0 rounded-xl border-2 border-orange-300 bg-orange-50/30 px-4 py-2.5 text-[#071F49] placeholder:text-slate-400 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 focus:bg-white transition"
            autoFocus
          />

          {/* SEND */}

          <button
            type="submit"
            disabled={
              !hasMessage &&
              !selectedFile
            }
            className={`shrink-0 px-5 py-2.5 rounded-xl text-white font-semibold shadow-sm transition ${
              hasMessage ||
              selectedFile
                ? "bg-[#F97316] hover:bg-orange-600"
                : "bg-orange-200 cursor-not-allowed"
            }`}
          >
            Send
          </button>

        </form>

      </footer>

      {/* ========================================================
          GROUP INFO MODAL
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

            {/* ORANGE RIBBON */}

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

            {/* GROUP IDENTITY */}

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

            {/* MEMBER SEARCH */}

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

            {/* MEMBERS */}

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
          FAVORITE MESSAGES CARD
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

            {/* HEADER */}

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

            {/* FAVORITE LIST */}

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