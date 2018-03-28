let sockets = {};

sockets.init = function (server) {
    const io = require('socket.io').listen(server);

    let users = [];
    let locations = [];


    let setLocation = (location) => {
        let translate = [];

        switch (location) {
            case 0:
                translate = [0, 0, -1];
                break;
            case 1:
                translate = [-1, 0, 0];
                break;
            case 2:
                translate = [0, 0, 1];
                break;
            case 3:
                translate = [1, 0, 0];
                break;
            default:
                translate = [0, 0, 0];
                break;
        }
        return translate;
    };


    let userConnected = (socket) => {
        let translate = {};

        if (locations.length) {
            let vacancy = false,
                vacancyIndex = -1;

            // finding vacancy
            for (let i = 0; i < locations.length; i++) {
                if (locations[i].busy === false && locations[i].id === '') {
                    vacancy = true;
                    vacancyIndex = i;
                    break;
                }
            }

            if (vacancy && vacancyIndex >= 0) {
                // new user take vacancy
                translate = setLocation(vacancyIndex);
                locations[vacancyIndex] = {id: socket.client.id, busy: true};
            } else {
                // new user take next free place
                translate = setLocation(locations.length);
                locations.push({id: socket.client.id, busy: true});
            }
        } else {
            // first user connected
            translate = setLocation(0);
            locations.push({id: socket.client.id, busy: true});
        }

        let currentUser = {
            id: socket.client.id,
            name: 'Name',
            scene: 'default',
            translate: translate,
            rotate: [0, 0, 0]
        };

        users.push(currentUser);

        let stateData = {
            currentUser: currentUser,
            users: users
        };

        // sending data if new user connected
        io.emit('user connected', stateData);
    };


    io.on('connection', function (socket) {
        userConnected(socket);

        socket.on('pass user name', function (currentUser, userName) {
          let user = users.find(user => user.id === currentUser.id);

          user.name = userName;
          socket.broadcast.emit('pass user name callback', users);
        });


        socket.on('user rotated', function (data) {
            let user = users.find(user => user.id === data.id);

            user.rotate = data.rotate;
            socket.broadcast.emit('user rotated callback', users);
        });


        socket.on('disconnect', function () {
            let BreakException = {};

            try {
                users.forEach(function (u, i) {
                    if (u.id === socket.id) {
                        users.splice(i, 1);
                        throw BreakException;
                    }
                });
            } catch (e) {
                if (e !== BreakException) throw e;
            }

            // marking vacancy in locations array
            for (let i = 0; i < locations.length; i++) {
                if (locations[i].id == socket.id) {
                    locations[i].id = '';
                    locations[i].busy = false;
                    break;
                }
            }

            socket.broadcast.emit('user disconnected', users);
        });
    });
};


module.exports = sockets;