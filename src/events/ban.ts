import type { Server, Socket } from 'socket.io';

import canDoModerationOperationOnTarget from '@utils/canDoModerationOperationOnTarget';
import sendSystemMessage from '@utils/systemMessage';
import useSocket from '@utils/useSocket';

import type { CoreParticipant } from './login';

export default class BanOrUnbanParticipant {
    async handle({ socket, io, data }: { socket: Socket; io: Server; data: any }) {
        const targetUserId = data?.target;
        if (!targetUserId) return;

        const hook = useSocket(socket);
        if (hook?.error) return;

        const room = hook.getRoomPtr();
        const mod = await hook.getCurrentUser();
        const targetUser = await hook.getUserFromId(targetUserId);
        const bannedParticipants = await hook.getBannedParticipants();

        let newBannedParticipants: CoreParticipant[] = bannedParticipants;
        let shouldBroadcast = false;

        const isBanned = bannedParticipants.find((x) => x.id == targetUserId);

        if (isBanned) {
            // unban
            if (mod?.moderator) {
                newBannedParticipants = bannedParticipants.filter((x) => x.id != targetUserId);
                shouldBroadcast = true;

                sendSystemMessage(
                    room,
                    `${mod.username}, ${isBanned.username} kullanıcısının yasağını kaldırdı.`,
                );
            }
        } else if (mod && targetUser && canDoModerationOperationOnTarget(mod, targetUser)) {
            //ban

            const targetUserCpy = { ...targetUser };

            delete targetUserCpy.sid;
            delete targetUserCpy.owner;
            delete targetUserCpy.moderator;

            newBannedParticipants = [...bannedParticipants, targetUserCpy];
            shouldBroadcast = true;

            const getTargetSocket = io.sockets.sockets.get(targetUser.sid);
            getTargetSocket?.disconnect();

            sendSystemMessage(
                room,
                `${mod.username}, ${targetUser.username} kullanıcısını yasakladı.`,
            );
        }

        if (shouldBroadcast) {
            hook.broadcastToEveryone('ban', {
                bannedParticipants: newBannedParticipants,
            });

            await hook.setRoomKey('bannedParticipants', newBannedParticipants);
        }
    }
}
