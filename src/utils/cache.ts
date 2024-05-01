/*
struct Cache 
{
    Item* items;
};

struct Item 
{
    std::string key;
    void* value;
};

buralari okianos duhæn hoj yazmis gormezden gelin tovbe edin
*/

import { redis } from '@index';

const times = {
    s: 1000,
    m: 60000,
    h: 3600000,
    w: 604800000,
    d: 86400000,
};

const parseJSON = (data: string) => {
    try {
        return JSON.parse(data);
    } catch {
        return data;
    }
};

const resolveJSON = (data: any) => {
    if (typeof data === 'object') {
        return JSON.stringify(data);
    }

    return data;
};

async function set(key: string, value: any, expr?: `${number}${'m' | 'w' | 'd'}`) {
    const multiplier = expr ? times[expr.slice(-1)] : null;

    if (!multiplier && expr) {
        console.error(
            'Invalid time format. Please use m, w or d. (m = minutes, w = weeks, d = days)',
        );
        return;
    }

    if (expr) {
        await redis.set(
            key,
            resolveJSON(value),
            'PX',
            +expr.substring(0, expr.length - 1) * multiplier,
        );
    } else {
        await redis.set(key, resolveJSON(value));
    }
}

async function multipleSet(data: { [key: string]: any }) {
    for (const item of Object.keys(data)) {
        data[item] = resolveJSON(data[item]);
    }

    await redis.mset(data);
}

async function multipleGet(keys: string[]) {
    const values = await redis.mget(keys);
    return values.map((value) => parseJSON(value));
}

async function get(key: string, raw = false) {
    const value = await redis.get(key);

    if (value && !raw) {
        return parseJSON(value);
    }

    return value;
}

async function del(key: string) {
    await redis.del(key);
}

async function delWithPattern(pattern: string) {
    const keys = await redis.keys(pattern);

    if (keys.length) {
        await redis.del(keys);
    }
}

async function keys(pattern: string) {
    return await redis.keys(pattern);
}

export { del, delWithPattern, get, keys, multipleGet, multipleSet, set };
