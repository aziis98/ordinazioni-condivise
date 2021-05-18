
// Utils //

export function bufferToBase64(buffer) {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(buffer)));
}

export function base64ToBuffer(string) {
    return new Uint8Array(atob(string).split('').map(c => c.charCodeAt(0)));
}


/** Pass data and a level (1-9) for the compression */
export function compressLZMA(data, level) {
    return new Promise((resolve, reject) => {
        lzma.compress(data, level, (result, err) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    })
}

export function decompressLZMA(compressedData) {
    return new Promise((resolve, reject) => {
        lzma.decompress(compressedData, (result, err) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    })
}

// Boh la VDOM è cattiva
// const $span = document.createElement('span');
// const escapeCode = code => {
//     $span.innerHTML = code;
//     return $span.innerText;
// }

/** Identity shortcut */
export const identity = value => value;
/** No operation shortcut */
export const noOp = () => { };

// e.g. { 0: "a", 1: "b", 2: "c" } => ["a", "b", "c"]
export const listify = o => Object.assign([], o);

export function sortBy(list, keyFn = 'self') {
    keyFn = keyFn === 'self' ? identity : keyFn;

    const result = [...list];
    result.sort((item1, item2) => {
        const k1 = keyFn(item1);
        const k2 = keyFn(item2);
        return k1 === k2 ? 0 : (k1 < k2 ? -1 : 1);
    });
    return result;
}

/**
 * Al momento il tipo è una cosa di questo genere
 * ```
 * (Array<T>, T -> Array<K>) -> { [K]: [T] }
 * ```
*/
export function groupByMultiples(list, getKeys) {
    const dict = {};

    for (const item of list) {
        const keys = getKeys(item);

        for (const key of keys) {
            dict[key] = dict[key] || [];
            dict[key].push(item);
        }
    }

    return dict;
}

// Preact Utils //

/** Wrapper magico per fare direttamente `<element ...${onEnter(e => ...)} />` con htm... */
export const onEnter = callback => ({
    onKeydown: e => e.key === 'Enter' && callback(e),
})
