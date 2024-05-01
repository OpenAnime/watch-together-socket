import { get } from '@utils/cache';
import type { Socket, Server } from 'socket.io';

export default class CreateMessage {
    async handle({ socket, io, data }: { socket: Socket; io: Server; data: any }) {
        if (
            'message' in data &&
            typeof data.message == 'string' &&
            data.message.trim().length > 0 &&
            data.message.trim().length <= 250
        ) {
            console.log(data.message);
            const rooms = Array.from(socket.rooms);

            const room = rooms[1];

            if (!room) return;

            const socketRoomParticipants = await get(`room:${room}:users`);

            const author = socketRoomParticipants.find((user) => user.sid == socket.id);

            if (!author) return;

            delete author.sid;

            io.in(room).emit('message', {
                author,
                content: data.message.trim(),
            });
        }
    }
}
