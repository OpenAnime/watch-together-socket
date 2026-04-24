import type { Server, Socket } from 'socket.io';

import { del, delWithPattern } from '@utils/cache';
import useSocket from '@utils/useSocket';

export default class Disconnect {
    async handle({ socket, io }: { socket: Socket; io: Server }) {
        const hook = useSocket(socket);
        if (hook?.error) return;

        const room = hook.getRoomPtr();
        const socketRoomParticipants = await hook.getParticipants();

        if (socketRoomParticipants) {
            const newParticipants = socketRoomParticipants.filter((user) => user.sid != socket.id);

            await hook.setRoomKey('users', newParticipants);

            hook.broadcastToEveryone('participants', {
                participants: newParticipants,
            });
        }

        const remainingParticipants = io.sockets.adapter.rooms.get(room);
        if (!remainingParticipants || remainingParticipants.size <= 1) {
            await delWithPattern(`room:${room}:*`);
            await del(`sid:${socket.id}`);
        }
    }
}
