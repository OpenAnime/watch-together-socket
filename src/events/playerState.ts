import type { Socket } from 'socket.io';

import useSocket from '@utils/useSocket';

export default class UpdatePlayerState {
    async handle({ socket, data }: { socket: Socket; data: any }) {
        const playing = data?.playing;
        if (typeof data?.playing !== 'boolean') return;

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
            hook.broadcastToEveryoneExceptAuthor('playerState', { playing });
        }
    }
}
