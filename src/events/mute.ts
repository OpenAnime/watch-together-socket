import type { Socket } from 'socket.io';

import canDoModerationOperationOnTarget from '@utils/canDoModerationOperationOnTarget';
import sendSystemMessage from '@utils/systemMessage';
import useSocket from '@utils/useSocket';

export default class MuteOrUnmuteParticipant {
    async handle({ socket, data }: { socket: Socket; data: any }) {
        const targetUserId = data?.target;
        if (!targetUserId) return;

        const hook = useSocket(socket);

        if (hook?.error) return;

        const participants = await hook.getParticipants();

        if (participants) {
            const currentUser = await hook.getCurrentUser();
            const targetUser = await hook.getUserFromId(targetUserId);

            if (canDoModerationOperationOnTarget(currentUser, targetUser)) {
                const mutedParticipants = await hook.getMutedParticipants();

                let newMutedParticipants = [];

                if (mutedParticipants.includes(targetUserId)) {
                    //unmute
                    newMutedParticipants = mutedParticipants.filter((x) => x != targetUserId);

                    sendSystemMessage(
                        hook.getRoomPtr(),
                        `${currentUser.username}, ${targetUser.username} kullanıcısının susturmasını kaldırdı.`,
                    );
                } else {
                    //mute
                    newMutedParticipants = [...mutedParticipants, targetUserId];

                    sendSystemMessage(
                        hook.getRoomPtr(),
                        `${currentUser.username}, ${targetUser.username} kullanıcısını susturdu.`,
                    );
                }

                hook.broadcastToEveryone('mute', {
                    mutedParticipants: newMutedParticipants,
                });

                await hook.setRoomKey('mutedParticipants', newMutedParticipants);
            }
        }
    }
}
