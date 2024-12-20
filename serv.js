const WS = require('ws');
const path = require('path');
const fs = require('fs');

const port = 8080;
const messages = JSON.parse(fs.readFileSync(path.resolve(__dirname, './messages.json')));
const usersOnline = JSON.parse(fs.readFileSync(path.resolve(__dirname, './usersOnline.json')));
let clientsOnline = [];


const wsServ = new WS.Server({ port: port });

wsServ.on('connection', (ws) => {
    wsServ.clients.forEach(client => {
        if (client.readyState === WS.OPEN) {
            clientsOnline.push(client);
        } else{
            clientsOnline.splice(client, 1);
        };
    });

    
    clientsOnline.forEach(client => { client.send(JSON.stringify( { 
        "type": "currentUserList", 
        "data": {
            "usersOnline": usersOnline,
            "messages": messages
        } 
    })) });

    ws.on('message', e => {
        const inputData = JSON.parse(e);
        if(inputData['type'] === 'initialData') {
            clientsOnline.forEach(client => { client.send(JSON.stringify( { "type": "initialData", "data": usersOnline })) });
        }else if(inputData['type'] === 'userEnter') {
            const currentUser = inputData['data'];
            if(!usersOnline.includes(currentUser)) {
                usersOnline.push(currentUser);
            };
            fs.writeFileSync(path.resolve(__dirname, './usersOnline.json'), JSON.stringify(usersOnline));
        } else if(inputData['type'] === 'chatReq') {
            clientsOnline.forEach(client => { client.send(JSON.stringify( { "type": "chatReq", "data": { "usersOnline": usersOnline, "messages": messages } })) });
        } else if(inputData['type'] === 'userOut') {
            const userOut = inputData['data'];
            usersOnline.forEach((el) => {
                if (el === userOut) {
                    usersOnline.splice(usersOnline.indexOf(el), 1);
                }
              });
            fs.writeFileSync(path.resolve(__dirname, './usersOnline.json'), JSON.stringify(usersOnline));
        } else if(inputData['type'] === 'newMsg') {
            messages.forEach(e => {
                if(e['id'] === inputData['data']['id']){
                    return;
                };
            })
            messages.push(inputData['data']);
            fs.writeFileSync(path.resolve(__dirname, './messages.json'), JSON.stringify(messages));
        }  else {
            throw Error('incorrect type of data')
        };
    });
});
