import { delWithPattern, get, set, del } from '@utils/cache';
import canDoModerationOperationOnTarget from '@utils/canDoModerationOperationOnTarget';
import sendSystemMessage from '@utils/systemMessage';

import type { Socket, Server } from 'socket.io';
import { Participant } from './login';

export default class MuteOrUnmuteParticipant {
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
                const alreadyMutedParticipants = await get(`room:${room}:mutedParticipants`);

                let newMutedParticipants = [];

                if (alreadyMutedParticipants.includes(targetUserId)) {
                    //unmute
                    newMutedParticipants = alreadyMutedParticipants.filter(
                        (x) => x != targetUserId,
                    );

                    sendSystemMessage(
                        room,
                        `${mod.username}, ${targetUser.username} kullanıcısının susturmasını kaldırdı.`,
                    );
                } else {
                    //mute
                    newMutedParticipants = [...alreadyMutedParticipants, targetUserId];

                    sendSystemMessage(
                        room,
                        `${mod.username}, ${targetUser.username} kullanıcısını susturdu.`,
                    );
                }

                io.in(room).emit('mute', {
                    mutedParticipants: newMutedParticipants,
                });

                await set(`room:${room}:mutedParticipants`, newMutedParticipants);
            }
        }
    }
}
