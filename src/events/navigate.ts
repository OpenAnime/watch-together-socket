import type { Socket } from 'socket.io';
import { z } from 'zod';

import useSocket from '@utils/useSocket';

const validate = z
    .object({
        slug: z.string().min(1).max(500),
        fansub: z.string().min(1).max(500).optional(),
        season: z.number().int(),
        episode: z.number().int(),
        type: z.string().min(1).max(100).optional(),
        timestamp: z.number().optional(),
    })
    .strict();

export default class PerformNavigate {
    async handle({ socket, data, callback }: { socket: Socket; data: any; callback?: any }) {
        const val = validate.safeParse(data);
        if (val?.error) return callback?.({ error: 'Invalid body' });

        const hook = useSocket(socket);
        if (hook?.error) return callback?.({ error: hook.error });

        let pass = false;

        const controlledByMods = await hook.roomControlledByMods();

        if (controlledByMods) {
            pass = await hook.isPriviliged();
        } else {
            pass = true;
        }

        if (!pass) {
            return callback?.({ error: 'Unauthorized' });
        }

        const currentAnime = (await hook.getRoomKey('anime')) ?? {};
        const fansub = val.data.fansub ?? currentAnime.fansub;
        const timestamp = val.data.timestamp ?? 0;

        if (!fansub) return callback?.({ error: 'Invalid navigation target' });

        const navigationId = crypto.randomUUID();

        const payload = {
            navigationId,
            slug: val.data.slug,
            fansub,
            season: val.data.season,
            episode: val.data.episode,
            type: val.data.type,
            timestamp,
        };

        hook.broadcastToEveryoneExceptAuthor('performNavigate', payload);

        await hook.setRoomKey('anime', {
            fansub,
            slug: val.data.slug,
            season: val.data.season,
            episode: val.data.episode,
        });

        await hook.setRoomKey('timestamp', timestamp);

        return callback?.({ message: 'OK', navigationId });
    }
}
