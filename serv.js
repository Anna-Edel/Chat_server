const WS = require('ws');
const path = require('path');
const fs = require('fs');

const port = 8080;
const messages = JSON.parse(fs.readFileSync(path.resolve(__dirname, './messages.json')));
const usersOnline = JSON.parse(fs.readFileSync(path.resolve(__dirname, './usersOnline.json')));
let clientsOnline = [];

const wsServ = new WS.Server({ port: port });

wsServ.on('connection', (ws) => {
    // Обновляем список клиентов
    wsServ.clients.forEach((client) => {
        if (client.readyState === WS.OPEN) {
            clientsOnline.push(client);
        } else {
            clientsOnline.splice(client, 1);
        }
    });

    // Отправляем текущие данные всем клиентам
    clientsOnline.forEach((client) => {
        client.send(
            JSON.stringify({
                type: 'currentUserList',
                data: {
                    usersOnline: usersOnline,
                    messages: messages,
                },
            })
        );
    });

    // Обработка входящих сообщений
    ws.on('message', (e) => {
        const inputData = JSON.parse(e);

        switch (inputData['type']) {
            case 'initialData':
                handleInitialData();
                break;
            case 'userEnter':
                handleUserEnter(inputData['data']);
                break;
            case 'chatReq':
                handleChatRequest();
                break;
            case 'userOut':
                handleUserOut(inputData['data']);
                break;
            case 'newMsg':
                handleNewMessage(inputData['data']);
                break;
            default:
                throw new Error('Incorrect type of data');
        }
    });

    // Обработчики
    function handleInitialData() {
        clientsOnline.forEach((client) => {
            client.send(JSON.stringify({ type: 'initialData', data: usersOnline }));
        });
    }

    function handleUserEnter(currentUser) {
        if (!usersOnline.includes(currentUser)) {
            usersOnline.push(currentUser);
            fs.writeFileSync(path.resolve(__dirname, './usersOnline.json'), JSON.stringify(usersOnline));
        }
    }

    function handleChatRequest() {
        clientsOnline.forEach((client) => {
            client.send(
                JSON.stringify({
                    type: 'chatReq',
                    data: { usersOnline, messages },
                })
            );
        });
    }

    function handleUserOut(userOut) {
        const index = usersOnline.indexOf(userOut);
        if (index !== -1) {
            usersOnline.splice(index, 1);
            fs.writeFileSync(path.resolve(__dirname, './usersOnline.json'), JSON.stringify(usersOnline));
        }
    }

    function handleNewMessage(newMessage) {
        const messageExists = messages.some((msg) => msg['id'] === newMessage['id']);
        if (!messageExists) {
            messages.push(newMessage);
            fs.writeFileSync(path.resolve(__dirname, './messages.json'), JSON.stringify(messages));
        }
    }
});