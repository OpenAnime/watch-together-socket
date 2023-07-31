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

const times = {
    s: 1000,
    m: 60000,
    h: 3600000,
    w: 604800000,
    d: 86400000,
};

/**
 *
 * @type {Map<string, { data: any, sweeper?: NodeJS.Timeout }>}
 */
const cache = new Map();

function add(key, value, expr) {
    const multiplier = expr ? times[expr.slice(-1)] : null;

    if (!multiplier && expr) {
        console.error(
            'Invalid time format. Please use m, w or d. (m = minutes, w = weeks, d = days)'
        );
        return;
    }

    const item = cache.get(key);

    if (item && item.sweeper) {
        clearTimeout(item.sweeper);
    }

    console.log(value);

    cache.set(key, {
        data: value,
        sweeper: expr
            ? setTimeout(() => {
                  cache.delete(key);
              }, expr.substring(0, expr.length - 1) * multiplier)
            : undefined,
    });
}

function remove(key) {
    cache.delete(key);
}

function get(key) {
    return cache.get(key)?.data;
}

export { add, remove, get };
