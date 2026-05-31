import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface MultiplayerPlayer {
  username: string;
  isHost: boolean;
  score: number;
  accuracy: number;
  combo: number;
  failed: boolean;
  ready: boolean;
  joinedAt: number;
}

export interface QueueItem {
  beatmapSetId: number;
  beatmapId: number;
  addedBy: string;
  addedAt: number;
}

export interface MultiplayerRoom {
  id: string;
  host: string;
  players: MultiplayerPlayer[];
  maxPlayers: number;
  queue: QueueItem[];
  currentBeatmapId: number | null;
  isPlaying: boolean;
  createdAt: number;
}

interface MultiplayerStore {
  currentRoom: MultiplayerRoom | null;
  roomList: Array<Omit<MultiplayerRoom, "players" | "queue">>;
  currentUsername: string;
  isConnected: boolean;

  // Room actions
  setCurrentRoom: (room: MultiplayerRoom) => void;
  clearCurrentRoom: () => void;
  setRoomList: (rooms: any[]) => void;
  updateRoom: (room: MultiplayerRoom) => void;

  // Player actions
  setUsername: (username: string) => void;
  updatePlayerScore: (
    username: string,
    score: number,
    accuracy: number,
    combo: number,
    failed: boolean
  ) => void;

  // Connection status
  setConnected: (connected: boolean) => void;
}

export const useMultiplayerStore = create<MultiplayerStore>()(
  persist(
    (set) => ({
      currentRoom: null,
      roomList: [],
      currentUsername: "",
      isConnected: false,

      setCurrentRoom: (room) => set({ currentRoom: room }),
      clearCurrentRoom: () => set({ currentRoom: null }),
      setRoomList: (roomList) => set({ roomList }),

      updateRoom: (room) =>
        set((state) => ({
          currentRoom: state.currentRoom?.id === room.id ? room : state.currentRoom,
        })),

      setUsername: (username) => set({ currentUsername: username }),

      updatePlayerScore: (username, score, accuracy, combo, failed) =>
        set((state) => {
          if (!state.currentRoom) return state;

          return {
            currentRoom: {
              ...state.currentRoom,
              players: state.currentRoom.players.map((p) =>
                p.username === username
                  ? { ...p, score, accuracy, combo, failed }
                  : p
              ),
            },
          };
        }),

      setConnected: (connected) => set({ isConnected: connected }),
    }),
    {
      name: "multiplayer-store",
      partialize: (state) => ({
        currentUsername: state.currentUsername,
      }),
    }
  )
);

export const useMultiplayerUsername = () => {
  const { currentUsername, setUsername } = useMultiplayerStore();
  return { username: currentUsername, setUsername };
};
