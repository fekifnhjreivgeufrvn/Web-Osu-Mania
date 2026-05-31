import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { useMultiplayerStore } from "@/stores/multiplayerStore";
import type { MultiplayerRoom } from "@/stores/multiplayerStore";

export function MultiplayerRoom() {
  const { roomId } = useParams({ from: "/multiplayer/$roomId" });
  const { currentUsername, currentRoom, setCurrentRoom, updateRoom } =
    useMultiplayerStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Poll for room updates
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const response = await fetch(`/api/multiplayer/room.${roomId}`);
        if (!response.ok) throw new Error("Failed to fetch room");
        const room = await response.json();
        setCurrentRoom(room);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setLoading(false);
      }
    };

    fetchRoom();
    const interval = setInterval(fetchRoom, 1000); // Poll every 1 second
    return () => clearInterval(interval);
  }, [roomId, setCurrentRoom]);

  const leaveRoom = async () => {
    try {
      await fetch(`/api/multiplayer/room.${roomId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: currentUsername,
          action: "leave",
        }),
      });
      navigate({ to: "/multiplayer" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-white">Loading room...</div>;
  }

  if (!currentRoom) {
    return (
      <div className="p-8 text-center text-white">
        <p>Room not found</p>
        <button
          onClick={() => navigate({ to: "/multiplayer" })}
          className="mt-4 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
        >
          Back to Lobby
        </button>
      </div>
    );
  }

  const isHost = currentUsername === currentRoom.host;

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-black p-8">
      <div className="max-w-6xl mx-auto">
        {error && (
          <div className="bg-red-500 text-white p-4 rounded mb-4">{error}</div>
        )}

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Room {currentRoom.id}
            </h1>
            <p className="text-gray-400">Host: {currentRoom.host}</p>
          </div>
          <button
            onClick={leaveRoom}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
          >
            Leave
          </button>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Players */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Players</h2>
            <div className="space-y-2">
              {currentRoom.players.map((player) => (
                <div
                  key={player.username}
                  className="bg-gray-800 p-4 rounded flex justify-between items-center"
                >
                  <div>
                    <p className="text-white font-bold">{player.username}</p>
                    {player.isHost && (
                      <p className="text-yellow-400 text-sm">HOST</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-gray-300">Score: {player.score}</p>
                    <p className="text-gray-300">
                      Accuracy: {(player.accuracy * 100).toFixed(1)}%
                    </p>
                    {player.failed && (
                      <p className="text-red-400 text-sm">FAILED</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Queue */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Queue</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {currentRoom.queue.length === 0 ? (
                <div className="text-gray-400">No maps in queue</div>
              ) : (
                currentRoom.queue.map((item, index) => (
                  <div
                    key={`${item.beatmapId}-${index}`}
                    className="bg-gray-800 p-3 rounded flex justify-between items-center"
                  >
                    <div className="flex-1">
                      <p className="text-white text-sm">
                        Beatmap {item.beatmapId}
                      </p>
                      <p className="text-gray-400 text-xs">
                        Added by {item.addedBy}
                      </p>
                    </div>
                    {item.addedBy === currentUsername && (
                      <button
                        onClick={async () => {
                          try {
                            await fetch(
                              `/api/multiplayer/room.${roomId}.queue`,
                              {
                                method: "DELETE",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                  username: currentUsername,
                                  index,
                                }),
                              }
                            );
                          } catch (err) {
                            setError(
                              err instanceof Error ? err.message : "Unknown error"
                            );
                          }
                        }}
                        className="text-red-400 hover:text-red-300 ml-2"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {isHost && (
          <button
            onClick={() =>
              navigate({
                to: "/",
                search: { multiplayerRoomId: roomId },
              })
            }
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded text-lg"
            disabled={currentRoom.queue.length === 0}
          >
            Start Game
          </button>
        )}
      </div>
    </div>
  );
}
