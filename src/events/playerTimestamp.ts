import type { Socket } from 'socket.io';

import useSocket from '@utils/useSocket';

export default class UpdatePlayerTimestamp {
    async handle({ socket, data }: { socket: Socket; data: any }) {
        const videoTimestamp = data?.timestamp;
        if (isNaN(videoTimestamp)) return;

        const hook = useSocket(socket);

        if (hook?.error) return;

        let pass = false;

        const controlledByMods = await hook.roomControlledByMods();

        if (controlledByMods) {
            const isMod = await hook.isModerator();
            pass = isMod;
        } else {
            pass = true;
        }

        if (pass) {
            hook.broadcastToEveryoneExceptAuthor('playerTimestamp', { timestamp: videoTimestamp });
            hook.setRoomKey('timestamp', videoTimestamp);
        }
    }
}
