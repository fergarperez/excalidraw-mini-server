import express from "express";
import { createServer } from "node:http";
import cors from "cors";
import { Server } from "socket.io";
import { Stroke } from "./stroke";

const app = express();
const server = createServer(app);

const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  methods: ["GET", "POST"],
};

app.use(cors(corsOptions));

const io = new Server(server, {
  cors: corsOptions,
});

app.get("/", (req, res) => {
  res.send("<h1>Hello world</h1>");
});

let strokes = [];

io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("draw", (data, room) => {
    console.log("draw event received:", data);

    strokes = data;
    if (room) {
      socket.to(room).emit("draw", data);
    } else {
      socket.broadcast.emit("draw", data);
    }
  });

  socket.on("join", (room) => {
    socket.join(room);
    console.log(`User joined room: ${room}`);
    // broadcast to other users in the room that a new user has joined but no need to send the message back to the user who just joined
    socket
      .to(room)
      .emit("hello", { message: "A new user has joined the room." });

    socket.to(room).emit("draw", strokes);
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

server.listen(3000, () => {
  console.log("server running at http://localhost:3000");
});
