import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

export const Route = createFileRoute("/api/multiplayer/room/$roomId")({
  server: {
    handlers: {
      // Get room details
      GET: async ({ params }) => {
        try {
          const { roomId } = params;
          const roomData = await env.MULTIPLAYER_ROOMS.get(roomId);

          if (!roomData) {
            return new Response("Room not found", { status: 404 });
          }

          return new Response(roomData, {
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("Error fetching room:", error);
          return new Response("Server error", { status: 500 });
        }
      },

      // Join room
      POST: async ({ request, params }) => {
        try {
          const { roomId } = params;
          const { username } = await request.json();

          if (!username) {
            return new Response("Username required", { status: 400 });
          }

          const roomData = await env.MULTIPLAYER_ROOMS.get(roomId);
          if (!roomData) {
            return new Response("Room not found", { status: 404 });
          }

          const room = JSON.parse(roomData);

          // Check if room is full
          if (room.players.length >= room.maxPlayers) {
            return new Response("Room is full", { status: 400 });
          }

          // Check if username already exists in room
          if (room.players.some((p: any) => p.username === username)) {
            return new Response("Username already exists in this room", {
              status: 400,
            });
          }

          // Check if room is playing
          if (room.isPlaying) {
            return new Response("Room is currently playing", { status: 400 });
          }

          // Add player to room
          room.players.push({
            username,
            isHost: false,
            score: 0,
            accuracy: 0,
            combo: 0,
            failed: false,
            ready: false,
            joinedAt: Date.now(),
          });

          await env.MULTIPLAYER_ROOMS.put(roomId, JSON.stringify(room));

          return new Response(JSON.stringify(room), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("Error joining room:", error);
          return new Response("Server error", { status: 500 });
        }
      },

      // Leave room / Update player status
      PUT: async ({ request, params }) => {
        try {
          const { roomId } = params;
          const { username, action, ...updateData } = await request.json();

          if (!username) {
            return new Response("Username required", { status: 400 });
          }

          const roomData = await env.MULTIPLAYER_ROOMS.get(roomId);
          if (!roomData) {
            return new Response("Room not found", { status: 404 });
          }

          const room = JSON.parse(roomData);
          const playerIndex = room.players.findIndex(
            (p: any) => p.username === username
          );

          if (playerIndex === -1) {
            return new Response("Player not in room", { status: 404 });
          }

          if (action === "leave") {
            room.players.splice(playerIndex, 1);

            // If host leaves, assign new host or delete room
            if (room.host === username) {
              if (room.players.length > 0) {
                room.host = room.players[0].username;
                room.players[0].isHost = true;
              } else {
                await env.MULTIPLAYER_ROOMS.delete(roomId);
                return new Response(JSON.stringify({ deleted: true }), {
                  headers: { "Content-Type": "application/json" },
                });
              }
            }
          } else if (action === "updateScore") {
            // Update player score, accuracy, combo, failed status
            room.players[playerIndex] = {
              ...room.players[playerIndex],
              ...updateData,
            };
          } else if (action === "toggleReady") {
            room.players[playerIndex].ready = !room.players[playerIndex].ready;
          }

          await env.MULTIPLAYER_ROOMS.put(roomId, JSON.stringify(room));

          return new Response(JSON.stringify(room), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("Error updating room:", error);
          return new Response("Server error", { status: 500 });
        }
      },
    },
  },
});
