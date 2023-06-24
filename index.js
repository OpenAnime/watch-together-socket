import * as dotenv from "dotenv";
import * as cache from "./cache.js";
const ptr = cache.new_cache();
cache.start_cache(ptr);
dotenv.config();

import http from "node:http";
import { Server } from "socket.io";

import {
  addUser,
  deleteUser,
  getUsers,
  getUserBySocket,
  getUserById,
  getUserByToken,
} from "./users.js";

export function getMainCache() {
  return ptr;
}

const options = {
  cors: true,
  origins: ["http://127.0.0.1:3000"],
};

const server = http.createServer();
const io = new Server(server, options);

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
io.on("connection", (socket) => {
  socket.on("login", async ({ token, room }, callback) => {
    if (!token)
      return callback({
        error: "Token is required",
      });

    if (!room)
      return callback({
        error: "Room is required",
      });

    const { user, error } = await addUser(socket.id, token, room);

    if (error)
      return callback({
        error,
      });

    const clients = io.sockets.adapter.rooms.get(user.room);

    if (!clients) {
      //make the first person in the room moderator
      user.moderator = true;
    }

    socket.join(user.room);

    socket.in(room).emit("system", {
      content: `${user.username} odaya katıldı 👋`,
      system: true,
      author: "Mari",
      color: "#0cdd0c",
      avatar:
        "https://cdn.discordapp.com/attachments/859084187394637834/1102619724044587108/mari-chan.cs_human_version_9e5b74e8-aee5-4e86-915b-516370fba1f3_2.png",
    });
    io.in(room).emit("users", getUsers(room));
    const startFrom =
      cache.get(ptr, `${user.room}_latestTimestamp`)?.value ?? 0;

    callback({
      message: "success",
      startFrom,
    });
  });

  socket.on("updatePermission", (args) => {
    if (
      typeof args?.removeMod == "boolean" &&
      typeof args?.makeMod == "boolean"
    ) {
      const user = getUserBySocket(socket.id);
      if (user.moderator) {
        let target = getUserById(args.userID, user.room);
        if (args.removeMod) {
          delete target.moderator;

          io.in(user.room).emit("users", getUsers(user.room));
        } else if (args.makeMod) {
          target.moderator = true;

          io.in(user.room).emit("users", getUsers(user.room));
        }
      }
    }
  });

  socket.on("moderationOperation", (args) => {
    let user = getUserBySocket(socket.id);
    let target = getUserById(args.userID, user.room);
    if (!user?.moderator) return;
    if (args?.operation == "mute") {
      console.log(target);
      target.muted = true;
      cache.add(ptr, `mutedState_${args.userID}_${user.room}`, true);
    } else if (args?.operation == "unmute") {
      target.muted = false;
      cache.remove(ptr, `mutedState_${args.userID}_${user.room}`);
    } else if (args?.operation == "kick") {
      const getTargetSocket = io.sockets.sockets.get(target.id);
      getTargetSocket.disconnect();
    } else if (args?.operation == "ban") {
      const getTargetSocket = io.sockets.sockets.get(target.id);
      cache.add(ptr, `bannedState_${args.userID}_${user.room}`, true);
      getTargetSocket.disconnect();
    } else if (args?.operation == "unban") {
      cache.remove(ptr, `bannedState_${args.userID}_${user.room}`);
    }

    io.in(user.room).emit("users", getUsers(user.room));
  });

  socket.on("sendMessage", (message) => {
    if (message.trim().length == 0) return;
    let user = JSON.parse(JSON.stringify(getUserBySocket(socket.id)));
    if (user.muted) return;
    console.log(user);
    user.id = undefined;
    user.author = user.username;
    console.log(user);
    io.in(user.room).emit("message", {
      ...user,
      content: message,
    });
  });

  socket.on("timestamp", (timestamp) => {
    console.log(timestamp);
    const user = getUserBySocket(socket.id);
    if (isNaN(timestamp)) return;
    const checkAlreadyStored = cache.get(ptr, `${user.room}_latestTimestamp`);
    if (checkAlreadyStored) {
      if (checkAlreadyStored.value < timestamp) {
        cache.add(ptr, `${user.room}_latestTimestamp`, timestamp);
      }
    } else {
      cache.add(ptr, `${user.room}_latestTimestamp`, timestamp);
    }
  });

  socket.on("playerState", (state) => {
    const user = getUserBySocket(socket.id);
    if ("playing" in state) {
      console.log("içinde");
      socket.broadcast.to(user.room).emit("playerState", {
        playing: state.playing,
        changedBy: {
          username: user.username,
          id: user.id,
        },
      });
    }
  });

  socket.on("playerTimestamp", (timestamp) => {
    const user = getUserBySocket(socket.id);
    if ("timestamp" in timestamp) {
      socket.broadcast.to(user.room).emit("playerTimestamp", {
        timestamp: timestamp.timestamp,
        changedBy: {
          username: user.username,
          id: user.id,
        },
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
    const user = deleteUser(socket.id);
    if (user) {
      io.in(user.room).emit("notification", {
        title: "Someone just left",
        description: `${user.username} just left the room`,
      });
      io.in(user.room).emit("users", getUsers(user.room));
    }
  });
});
