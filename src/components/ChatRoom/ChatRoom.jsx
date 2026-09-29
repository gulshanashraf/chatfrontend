import { useEffect, useMemo, useRef, useState } from "react";
import EmojiPicker from "emoji-picker-react";
import styles from "./ChatRoom.module.css";

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

const REACTION_EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "🙏"];

const DEFAULT_MEMBERS = [
  { name: "Ali", online: true },
  { name: "Gulshan", online: true },
  { name: "Sara", online: false },
  { name: "Ahmed", online: true },
];

const LIGHT_BUBBLE_COLORS = [
  "#EDEEF0",
  "#6D849E",
  "#999EB0",
  "#C1D7A5",
  "#F5A6AB",
  "#92ADD3",
  "#9BBDDD",
  "#F3A773",
  "#F3A773",
];

const DARK_BUBBLE_COLORS = [
  "#263238",
  "#34495E",
  "#3B4A3F",
  "#4A3940",
  "#33465C",
  "#3D4A56",
  "#4B414F",
  "#414A38",
  "#3F4655",
];

function ChatRoom({
  messages = [],
  username = "Gulshan",
  room = "My Group",
  onLeave,
  onDeleteMessage,
  onSendMessage,
}) {
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [isDark, setIsDark] = useState(false);

  const [selectedMessage, setSelectedMessage] = useState(null);
  const [reactionMessage, setReactionMessage] = useState(null);

  const [localMessages, setLocalMessages] = useState(messages);

  const messageEndRef = useRef(null);
  const searchInputRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [localMessages]);

  useEffect(() => {
    if (showSearch) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [showSearch]);

  const members = DEFAULT_MEMBERS;

  const filteredMembers = useMemo(() => {
    return members.filter((member) =>
      member.name.toLowerCase().includes(memberSearch.toLowerCase())
    );
  }, [memberSearch]);

  const visibleMessages = useMemo(() => {
    return localMessages;
  }, [localMessages]);

  const handleSendMessage = () => {
    const text = message.trim();

    if (!text) return;

    const newMessage = {
      id: Date.now(),
      username,
      text,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setLocalMessages((prev) => [...prev, newMessage]);

    // TODO: Backend/Socket.IO integration later.
    if (onSendMessage) {
      onSendMessage(text);
    }

    setMessage("");
    setShowEmojiPicker(false);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEmojiClick = (emojiData) => {
    setMessage((prev) => prev + emojiData.emoji);
  };

  const addQuickEmoji = (emoji) => {
    setMessage((prev) => prev + emoji);
  };

  const handleTextareaChange = (e) => {
    setMessage(e.target.value);

    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const handleDeleteMessage = (messageId) => {
    setLocalMessages((prev) =>
      prev.filter((item) => item.id !== messageId)
    );

    // TODO: Backend delete-message event later.
    if (onDeleteMessage) {
      onDeleteMessage(messageId);
    }

    setSelectedMessage(null);
  };

  const getBubbleColor = (index) => {
    const colors = isDark ? DARK_BUBBLE_COLORS : LIGHT_BUBBLE_COLORS;
    return colors[index % colors.length];
  };

  const highlightSearchText = (text) => {
    if (!searchText.trim()) {
      return text;
    }

    const parts = text.split(
      new RegExp(`(${searchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi")
    );

    return parts.map((part, index) => {
      const isMatch =
        part.toLowerCase() === searchText.trim().toLowerCase();

      return isMatch ? (
        <mark key={index} className={styles.highlight}>
          {part}
        </mark>
      ) : (
        <span key={index}>{part}</span>
      );
    });
  };

  const leaveGroup = () => {
    setShowMenu(false);

    // TODO: Backend leave-group event later.
    if (onLeave) {
      onLeave();
    }
  };

  return (
    <div
      className={`${styles.chatRoom} ${
        isDark ? styles.darkMode : styles.lightMode
      }`}
    >
      {/* HEADER */}
      <header className={styles.header}>
        <div className={styles.groupInfo}>
          <div className={styles.groupAvatar}>
            {room.charAt(0).toUpperCase()}
          </div>

          <div className={styles.groupText}>
            <div className={styles.groupTitleRow}>
              <span className={styles.groupLabel}>GROUP</span>
              <span className={styles.groupName}>{room}</span>
            </div>

            <div className={styles.membersText}>
              {members.map((member) => member.name).join(", ")}
            </div>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button
            className={styles.iconButton}
            onClick={() => {
              setShowSearch((prev) => !prev);
              setShowMenu(false);
            }}
            title="Search"
          >
            🔍
          </button>

          <button
            className={styles.iconButton}
            onClick={() => setIsDark((prev) => !prev)}
            title="Change theme"
          >
            {isDark ? "☀️" : "🌙"}
          </button>

          <button
            className={styles.iconButton}
            onClick={() => setShowMenu((prev) => !prev)}
            title="Menu"
          >
            ⋮
          </button>

          {showMenu && (
            <div className={styles.menu}>
              <button
                onClick={() => {
                  setShowGroupInfo(true);
                  setShowMenu(false);
                }}
              >
                👥 Group Info
              </button>

              <button
                onClick={() => {
                  setShowSearch(true);
                  setShowMenu(false);
                }}
              >
                🔍 Search
              </button>

              <button
                onClick={() => {
                  setShowMenu(false);
                }}
              >
                ✕ Close Chat
              </button>

              <button
                className={styles.leaveButton}
                onClick={leaveGroup}
              >
                🚪 Leave Group
              </button>
            </div>
          )}
        </div>
      </header>

      {/* SEARCH BAR */}
      {showSearch && (
        <div className={styles.searchBar}>
          <span>🔍</span>

          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search messages..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />

          <button
            onClick={() => {
              setSearchText("");
              setShowSearch(false);
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* CHAT AREA */}
      <main className={styles.chatArea}>
        {visibleMessages.length === 0 ? (
          <div className={styles.emptyChat}>
            <div className={styles.emptyIcon}>💬</div>
            <h3>No messages yet</h3>
            <p>Start the conversation with your group.</p>
          </div>
        ) : (
          visibleMessages.map((item, index) => {
            const isOwnMessage =
              item.username?.toLowerCase() === username?.toLowerCase();

            return (
              <div
                key={item.id ?? index}
                className={`${styles.messageRow} ${
                  isOwnMessage ? styles.ownRow : ""
                }`}
              >
                <div
                  className={`${styles.messageBubble} ${
                    isOwnMessage ? styles.ownBubble : ""
                  }`}
                  style={{
                    backgroundColor: getBubbleColor(index),
                  }}
                >
                  {!isOwnMessage && (
                    <div className={styles.senderName}>
                      {item.username || "User"}
                    </div>
                  )}

                  <div className={styles.messageContent}>
                    {highlightSearchText(
                      item.text || item.message || ""
                    )}
                  </div>

                  <div className={styles.messageBottom}>
                    <span className={styles.time}>
                      {item.timestamp || item.time || ""}
                    </span>

                    {isOwnMessage && (
                      <span className={styles.readStatus}>✓✓</span>
                    )}
                  </div>

                  <div className={styles.messageActions}>
                    <button
                      onClick={() => setReactionMessage(item.id)}
                      title="React"
                    >
                      😊
                    </button>

                    <button
                      onClick={() => setSelectedMessage(item.id)}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>

                  {reactionMessage === item.id && (
                    <div className={styles.reactionPopup}>
                      {REACTION_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => {
                            setReactionMessage(null);
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedMessage === item.id && (
                    <div className={styles.deletePopup}>
                      <button
                        onClick={() => handleDeleteMessage(item.id)}
                      >
                        Delete message
                      </button>

                      <button
                        onClick={() => setSelectedMessage(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        <div ref={messageEndRef} />
      </main>

      {/* COMPOSER */}
      <footer className={styles.composer}>
        <div className={styles.emojiArea}>
          <button
            className={styles.composerIcon}
            onClick={() =>
              setShowEmojiPicker((prev) => !prev)
            }
            title="Emoji"
          >
            😊
          </button>

          {showEmojiPicker && (
            <div className={styles.emojiPicker}>
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                theme={isDark ? "dark" : "light"}
                width={320}
                height={400}
              />
            </div>
          )}
        </div>

        <div className={styles.quickEmojiRow}>
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => addQuickEmoji(emoji)}
              className={styles.quickEmoji}
            >
              {emoji}
            </button>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message"
          rows={1}
        />

        <button
          className={styles.sendButton}
          onClick={handleSendMessage}
          disabled={!message.trim()}
          title="Send"
        >
          ➤
        </button>
      </footer>

      {/* GROUP INFO MODAL */}
      {showGroupInfo && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowGroupInfo(false)}
        >
          <div
            className={styles.groupModal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.modalLabel}>GROUP</span>
                <h2>{room}</h2>
              </div>

              <button
                className={styles.closeModal}
                onClick={() => setShowGroupInfo(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.memberCount}>
              {members.length} members
            </div>

            <div className={styles.memberSearch}>
              <span>🔍</span>

              <input
                type="text"
                placeholder="Search members..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
              />
            </div>

            <div className={styles.membersList}>
              {filteredMembers.map((member) => (
                <div
                  className={styles.memberItem}
                  key={member.name}
                >
                  <div className={styles.memberAvatar}>
                    {member.name.charAt(0)}
                  </div>

                  <div className={styles.memberDetails}>
                    <strong>
                      {member.name}
                      {member.name === username && " (You)"}
                    </strong>

                    <span>
                      <i
                        className={`${styles.statusDot} ${
                          member.online
                            ? styles.online
                            : styles.offline
                        }`}
                      />
                      {member.online ? "Online" : "Offline"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatRoom;