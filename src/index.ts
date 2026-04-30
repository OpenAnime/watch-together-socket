import Redis from 'ioredis';
import RapidEnv from 'rapidenv';
import { Server } from 'socket.io';
import { App } from 'uWebSockets.js';

RapidEnv().load();

import { delWithPattern, get } from '@utils/cache';

import traverseEvents from './router';
import { info, success, warn } from './utils/logger';

process.on('uncaughtException', function (err) {
    console.error(err);
});

const app = App();
const io = new Server();

const PORT = +process.env.PORT || 3001;
const HOST = process.env.HOST || '127.0.0.1';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const redis = new Redis({
    port: +process.env.REDIS_PORT,
    host: process.env.REDIS_HOST,
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    db: +process.env.REDIS_DB,
});

info('Connecting to Redis...');
await new Promise((resolve) => redis.on('connect', resolve));

// remove existing keys
info('Removing existing keys...');
await delWithPattern('room:*');
await delWithPattern('sid:*');

const chatBotProps = {
    id: '81',
    system: true,
    avatar: process.env.CHATBOT_AVATAR,
    username: process.env.CHATBOT_NAME,
};

function writeCorsHeaders(res) {
    return res
        .writeHeader('Access-Control-Allow-Origin', CORS_ORIGIN)
        .writeHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
        .writeHeader(
            'Access-Control-Allow-Headers',
            'Content-Type, Authorization, Gateway-Token, Mobile-Token, Client-Protocol-Model',
        );
}

(async () => {
    const events = await traverseEvents();

    app.options('/*', (res) => {
        writeCorsHeaders(res.writeStatus('204 No Content')).end();
    });

    app.get('/', (res, _) => {
        writeCorsHeaders(res.writeStatus('200 OK')).end('obezanime watch together socket 👌');
    });

    app.get('/anime-info/:roomId', (res, req) => {
        let aborted = false;
        res.onAborted(() => {
            aborted = true;
        });

        const roomId = req.getParameter(0).trim();

        get(`room:${roomId}:anime`)
            .then((anime) => {
                if (aborted) return;

                res.cork(() => {
                    if (!anime) {
                        writeCorsHeaders(res.writeStatus('404 Not Found'))
                            .writeHeader('Content-Type', 'application/json')
                            .end(JSON.stringify({ error: 'Room not found' }));
                        return;
                    }

                    writeCorsHeaders(res.writeStatus('200 OK'))
                        .writeHeader('Content-Type', 'application/json')
                        .end(JSON.stringify(anime));
                });
            })
            .catch(() => {
                if (aborted) return;

                res.cork(() => {
                    writeCorsHeaders(res.writeStatus('500 Internal Server Error'))
                        .writeHeader('Content-Type', 'application/json')
                        .end(JSON.stringify({ error: 'Internal server error' }));
                });
            });
    });

    io.attachApp(app, {
        cors: {
            origin: process.env.CORS_ORIGIN,
        },
    });

    app.any('/*', (res, req) => {
        const method = req.getMethod().toUpperCase();
        const url = req.getUrl();

        writeCorsHeaders(res.writeStatus('404 Not Found'))
            .writeHeader('Content-Type', 'application/json')
            .end(
                JSON.stringify({
                    message: `Route ${method}:${url} not found`,
                    error: 'Not Found',
                    statusCode: 404,
                }),
            );
    });

    io.on('connection', (socket) => {
        for (const event of events) {
            event(socket, io);
        }
    });

    app.listen(HOST, PORT, (token) => {
        if (!token) {
            return warn(`Port ${PORT} is already in use.`);
        }

        success(`Server is running on http://${HOST}:${PORT}`);
    });
})();

export { chatBotProps, io, redis };
