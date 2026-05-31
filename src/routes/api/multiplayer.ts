import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

export const Route = createFileRoute("/api/multiplayer")({
  server: {
    handlers: {
      // List all active rooms
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const action = url.searchParams.get("action");

          if (action === "rooms") {
            const rooms = await env.MULTIPLAYER_ROOMS.list();
            const roomList = [];

            for (const roomKey of rooms.keys) {
              const roomData = await env.MULTIPLAYER_ROOMS.get(roomKey.name);
              if (roomData) {
                const room = JSON.parse(roomData);
                roomList.push({
                  id: roomKey.name,
                  host: room.host,
                  playerCount: room.players.length,
                  maxPlayers: room.maxPlayers,
                  currentBeatmapId: room.currentBeatmapId,
                  isPlaying: room.isPlaying,
                  queueLength: room.queue.length,
                });
              }
            }

            return new Response(JSON.stringify(roomList), {
              headers: { "Content-Type": "application/json" },
            });
          }

          return new Response("Invalid action", { status: 400 });
        } catch (error) {
          console.error("Error fetching rooms:", error);
          return new Response("Server error", { status: 500 });
        }
      },

      // Create a new room
      POST: async ({ request }) => {
        try {
          const { username, maxPlayers = 4 } = await request.json();

          if (!username) {
            return new Response("Username required", { status: 400 });
          }

          const roomId = generateRoomId();
          const room = {
            id: roomId,
            host: username,
            players: [
              {
                username,
                isHost: true,
                score: 0,
                accuracy: 0,
                combo: 0,
                failed: false,
                ready: false,
                joinedAt: Date.now(),
              },
            ],
            maxPlayers,
            queue: [],
            currentBeatmapId: null,
            isPlaying: false,
            createdAt: Date.now(),
          };

          await env.MULTIPLAYER_ROOMS.put(roomId, JSON.stringify(room), {
            expirationTtl: 3600, // 1 hour
          });

          return new Response(JSON.stringify({ roomId }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("Error creating room:", error);
          return new Response("Server error", { status: 500 });
        }
      },
    },
  },
});

function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
