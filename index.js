import express from "express";
import { createServer } from "node:http";
import cors from "cors";
import { Server } from "socket.io";

const app = express();
const server = createServer(app);

const corsOptions = {
  origin: "http://localhost:5173",
  methods: ["GET", "POST"],
};

app.use(cors(corsOptions));

const io = new Server(server, {
  cors: corsOptions,
});

app.get("/", (_req, res) => {
  res.send("<h1>Whiteboard Socket Server Running</h1>");
});

const rooms = new Map();

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("join", (room) => {
    socket.join(room);
    console.log(`User ${socket.id} joined room: ${room}`);

    if (!rooms.has(room)) {
      rooms.set(room, []);
    }

    socket.to(room).emit("user:joined", { userId: socket.id });

    const currentStrokes = rooms.get(room) || [];
    socket.emit("room:init", currentStrokes);
  });

  socket.on("stroke:add", (newStroke, room) => {
    if (!room) return;

    const roomStrokes = rooms.get(room) || [];
    roomStrokes.push(newStroke);
    rooms.set(room, roomStrokes);

    socket.to(room).emit("stroke:add", newStroke);
  });

  socket.on("stroke:remove", (strokeId, room) => {
    if (!room) return;

    const roomStrokes = rooms.get(room);
    if (!roomStrokes) return;

    // Filtramos por ID (así cada usuario borra solo su trazo y no el del vecino)
    const updatedStrokes = roomStrokes.filter((s) => s.id !== strokeId);
    rooms.set(room, updatedStrokes);

    socket.to(room).emit("stroke:remove", strokeId);
  });
  socket.on("disconnecting", () => {
    for (const room of socket.rooms) {
      if (room === socket.id) continue;

      const clientsInRoom = io.sockets.adapter.rooms.get(room);
      if (clientsInRoom && clientsInRoom.size === 1) {
        rooms.delete(room);
        console.log(`Room ${room} empty -> state cleaned from memory`);
      }
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

server.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
