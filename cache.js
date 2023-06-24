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
    "s": 1000,
    "m": 60000,
    "h": 3600000,
    "w": 604800000,
    "d": 86400000,
}

function new_cache() {
    const ptr = {
        items: [],
    };

    return ptr;
}

function add(ptr, key, value, expr, otherOptions) {
    const idx = ptr.items.findIndex((i) => i.key === key);
    const multiplier = expr ? times[expr.slice(-1)] : null;
    if (!multiplier && expr) {
        console.error("Invalid time format. Please use m, w or d. (m = minutes, w = weeks, d = days)");
        return;
    }

    if (idx > -1) {
        ptr.items[idx] = {
            key,
            value,
            expire: expr ? Date.now() + (expr.substring(0, expr.length - 1) * multiplier) : undefined,
        }
    } else {
        ptr.items.push({
            key,
            value,
            expire: expr ? Date.now() + (expr.substring(0, expr.length - 1) * multiplier) : undefined,
        });
    }
}



function remove(ptr, key) {
    ptr.items = ptr.items.filter((i) => i.key !== key);
}

function get(ptr, key) {
    return ptr.items.find((i) => i.key === key);
}

function delete_expired(ptr) {
    ptr.items.forEach((item) => {
        if (item.expire <= Date.now())
            remove(ptr, item.key);
    });
}

async function start_cache(ptr) {
    setTimeout(() => {
        delete_expired(ptr);

        setTimeout(() => start_cache(ptr), 1000);
    }, 1000);
}

export {
    new_cache,
    add,
    remove,
    get,
    delete_expired,
    start_cache,
};