
import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

import { html } from "htm/preact";

import { base64ToBuffer, bufferToBase64, onEnter, listify, sortBy, groupByMultiples, decompressLZMA, compressLZMA } from "./utils.js";

const Icon = ({ name }) => html`
    <span class="icon material-icons">${name}</span>
`;

const ModifiableText = ({ text, setText }) => {
    // Reference used to programmatically select all text when starting to edit the text
    const $input = useRef(null);
    // Tell if this is in editing state
    const [editing, setEditing] = useState(false);
    // This is just used as a buffer while editing (usefull for the `price` usecase)
    const [internalText, setInternalText] = useState(text);

    const startEditing = () => {
        setEditing(true);
        setInternalText(text);
        // Beh di certo per sicurezza il `setTimeout` non può fare male
        setTimeout(() => $input.current.select(), 0);
    };

    const finishEditing = (text) => {
        setEditing(false);
        setText(text || internalText);
    };

    return html`
        ${editing ? 
            html `
                <input type="text" 
                    ref=${$input}
                    value=${internalText} 
                    onInput=${e => setInternalText(e.target.value)}
                    ...${onEnter(() => finishEditing())} />
                <button class="small" onClick=${() => finishEditing()}>
                    <${Icon} name="done" />
                </button>
            ` : 
            html`
                <div>${text}</div>
                <button class="small" onClick=${() => startEditing()}>
                    <${Icon} name="edit"/>
                </button>
            `}
    `;
}

/** Mi sembrava meglio isolarlo invece di avere un solo `Order` con un if gigante per il caso _readonly_.  */
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

    const setText = text => setOrder({ ...order, text });
    const setOwners = owners => setOrder({ ...order, owners });
    const setPrice = price => setOrder({ ...order, price });

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

const App = ({ url }) => {
    // For handling error and loading states
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (url) {
            setLoading(true);
            (async () => {
                try {
                    const compressedData = base64ToBuffer(url);
                    console.log('Compressed data:', Array.from(compressedData));

                    console.log('Decompressing...')
                    const data = JSON.parse(await decompressLZMA(compressedData));

                    console.log('Decompressed data:', data);
                    setOrders(data);
                    setLoading(false);
                } catch (e) {
                    setError(true);
                    console.warn(e);
                }
            })();
        }
    }, []);
    
    const [orders, setOrders] = useState(
        url ? [] : [
            { text: 'Primo oggetto', owners: ['Persona 1', 'Persona 2'], price: 1.00 },
            { text: 'Secondo oggetto', owners: ['Persona 1'], price: 2.00 },
        ]
    );

    const peopleOrders = groupByMultiples(orders, order => order.owners);

    const sortOrders = () => {
        const ordersWithSortedOwners = orders.map(order => {
            return {
                ...order,
                owners: sortBy(order.owners, 'self'),
            };
        });
        setOrders(sortBy(ordersWithSortedOwners, order => order.owners.join(' ')));
    }

    const addOrder = () => setOrders([
        ...orders, 
        { 
            text: '???', 
            owners: ['???'], 
            price: 0.00 
        }
    ]);

    const generateLink = async () => {
        const data = JSON.stringify(orders);
        
        console.log(`Compressing data...`);
        const compressedData = await compressLZMA(data, 9);
        
        console.log(`Compressed!`);
        location.hash = bufferToBase64(compressedData);
    };

    return html`
        ${!error ? 
            html`
                <div class="orders">
                    ${loading ?
                        html`
                            <div class="loading f-center">
                                <${Icon} name="hourglass_empty" />
                            </div>
                        ` :
                        html`
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
                        `}
                </div>
                <div class="orders-actions f-center">
                    <button class="text" onClick=${() => addOrder()}>Aggiungi</button>
                    <button class="text" onClick=${() => setOrders([])}>Cancella tutti</button>
                    <button class="text" onClick=${() => sortOrders()}>Ordina lessicograficamente per proprietario</button>
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
            ` :
            html`
                <div class="f-col f-center">
                    <${Icon} name="warning"/>
                    <i>Purtroppo qualcosa è andato storto, forse il link contiene dati corrotti :C</i>
                </div>
            `}
    `;
};

const hash = location.hash.replace(/^#/, '');
render(html`<${App} url=${hash}/>`, document.querySelector('#app'));
