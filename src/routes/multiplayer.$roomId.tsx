import { createFileRoute } from "@tanstack/react-router";
import { MultiplayerRoom } from "@/components/multiplayer/multiplayerRoom";

export const Route = createFileRoute("/multiplayer/$roomId")({
  component: MultiplayerRoomPage,
});

function MultiplayerRoomPage() {
  return <MultiplayerRoom />;
}
