import type { Socket } from 'socket.io';

import { get } from '@utils/cache';

import { Participant } from './login';

export default class MuteOrUnmuteParticipant {
    async handle({ socket, data }: { socket: Socket; data: any }) {
        const videoTimestamp = data?.timestamp;
        if (isNaN(videoTimestamp)) return;

        const rooms = Array.from(socket.rooms);
        const room = rooms[1];

        if (!room) return;

        const socketId = socket.id;
        let pass = false;

        const modRequired = (await get(`room:${room}:controlledByMods`)) ?? false;
        if (modRequired) {
            const socketRoomParticipants = (await get(`room:${room}:users`)) as Participant[];

            if (socketRoomParticipants) {
                const mod = socketRoomParticipants.find((user) => user.sid == socketId);
                if (mod?.moderator) pass = true;
            }
        } else {
            pass = true;
        }

        if (pass) {
            socket.broadcast.to(room).emit('playerTimestamp', { timestamp: videoTimestamp });
        }
    }
}
