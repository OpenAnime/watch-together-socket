import { delWithPattern, get, set, del } from '@utils/cache';
import sendSystemMessage from '@utils/systemMessage';

import type { Socket, Server } from 'socket.io';
import { Participant, CoreParticipant } from './login';
import canDoModerationOperationOnTarget from '@utils/canDoModerationOperationOnTarget';

export default class BanOrUnbanParticipant {
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
                const bannedParticipants = ((await get(`room:${room}:bannedParticipants`)) ??
                    []) as CoreParticipant[];

                let newBannedParticipants = [];

                const userBanned = bannedParticipants.find((x) => x.id == targetUserId);

                if (userBanned) {
                    //unban
                    newBannedParticipants = bannedParticipants.filter((x) => x.id != targetUserId);

                    sendSystemMessage(
                        room,
                        `${mod.username}, ${targetUser.username} kullanıcısının yasağını kaldırdı.`,
                    );
                } else {
                    //ban
                    const targetUserCpy = { ...targetUser };

                    delete targetUserCpy.sid;
                    delete targetUserCpy.owner;
                    delete targetUserCpy.moderator;

                    newBannedParticipants = [...bannedParticipants, targetUserCpy];

                    const getTargetSocket = io.sockets.sockets.get(targetUser.sid);
                    getTargetSocket.disconnect();

                    sendSystemMessage(
                        room,
                        `${mod.username}, ${targetUser.username} kullanıcısını yasakladı.`,
                    );
                }

                io.in(room).emit('ban', {
                    bannedParticipants: newBannedParticipants,
                });

                await set(`room:${room}:bannedParticipants`, newBannedParticipants);
            }
        }
    }
}
