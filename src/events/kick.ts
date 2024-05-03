import type { Server, Socket } from 'socket.io';

import { get } from '@utils/cache';
import canDoModerationOperationOnTarget from '@utils/canDoModerationOperationOnTarget';
import sendSystemMessage from '@utils/systemMessage';

import { Participant } from './login';

export default class KickParticipant {
    async handle({ socket, io, data }: { socket: Socket; io: Server; data: any }) {
        const targetUserId = data?.target;
        if (!targetUserId) return;

        const rooms = Array.from(socket.rooms);
        const room = rooms[1];

        if (!room) return;

        const socketId = socket.id;
        const socketRoomParticipants = (await get(`room:${room}:users`)) as Participant[];

        if (socketRoomParticipants) {
            const mod = socketRoomParticipants.find((user) => user.sid == socketId);
            const targetUser = socketRoomParticipants.find((user) => user.id == targetUserId);

            if (canDoModerationOperationOnTarget(mod, targetUser)) {
                const getTargetSocket = io.sockets.sockets.get(targetUser.sid);
                getTargetSocket.disconnect();

                sendSystemMessage(
                    room,
                    `${mod.username}, ${targetUser.username} kullanıcısını attı..`,
                );
            }
        }
    }
}
