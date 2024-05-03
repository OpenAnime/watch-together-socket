import type { Server, Socket } from 'socket.io';

import { get, set } from '@utils/cache';

import { Participant } from './login';

export default class ChangeModeratorControl {
    async handle({ socket, io, data }: { socket: Socket; io: Server; data: any }) {
        const controlledByMods = data?.controlledByMods;
        if (typeof controlledByMods !== 'boolean') return;

        const rooms = Array.from(socket.rooms);
        const room = rooms[1];

        if (!room) return;

        const socketId = socket.id;
        const socketRoomParticipants = (await get(`room:${room}:users`)) as Participant[];
        const user = socketRoomParticipants.find((user) => user.sid == socketId);

        if (user.owner) {
            await set(`room:${room}:controlledByMods`, controlledByMods);

            io.in(room).emit('modControl', {
                controlledByMods,
            });
        }
    }
}
