
import { render } from "preact";
import { useRef, useState } from "preact/hooks";

import { html } from "htm/preact";

// function buf2hex(buffer) {
//     return [...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, '0')).join('');
// }

// function hex2buf(hexString) {
//     return new Uint8Array(hexString.match(/../g).map(hexByte => parseInt(hexByte, 16)));
// }

// my_lzma.compress("provaprovaprova", 1, (result, err) => {
//     if (err) {
//         throw err;
//     }
//     console.log(buf2hex(result));
// });

// Boh la VDOM è cattiva
const $span = document.createElement('span');
const escapeCode = code => {
    $span.innerHTML = code;
    return $span.innerText;
}

// NO-OPeration
const noop = () => { };

// e.g. { 0: "a", 1: "b", 2: "c" } => ["a", "b", "c"]
const listify = o => Object.assign([], o);

const onEnter = callback => ({
    onKeydown: e => e.key === 'Enter' && callback(e),
})

// (Array<T>, T -> Array<K>) -> { [K]: [T] }
function groupByMultiples(list, getKeys) {
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

const Icon = ({ name }) => html`
    <span class="icon material-icons">${name}</span>
`;

const ModifiableText = ({ text, setText, options }) => {
    const [modText, setModText] = useState(false);
    const [internalText, setInternalText] = useState(text);
    const $input = useRef(null);

    const modify = () => {
        setModText(true);
        setInternalText(text);

        setTimeout(() => $input.current.select(), 0);
    };

    const done = (text) => {
        setModText(false);
        setText(text || internalText);
    };

    return html`
        ${modText ? 
            (options ? 
                html`
                    <select onChange=${e => console.log(e.target.value)}>
                        ${options.map((option, i) => html`
                            <option value="${i}">${option}</option>
                        `)}
                    </select>
                    <button class="small" onClick=${() => done()}>
                        <${Icon} name="done" />
                    </button>
                    <button class="small" onClick=${() => done(prompt('Aggiungi un nuovo nome', '???'))}>
                        <${Icon} name="add" />
                    </button>
                ` : 
                html `
                    <input type="text" 
                        ref=${$input}
                        value=${internalText} 
                        onInput=${e => setInternalText(e.target.value)}
                        ...${onEnter(() => done())} />
                    <button class="small" onClick=${() => done()}>
                        <${Icon} name="done" />
                    </button>
                `
            ) : 
            html`
                <div>${text}</div>
                <button class="small" onClick=${() => modify()}>
                    <${Icon} name="edit"/>
                </button>
            `}
    `;
}

const ReviewOrder = ({ order: { text, owners, price } }) => {
    return html`
        <div class="order">
            <div class="f-col f-grow">
                <div class="label">
                    ${text}
                </div>
                <div class="owners">
                    ${owners.map(owner => html`
                        <div class="owner">
                            ${owner}
                        </div>
                    `)}
                </div>
            </div>
            <div class="price f-row items-center content-center h-fill">
                €${price.toFixed(2)}
            </div>
        </div>
    `;
};

const Order = ({ order, setOrder, removeOrder }) => {
    const { text, owners, price } = order;
    const readOnly = !setOrder;

    const setText = readOnly ? noop : text => setOrder({ ...order, text });
    const setOwners = readOnly ? noop : owners => setOrder({ ...order, owners });
    const setPrice = readOnly ? noop : price => setOrder({ ...order, price });

    return html`
        <div class="order">
            <div class="f-col f-grow">
                <div class="label f-row items-center">
                    <${ModifiableText} text=${text} setText=${setText}/>
                </div>
                <div class="owners">
                    ${owners.map((owner, i) => {
                        const setOwner = owner => setOwners(listify({ ...owners, [i]: owner }));
                        const removeOwner = () => {
                            if (owners.length === 1) {
                                alert(`Ogni elemento deve avere almeno un propietario`);
                                return;
                            }

                            const newOwners = [...owners];
                            newOwners.splice(i, 1);
                            setOwners(newOwners);
                        }

                        return html`
                            <div class="owner">
                                <${ModifiableText} text=${owner} setText=${setOwner}/>
                                <button class="small" onClick=${() => removeOwner()}>
                                    <${Icon} name="delete" />
                                </button>
                            </div>
                        `;
                    })}
                    <button class="small" onClick=${() => setOwners([...owners, '???'])}>
                        <${Icon} name="add" />
                    </button>
                </div>
            </div>
            <div class="price f-row items-center content-center h-fill">
                €<${ModifiableText} text=${price.toFixed(2)} setText=${text => setPrice(parseFloat(text))} />
            </div>
            <div class="actions f-row items-center content-center h-fill">
                <button class="large" onClick=${() => removeOrder()}>
                    <${Icon} name="delete" />
                </button>
            </div>
        </div>
    `;
};

const App = () => {
    const [orders, setOrders] = useState(
        location.hash ? JSON.parse(atob(location.hash.slice(1))) : [
            { text: 'Primo oggetto', owners: ['Persona 1', 'Persona 2'], price: 1 },
            { text: 'Secondo oggetto', owners: ['Persona 1'], price: 2 },
        ]
    );

    const peopleOrders = groupByMultiples(orders, order => order.owners);

    console.log(orders);
    console.log(peopleOrders);

    const ordina = () => {
        const newOrders = [...orders];
        newOrders.sort((a, b) => {
            const keyA = a.owners.join(',');
            const keyB = b.owners.join(',');
            return keyA === keyB ? 0 : (keyA < keyB ? -1 : 1);
        });
        setOrders(newOrders);
    }

    const addOrder = () => setOrders([
        ...orders, 
        { 
            text: '???', 
            owners: ['???'], 
            price: 0.00 
        }
    ]);

    const generateLink = () => {
        location.hash = btoa(JSON.stringify(orders));
    };

    return html`
        <div class="orders">
            ${orders.map((order, i) => {
                const setOrder = order => setOrders(listify({ ...orders, [i]: order }));

                const removeOrder = () => {
                    const newOrders = [...orders];
                    newOrders.splice(i, 1);
                    setOrders(newOrders);
                }

                return html`
                    <${Order} order=${order} setOrder=${setOrder} removeOrder=${removeOrder}/>
                `;
            })}
        </div>
        <div class="orders-actions f-center">
            <button class="text" onClick=${() => addOrder()}>Aggiungi</button>
            <button class="text" onClick=${() => setOrders([])}>Cancella tutti</button>
            <button class="text" onClick=${() => ordina()}>Ordina lessicograficamente per proprietario</button>
            <button class="text" onClick=${() => generateLink()}>Genera Link</button>
        </div>
        <p>
            Il tasto "Genera Link" codifica direttamente tutte le informazioni nel link alla pagina, poi basta che condividi quel link (includendo tutta la parte dopo il <code>#</code>).
        </p>
        <hr />

        <h2>Costo per persona</h2>
        <div class="receit">
            <div class="people">
                ${Object.entries(peopleOrders).map(([name, orders]) => {
                    const totalPrice = orders
                        .map(order => order.price / order.owners.length)
                        .reduce((acc, v) => acc + v);
                    
                    return html`
                        <div class="person">
                            <div class="label f-col items-center content-center">
                                <div class="name">${name}</div>
                                <div class="price">€${totalPrice.toFixed(2)}</div>
                            </div>
                            <div class="orders">
                                ${orders.map(order => html`
                                    <${ReviewOrder} order=${order}/>
                                `)}
                            </div>
                        </div>    
                        `;
                    }
                )}
            </div>
        </div>
    `;
};

try {
    render(html`<${App} />`, document.querySelector('#app'));
} catch (error) {
    const $message = document.createElement('i');
    $message.style.display = 'block';
    $message.style.textAlign = 'center';
    $message.textContent = 'Qualcosa è andato storto D:';
    document.querySelector('#app').appendChild($message);
}
