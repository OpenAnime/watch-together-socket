import http from 'node:http';
import { config } from 'dotenv';
import { Server } from 'socket.io';
import * as cache from './util/cache.js';
import { addUser, deleteUser, getUsers, getUserBySocket, getUserById } from './util/users.js';

config();

const ptr = cache.new_cache();
cache.start_cache(ptr);

const options = {
    cors: true,
    origins: ['http://127.0.0.1:3000'],
};

const baseChatBotProps = {
    system: true,
    author: process.env.CHATBOT_NAME,
    color: process.env.CHATBOT_COLOR,
    avatar: process.env.CHATBOT_AVATAR,
};

const server = http.createServer();
const io = new Server(server, options);

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
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

        if (!animeMeta || animeMeta.toString() !== '[object Object]') {
            return callback({
                error: 'Anime meta is required',
            });
        }

        const getPass = cache.get(ptr, `${roomName}_password`);
        if (getPass?.value) {
            if (getPass.value != roomPassword) {
                return callback({
                    error: 'Wrong password',
                });
            }
        }

        let getVal = cache.get(ptr, `${roomName}_animeMeta`);

        if (getVal && JSON.stringify(getVal.value) != JSON.stringify(animeMeta)) {
            getVal = getVal.value;
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
            cache.add(ptr, `${user.room}_animeMeta`, animeMeta);
            cache.add(ptr, `${roomName}_password`, roomPassword);
            cache.add(ptr, `${user.room}_controlledByMods`, false); //everyone can control
            user.moderator = true;
            user.owner = true;
        }

        socket.join(user.room);

        socket.in(roomName).emit('system', {
            content: `${user.username} odaya katıldı 👋`,
            ...baseChatBotProps,
        });
        io.in(roomName).emit('users', getUsers(roomName));
        io.in(roomName).emit('settings', {
            controlledByMods: cache.get(ptr, `${user.room}_controlledByMods`)?.value ?? false,
        });
        const startFrom = cache.get(ptr, `${user.room}_latestTimestamp`)?.value ?? 0;

        callback({
            message: 'success',
            startFrom,
        });
    });

    socket.on('updatePermission', (args) => {
        if (typeof args?.removeMod == 'boolean' && typeof args?.makeMod == 'boolean') {
            const user = getUserBySocket(socket.id);

            if (user.moderator) {
                const target = getUserById(args.userID, user.room);

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
                    const last = cache.get(ptr, `${user.room}_bannedUsers`)?.value ?? [];
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
                cache.add(ptr, `${user.room}_controlledByMods`, args.controlledByMods);
            }

            socket.in(user.room).emit('settings', {
                controlledByMods: cache.get(ptr, `${user.room}_controlledByMods`)?.value ?? false,
            });
        }
    });

    socket.on('moderationOperation', (args) => {
        const user = getUserBySocket(socket.id);
        const target = getUserById(args.userID, user.room);
        if (!user?.moderator) return;

        if (args?.operation == 'mute') {
            console.log(target);
            target.muted = true;
            const getMutedParticipants = cache.get(ptr, `${user.room}_mutedUsers`)?.value ?? [];
            getMutedParticipants.push(args.userID);
            cache.add(ptr, `${user.room}_mutedUsers`, getMutedParticipants);
            cache.add(ptr, `mutedState_${args.userID}_${user.room}`, true);

            io.in(user.room).emit('system', {
                content: `${user.username}, ${target.username} kullanıcısını susturdu`,
                ...baseChatBotProps,
            });
        } else if (args?.operation == 'unmute') {
            target.muted = false;
            let getMutedParticipants = cache.get(ptr, `${user.room}_mutedUsers`)?.value ?? [];
            getMutedParticipants = getMutedParticipants.filter((id) => id != args.userID);
            const key = getMutedParticipants.length == 0 ? 'remove' : 'add';
            cache[key](ptr, `${user.room}_mutedUsers`, getMutedParticipants);

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
            const getBannedUsers = cache.get(ptr, `${user.room}_bannedUsers`)?.value ?? [];
            getBannedUsers.push({
                userID: target.userID,
                username: target.username,
                avatar: target.avatar,
            });
            cache.add(ptr, `${user.room}_bannedUsers`, getBannedUsers);
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
            cache.remove(ptr, `bannedState_${args.userID}_${user.room}`);

            let getBannedUsers = cache.get(ptr, `${user.room}_bannedUsers`)?.value ?? [];
            getBannedUsers = getBannedUsers.filter((x) => x.userID != args.userID);
            const key = getBannedUsers.length == 0 ? 'remove' : 'add';
            cache[key](ptr, `${user.room}_bannedUsers`, getBannedUsers);
            const last = cache.get(ptr, `${user.room}_bannedUsers`)?.value ?? [];

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
        const user = JSON.parse(JSON.stringify(getUserBySocket(socket.id)));
        if (user.muted) return;
        user.id = undefined;
        user.author = user.username;
        io.in(user.room).emit('message', {
            ...user,
            content: message,
        });
    });

    socket.on('timestamp', (timestamp) => {
        const user = getUserBySocket(socket.id);
        if (isNaN(timestamp)) return;
        const controlledByMods = cache.get(ptr, `${user.room}_controlledByMods`)?.value ?? false;
        if (controlledByMods && !user.moderator) return;
        const checkAlreadyStored = cache.get(ptr, `${user.room}_latestTimestamp`);
        if (checkAlreadyStored) {
            if (checkAlreadyStored.value < timestamp) {
                cache.add(ptr, `${user.room}_latestTimestamp`, timestamp);
            }
        } else {
            cache.add(ptr, `${user.room}_latestTimestamp`, timestamp);
        }
    });

    socket.on('playerState', (state) => {
        const user = getUserBySocket(socket.id);
        const controlledByMods = cache.get(ptr, `${user.room}_controlledByMods`)?.value ?? false;
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
        const controlledByMods = cache.get(ptr, `${user.room}_controlledByMods`)?.value ?? false;
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
                cache.remove(ptr, `${user.room}_latestTimestamp`);
                cache.remove(ptr, `${user.room}_animeMeta`);
                cache.remove(ptr, `${user.room}_password`);
                cache.remove(ptr, `${user.room}_bannedUsers`);
                cache.remove(ptr, `${user.room}_mutedUsers`);
                cache.remove(ptr, `${user.room}_controlledByMods`);
            }

            io.in(user.room).emit('notification', {
                title: 'Someone just left',
                description: `${user.username} just left the room`,
            });
            io.in(user.room).emit('users', getUsers(user.room));
        }
    });
});

export function getMainCache() {
    return ptr;
}
