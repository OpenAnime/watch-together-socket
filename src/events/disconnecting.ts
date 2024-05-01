import { delWithPattern, get, set, del } from '@utils/cache';
import type { Socket, Server } from 'socket.io';

export default class Disconnect {
    async handle({ socket, io }: { socket: Socket; io: Server }) {
        const rooms = Array.from(socket.rooms);

        const room = rooms[1];

        if (!room) return;

        const socketId = socket.id;

        const socketRoomParticipants = await get(`room:${room}:users`);

        if (socketRoomParticipants) {
            const newParticipants = socketRoomParticipants.filter((user) => user.sid != socketId);

            await set(`room:${room}:users`, newParticipants);

            io.in(room).emit('participants', {
                participants: newParticipants,
            });
        }

        const remainingParticipants = io.sockets.adapter.rooms.get(room);

        if (!remainingParticipants) {
            await delWithPattern(`room:${room}:*`);
            await del(`sid:${socketId}`);
        }
    }
}
