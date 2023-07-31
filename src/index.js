import https from 'node:https';
import http from 'node:http';
import { config } from 'dotenv';
import { Server } from 'socket.io';
import * as cache from './util/cache.js';
import { addUser, deleteUser, getUsers, getUserBySocket, getUserById } from './util/users.js';
import fs from 'fs';

config();

const options = {
    cors: true,
    origins: process.env.CORS_ORIGINS,
    key: fs.readFileSync('cert/key.pem'),
    cert: fs.readFileSync('cert/cert.pem'),
};

const baseChatBotProps = {
    system: true,
    author: process.env.CHATBOT_NAME,
    color: process.env.CHATBOT_COLOR,
    avatar: process.env.CHATBOT_AVATAR,
};

function isUp(req, res) {
    const url = req.url;
    if (url == '/alive') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write('works like a charm! :)');
        res.end();
    }
}

const server =
    process.env.PRODUCTION == 'true'
        ? https.createServer(
              {
                  key: fs.readFileSync('cert/key.pem'),
                  cert: fs.readFileSync('cert/cert.pem'),
              },
              isUp
          )
        : http.createServer(isUp);

const io = new Server(server, options);

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '127.0.0.1';

server.listen(PORT, HOST, () => {
    console.log(`Server is running on port ${PORT}`);
});

io.on('connection', (socket) => {
    socket.on('login', async ({ token, roomName, roomPassword, animeMeta }, callback) => {
        if (!token)
            return callback({
                error: 'Token is required',
            });

        if (!roomName)
            return callback({
                error: 'Room name is required',
            });

        if (!roomPassword)
            return callback({
                error: 'Room password is required',
            });

        if (roomPassword.trim().length > 32 || roomName.trim().length > 12) {
            return callback({
                error: 'Room password can be up to 32 characters and room name can be up to 12 characters.',
            });
        }

        roomPassword = roomPassword.trim();
        roomName = roomName.trim();

        if (!animeMeta || animeMeta.toString() !== '[object Object]') {
            return callback({
                error: 'Anime meta is required',
            });
        }

        const getPass = cache.get(`${roomName}_password`);
        if (getPass) {
            if (getPass != roomPassword) {
                return callback({
                    error: 'Wrong password',
                });
            }
        }

        const getVal = cache.get(`${roomName}_animeMeta`);

        if (getVal && JSON.stringify(getVal) != JSON.stringify(animeMeta)) {
            return callback({
                error: 'Fansub, episode, season or slug mismatch',
                redirect: `/anime/${getVal.slug}/${getVal.season}/${getVal.episode}?fansub=${getVal.fansub}`,
            });
        }

        const { user, error } = await addUser(socket.id, token, roomName);

        if (error)
            return callback({
                error,
            });

        const clients = io.sockets.adapter.rooms.get(user.room);

        if (!clients) {
            //make the first person in the room moderator
            console.log(animeMeta);
            cache.add(`${user.room}_animeMeta`, animeMeta);
            cache.add(`${roomName}_password`, roomPassword);
            cache.add(`${user.room}_controlledByMods`, false); //everyone can control
            user.moderator = true;
            user.owner = true;
            cache.add(`${user.room}_owner`, user.userID);
        } else {
            //reassign owner role when owner rejoins
            const getRoomOwner = cache.get(`${user.room}_owner`);
            if (getRoomOwner == user.userID) {
                user.moderator = true;
                user.owner = true;
            }
        }

        socket.join(user.room);

        socket.in(roomName).emit('system', {
            content: `${user.username} odaya katıldı 👋`,
            ...baseChatBotProps,
        });
        io.in(roomName).emit('users', getUsers(roomName));
        io.in(roomName).emit('settings', {
            controlledByMods: cache.get(`${user.room}_controlledByMods`) ?? false,
        });
        const startFrom = cache.get(`${user.room}_latestTimestamp`) ?? 0;

        callback({
            message: 'success',
            startFrom,
        });
    });

    socket.on('updatePermission', (args) => {
        if (typeof args?.removeMod == 'boolean' && typeof args?.makeMod == 'boolean') {
            const user = getUserBySocket(socket.id);

            if (user?.owner) {
                const target = getUserById(args.userID, user.room);
                if (target?.userID == user?.userID) return;

                if (args.removeMod) {
                    target.moderator = false;

                    io.in(user.room).emit('users', getUsers(user.room));

                    io.in(user.room).emit('system', {
                        content: `${user.username}, ${target.username} kullanıcısının moderatör yetkisini aldı`,
                        ...baseChatBotProps,
                    });
                } else if (args.makeMod) {
                    target.moderator = true;

                    io.in(user.room).emit('users', getUsers(user.room));
                    const last = cache.get(`${user.room}_bannedUsers`) ?? [];
                    io.to(target.id).emit('bannedUsers', last);

                    io.in(user.room).emit('system', {
                        content: `${user.username}, ${target.username} kullanıcısını moderatör olarak atadı`,
                        ...baseChatBotProps,
                    });
                }
            }
        }
    });

    socket.on('updateSettings', (args) => {
        const user = getUserBySocket(socket.id);
        if (user.owner) {
            if (typeof args?.controlledByMods == 'boolean') {
                cache.add(`${user.room}_controlledByMods`, args.controlledByMods);
            }

            socket.in(user.room).emit('settings', {
                controlledByMods: cache.get(`${user.room}_controlledByMods`) ?? false,
            });
        }
    });

    socket.on('moderationOperation', (args) => {
        const user = getUserBySocket(socket.id);
        const target = getUserById(args.userID, user.room);
        if (target?.owner == true) return; //can't edit owner
        if (!user?.moderator) return; //just owners and mods can use
        if (!user?.owner && target?.moderator) return; //if user is not owner and the target user is mod

        console.log(target, user);

        if (args?.operation == 'mute') {
            console.log(target);
            target.muted = true;
            const getMutedParticipants = cache.get(`${user.room}_mutedUsers`) ?? [];
            getMutedParticipants.push(args.userID);
            cache.add(`${user.room}_mutedUsers`, getMutedParticipants);
            cache.add(`mutedState_${args.userID}_${user.room}`, true);

            io.in(user.room).emit('system', {
                content: `${user.username}, ${target.username} kullanıcısını susturdu`,
                ...baseChatBotProps,
            });
        } else if (args?.operation == 'unmute') {
            target.muted = false;
            let getMutedParticipants = cache.get(`${user.room}_mutedUsers`) ?? [];
            getMutedParticipants = getMutedParticipants.filter((id) => id != args.userID);
            const key = getMutedParticipants.length == 0 ? 'remove' : 'add';
            cache[key](`${user.room}_mutedUsers`, getMutedParticipants);

            io.in(user.room).emit('system', {
                content: `${user.username}, ${target.username} kullanıcısının susturmasını kaldırdı`,
                ...baseChatBotProps,
            });
        } else if (args?.operation == 'kick') {
            const getTargetSocket = io.sockets.sockets.get(target.id);
            getTargetSocket.disconnect();

            io.in(user.room).emit('system', {
                content: `${user.username}, ${target.username} kullanıcısını attı`,
                ...baseChatBotProps,
            });
        } else if (args?.operation == 'ban') {
            const getTargetSocket = io.sockets.sockets.get(target.id);
            const getBannedUsers = cache.get(`${user.room}_bannedUsers`) ?? [];
            getBannedUsers.push({
                userID: target.userID,
                username: target.username,
                avatar: target.avatar,
            });
            cache.add(`${user.room}_bannedUsers`, getBannedUsers);
            getTargetSocket.disconnect();

            const getUsersInRoom = getUsers(user.room, true);
            getUsersInRoom.forEach((user) => {
                if (user.moderator) {
                    io.to(user.id).emit('bannedUsers', getBannedUsers);
                }
            });

            io.in(user.room).emit('system', {
                content: `${user.username}, ${target.username} kullanıcısının yasakladı`,
                ...baseChatBotProps,
            });
        } else if (args?.operation == 'unban') {
            cache.remove(`bannedState_${args.userID}_${user.room}`);

            let getBannedUsers = cache.get(`${user.room}_bannedUsers`) ?? [];
            getBannedUsers = getBannedUsers.filter((x) => x.userID != args.userID);
            const key = getBannedUsers.length == 0 ? 'remove' : 'add';
            cache[key](`${user.room}_bannedUsers`, getBannedUsers);
            const last = cache.get(`${user.room}_bannedUsers`) ?? [];

            const getUsersInRoom = getUsers(user.room, true);
            getUsersInRoom.forEach((user) => {
                if (user.moderator) {
                    io.to(user.id).emit('bannedUsers', last);
                }
            });
        }

        io.in(user.room).emit('users', getUsers(user.room));
    });

    socket.on('sendMessage', (message) => {
        if (message.trim().length == 0) return;
        if (message.trim().length > 250) return;
        const user = JSON.parse(JSON.stringify(getUserBySocket(socket.id)));
        if (user.muted) return;
        user.id = undefined;
        user.author = user.username;
        io.in(user.room).emit('message', {
            ...user,
            content: message.trim(),
        });
    });

    socket.on('timestamp', (timestamp) => {
        const user = getUserBySocket(socket.id);
        if (isNaN(timestamp)) return;
        const controlledByMods = cache.get(`${user.room}_controlledByMods`) ?? false;
        if (controlledByMods && !user.moderator) return;
        const checkAlreadyStored = cache.get(`${user.room}_latestTimestamp`);
        if (checkAlreadyStored) {
            if (checkAlreadyStored < timestamp) {
                cache.add(`${user.room}_latestTimestamp`, timestamp);
            }
        } else {
            cache.add(`${user.room}_latestTimestamp`, timestamp);
        }
    });

    socket.on('playerState', (state) => {
        const user = getUserBySocket(socket.id);
        const controlledByMods = cache.get(`${user.room}_controlledByMods`) ?? false;
        if (controlledByMods && !user.moderator) return;
        if ('playing' in state) {
            console.log('içinde');
            socket.broadcast.to(user.room).emit('playerState', {
                playing: state.playing,
                changedBy: {
                    username: user.username,
                    id: user.id,
                },
            });
        }
    });

    socket.on('playerTimestamp', (timestamp) => {
        const user = getUserBySocket(socket.id);
        const controlledByMods = cache.get(`${user.room}_controlledByMods`) ?? false;
        if (controlledByMods && !user.moderator) return;
        if ('timestamp' in timestamp) {
            socket.broadcast.to(user.room).emit('playerTimestamp', {
                timestamp: timestamp.timestamp,
                changedBy: {
                    username: user.username,
                    id: user.id,
                },
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
        const user = deleteUser(socket.id);
        if (user) {
            const clients = io.sockets.adapter.rooms.get(user.room);
            if (!clients) {
                //if everybody left the room remove these caches
                cache.remove(`${user.room}_latestTimestamp`);
                cache.remove(`${user.room}_animeMeta`);
                cache.remove(`${user.room}_password`);
                cache.remove(`${user.room}_bannedUsers`);
                cache.remove(`${user.room}_mutedUsers`);
                cache.remove(`${user.room}_controlledByMods`);
                cache.remove(`${user.room}_owner`);
            }

            io.in(user.room).emit('users', getUsers(user.room));
        }
    });
});
