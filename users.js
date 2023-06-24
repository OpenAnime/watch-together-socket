import { request } from "undici";
import { getMainCache } from "./index.js";
import { get } from "./cache.js";
import jwt from "jsonwebtoken";

const users = [];

export const addUser = async (id, token, room) => {
  return new Promise(async (resolve) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const { body } = await request(
        "http://127.0.0.1:1902/api/user/" + decoded.id
      );
      const json = await body.json();

      if (json.error)
        return resolve({
          error: json.error,
        });

      if (!room)
        return resolve({
          error: "Room is required",
        });

      const checkUserIsInRoom = users.find(
        (user) => user.userID === json.id && user.room === room
      );
      if (checkUserIsInRoom)
        return resolve({
          error: "User is already in the same room",
        });

      const muted =
        get(getMainCache(), `mutedState_${json.id}_${room}`)?.value ?? false;
      const banned =
        get(getMainCache(), `bannedState_${json.id}_${room}`)?.value ?? false;

      if (banned) return resolve({ error: "You are banned from this room" });

      const user = {
        id,
        username: json.username,
        userID: json.id,
        avatar: json.avatar,
        room,
        muted,
      };
      users.push(user);
      resolve({
        user,
      });
    } catch (err) {
      console.log(err);
      resolve({
        error: "Token is invalid",
      });
    }
  });
};

export const getUserById = (id, room) => {
  let user = users.find((user) =>
    room ? user.room == room && user.userID == id : user.userID == id
  );
  return user;
};

export const getUserByToken = (token) => {
  const decode = jwt.verify(token, process.env.JWT_SECRET);
  let user = users.find((user) => user.id == decode.id);
  return user;
};

export const getUserBySocket = (id) => {
  let user = users.find((user) => user.id == id);
  return user;
};

export const deleteUser = (id) => {
  const index = users.findIndex((user) => user.id === id);
  if (index !== -1) return users.splice(index, 1)[0];
};

export const getUsers = (room) => {
  const filteredUsers = users.filter((user) => user.room === room);
  if (filteredUsers.length > 0) {
    return filteredUsers.map((user) => {
      const newPtr = JSON.parse(JSON.stringify(user));
      delete newPtr.id;
      return newPtr;
    });
  }
  return [];
};
