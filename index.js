
//io style realtime multiplayer strategy game server
//Built with Node, Express and Socket.io w/ uWS (and a few other bits and bobs)

//Copyright Oliver Balfour (aka Tobsta, Lord of the 32bit Ring) 2016-2017

(function(){
	
	/* Dependencies */
	
	const app = require('express')();
	const http = require('http').Server(app);
	const io = require('socket.io')(http);

	const path = require('path');
	const fs = require('fs');
	
	const chalk = require('chalk');
	
	const UUID = require('uuid');
	const sanitizer = require('sanitizer');
	
	
	//Other modules
	
	//Quick function for getting a module in the /server directory
	getModule = name => require(path.join(__dirname, 'server', name))
	
	const WaitingRoom = getModule('waiting-room');
	const GameRoom = getModule('game-room');
	const Player = getModule('player');
	const DataTree = getModule('tree');
	const EventHandler = getModule('handler');
	const Router = getModule('router');
	const utils = getModule('utils');
	const { EVENT } = getModule('const');
	
	//NODE_ENV is dev/debug mode?
	var debug = process.env.NODE_ENV === 'development';
	
	
	
	/* Routing */
	
	const router = new Router(app, debug);
	
	
	/* Data tree */
	
	const tree = new DataTree(io);
	
	
	/* WebSockets (socket.io) */

	io.engine.ws = new (require('uws').Server)({
		noServer: true,
		perMessageDeflate: false
	});

	const handler = new EventHandler(tree, io);
	
	io.on('connection', function(socket){
		
		handler.connect(socket);
		
	});
	
	
	
	/* Initialisation */
	
	//If a (valid) port was supplied as a command line parameter (node index PORT_NO) then use it
	//Otherwise, fall back to port 3000
	const port = process.argv[2] ?
				process.argv[2].match(/[^0-9]+/g) ?
					3000 : parseInt(process.argv[2])
			   : 3000;
	
	http.listen(port, function(){
		console.log(chalk.cyan('Loaded to ') + chalk.blue('http://localhost:') + chalk.green.underline(port) + chalk.cyan(' with debug ' + (debug ? 'on' : 'off') + '\n'));
	});
	
})();