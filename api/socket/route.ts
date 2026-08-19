import { Server } from "socket.io";

export const dynamic = "force-dynamic";

let io: Server;

export async function GET() {
  if (!io) {
    io = new Server({
      cors: { origin: "*" },
    });
    io.on("connection", (socket) => {
      console.log("👑 Admin connected:", socket.id);
    });
    // guardamos global
    (global as any).io = io;
  }
  return Response.json({ ok: true });
}