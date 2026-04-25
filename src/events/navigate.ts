import type { Socket } from 'socket.io';
import { z } from 'zod';

import useSocket from '@utils/useSocket';

const validate = z
    .object({
        anime: z.string().min(1).max(500),
        fansub: z.string().min(1).max(500).optional(),
        season: z.number().int(),
        episode: z.number().int(),
    })
    .strict();

export default class PerformNavigate {
    async handle({ socket, data }: { socket: Socket; data: any }) {
        const val = validate.safeParse(data);
        if (val?.error) return;

        const hook = useSocket(socket);
        if (hook?.error) return;

        const isPriviliged = await hook.isPriviliged();

        if (isPriviliged) {
            hook.broadcastToEveryoneExceptAuthor('performNavigate', data);
        }
    }
}
