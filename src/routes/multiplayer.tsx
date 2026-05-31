import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMultiplayerStore } from "@/stores/multiplayerStore";
import { MultiplayerLobby } from "@/components/multiplayer/multiplayerLobby";

export const Route = createFileRoute("/multiplayer")({
  component: MultiplayerPage,
});

function MultiplayerPage() {
  const { currentUsername, setUsername } = useMultiplayerStore();
  const [inputUsername, setInputUsername] = useState(currentUsername);
  const [editing, setEditing] = useState(!currentUsername);

  const handleSetUsername = () => {
    if (inputUsername.trim()) {
      setUsername(inputUsername.trim());
      setEditing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-black">
      {/* Username Header */}
      <div className="bg-gray-900 border-b border-purple-500 p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">osu!mania Multiplayer</h1>

          <div className="flex items-center gap-4">
            {editing ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputUsername}
                  onChange={(e) => setInputUsername(e.target.value)}
                  placeholder="Enter username..."
                  className="px-3 py-2 bg-gray-700 text-white rounded border border-purple-500"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") handleSetUsername();
                  }}
                />
                <button
                  onClick={handleSetUsername}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded font-bold"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-gray-300">Username:</span>
                <span className="text-white font-bold">{currentUsername}</span>
                <button
                  onClick={() => setEditing(true)}
                  className="px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded text-sm"
                >
                  Change
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <MultiplayerLobby />
    </div>
  );
}
