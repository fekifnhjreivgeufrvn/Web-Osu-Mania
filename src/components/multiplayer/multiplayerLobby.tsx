import { useEffect, useState } from "react";
import { useMultiplayerStore } from "@/stores/multiplayerStore";
import { useNavigate } from "@tanstack/react-router";

export function MultiplayerLobby() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const { currentUsername, setCurrentRoom, setRoomList } = useMultiplayerStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
  }, []);

  async function fetchRooms() {
    try {
      const response = await fetch("/api/multiplayer?action=rooms");
      if (!response.ok) throw new Error("Failed to fetch rooms");
      const data = await response.json();
      setRooms(data);
      setRoomList(data);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
    }
  }

  async function createRoom() {
    if (!currentUsername) {
      setError("Please set your username first");
      return;
    }

    try {
      const response = await fetch("/api/multiplayer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: currentUsername,
          maxPlayers,
        }),
      });

      if (!response.ok) throw new Error("Failed to create room");
      const { roomId } = await response.json();

      // Fetch the new room
      const roomResponse = await fetch(`/api/multiplayer/room.${roomId}`);
      const room = await roomResponse.json();

      setCurrentRoom(room);
      setShowCreateRoom(false);
      navigate({ to: `/multiplayer/$roomId`, params: { roomId } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function joinRoom(roomId: string) {
    if (!currentUsername) {
      setError("Please set your username first");
      return;
    }

    try {
      const response = await fetch(`/api/multiplayer/room.${roomId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: currentUsername }),
      });

      if (!response.ok) {
        const error = await response.text();
        setError(error);
        return;
      }

      const room = await response.json();
      setCurrentRoom(room);
      navigate({ to: `/multiplayer/$roomId`, params: { roomId } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Loading rooms...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-black p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Multiplayer Lobby</h1>

        {error && (
          <div className="bg-red-500 text-white p-4 rounded mb-4">{error}</div>
        )}

        <div className="mb-8">
          <button
            onClick={() => setShowCreateRoom(!showCreateRoom)}
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-3 px-6 rounded"
          >
            {showCreateRoom ? "Cancel" : "Create Room"}
          </button>

          {showCreateRoom && (
            <div className="bg-gray-800 p-6 rounded mt-4">
              <div className="mb-4">
                <label className="text-white block mb-2">Max Players:</label>
                <select
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded"
                >
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                </select>
              </div>
              <button
                onClick={createRoom}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
              >
                Create
              </button>
            </div>
          )}
        </div>

        <div className="grid gap-4">
          {rooms.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              No rooms available. Create one to get started!
            </div>
          ) : (
            rooms.map((room) => (
              <div
                key={room.id}
                className="bg-gray-800 hover:bg-gray-700 transition p-6 rounded cursor-pointer"
                onClick={() => joinRoom(room.id)}
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xl font-bold text-white">
                    Room {room.id}
                  </h3>
                  <span className="text-purple-400">
                    {room.playerCount}/{room.maxPlayers} players
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-300">
                  <div>
                    <span className="text-gray-400">Host:</span> {room.host}
                  </div>
                  <div>
                    <span className="text-gray-400">Queue:</span>{" "}
                    {room.queueLength} songs
                  </div>
                  <div>
                    <span className="text-gray-400">Status:</span>{" "}
                    {room.isPlaying ? "Playing" : "Waiting"}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
