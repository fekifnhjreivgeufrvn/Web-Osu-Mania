import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

export const Route = createFileRoute("/api/multiplayer/room/$roomId/queue")({
  server: {
    handlers: {
      // Add to queue
      POST: async ({ request, params }) => {
        try {
          const { roomId } = params;
          const { username, beatmapSetId, beatmapId } = await request.json();

          if (!username || !beatmapSetId || !beatmapId) {
            return new Response("Missing required fields", { status: 400 });
          }

          const roomData = await env.MULTIPLAYER_ROOMS.get(roomId);
          if (!roomData) {
            return new Response("Room not found", { status: 404 });
          }

          const room = JSON.parse(roomData);

          // Add to queue
          room.queue.push({
            beatmapSetId,
            beatmapId,
            addedBy: username,
            addedAt: Date.now(),
          });

          await env.MULTIPLAYER_ROOMS.put(roomId, JSON.stringify(room));

          return new Response(JSON.stringify(room.queue), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("Error adding to queue:", error);
          return new Response("Server error", { status: 500 });
        }
      },

      // Remove from queue (only if added by requesting user)
      DELETE: async ({ request, params }) => {
        try {
          const { roomId } = params;
          const { username, index } = await request.json();

          if (!username || index === undefined) {
            return new Response("Missing required fields", { status: 400 });
          }

          const roomData = await env.MULTIPLAYER_ROOMS.get(roomId);
          if (!roomData) {
            return new Response("Room not found", { status: 404 });
          }

          const room = JSON.parse(roomData);

          // Check if user added this item
          if (room.queue[index]?.addedBy !== username) {
            return new Response("You can only delete your own queued maps", {
              status: 403,
            });
          }

          room.queue.splice(index, 1);

          await env.MULTIPLAYER_ROOMS.put(roomId, JSON.stringify(room));

          return new Response(JSON.stringify(room.queue), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("Error removing from queue:", error);
          return new Response("Server error", { status: 500 });
        }
      },
    },
  },
});
