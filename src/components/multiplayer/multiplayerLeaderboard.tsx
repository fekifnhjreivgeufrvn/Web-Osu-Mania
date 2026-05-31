import { useMemo } from "react";
import { useMultiplayerStore } from "@/stores/multiplayerStore";

export function MultiplayerLeaderboard() {
  const { currentRoom } = useMultiplayerStore();

  const sortedPlayers = useMemo(() => {
    if (!currentRoom) return [];
    return [...currentRoom.players].sort((a, b) => b.score - a.score);
  }, [currentRoom?.players]);

  if (!currentRoom) return null;

  return (
    <div className="absolute top-4 right-4 bg-black bg-opacity-80 border-2 border-purple-500 rounded p-4 min-w-80 z-50">
      <h3 className="text-white font-bold mb-3 text-lg">Leaderboard</h3>
      <div className="space-y-2">
        {sortedPlayers.map((player, index) => (
          <div
            key={player.username}
            className={`flex justify-between items-center p-2 rounded ${
              index === 0
                ? "bg-yellow-500 bg-opacity-20 border border-yellow-500"
                : "bg-gray-700 bg-opacity-50"
            }`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-gray-400 w-6">#{index + 1}</span>
                <span
                  className={`font-bold ${
                    index === 0 ? "text-yellow-300" : "text-white"
                  }`}
                >
                  {player.username}
                </span>
                {player.failed && (
                  <span className="text-red-400 text-xs">(FAILED)</span>
                )}
              </div>
              <div className="text-xs text-gray-400 ml-8">
                Acc: {(player.accuracy * 100).toFixed(1)}% | Combo:{" "}
                {player.combo}
              </div>
            </div>
            <div className="text-right">
              <div className="text-yellow-300 font-bold text-lg">
                {player.score.toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
