import React, { useState } from "react";

// SIR'S CODE
const JoinGroup = ({ onJoin }) => {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (username.trim() && room.trim()) {
      onJoin({
        username: username.trim(),
        room: room.trim(),
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-orange-50 p-4 sm:p-6">

      {/* ADDITIONAL: Custom white card design for the Join Group screen. */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg shadow-orange-100/60 overflow-hidden border-0">

        {/* ADDITIONAL: Decorative orange and dark-blue top accent. */}
        <div className="h-1.5 bg-gradient-to-r from-orange-500 to-[#071F49]" />

        <div className="p-6 sm:p-8">

          <div className="text-center mb-6">

            {/* ADDITIONAL: Chat icon for visual representation of the chat feature. */}
            <div className="mx-auto mb-3 h-11 w-11 rounded-xl bg-orange-500 text-white flex items-center justify-center text-xl shadow-md shadow-orange-200">
              💬
            </div>

            {/* ADDITIONAL: Custom dark-blue heading style. */}
            <h2 className="text-2xl font-bold text-[#071F49]">
              Join a Chat Group
            </h2>

          </div>

          <form
            className="space-y-4"
            onSubmit={handleSubmit}
          >

            {/* ADDITIONAL: Username field. */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-[#071F49] mb-1.5"
              >
                Username
              </label>

              <input
                id="username"
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full rounded-xl border-2 border-orange-400 bg-orange-50/30 px-4 py-2.5 text-[#071F49] placeholder:text-slate-400 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 focus:bg-white"
              />
            </div>

            {/* ADDITIONAL: Group name field. */}
            <div>
              <label
                htmlFor="room"
                className="block text-sm font-medium text-[#071F49] mb-1.5"
              >
                Group Name
              </label>

              <input
                id="room"
                type="text"
                placeholder="Group Name"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                required
                className="w-full rounded-xl border-2 border-orange-400 bg-orange-50/30 px-4 py-2.5 text-[#071F49] placeholder:text-slate-400 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 focus:bg-white"
              />
            </div>

            {/* ADDITIONAL: Custom orange Join button styling. */}
            <button
              type="submit"
              className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold py-2.5 shadow-md shadow-orange-200 transition"
            >
              Join
            </button>

          </form>
        </div>
      </div>
    </div>
  );
};

export default JoinGroup;