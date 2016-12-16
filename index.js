
//Strategy game server server side code
//Built with Node, Express and Socket.io

//Copyright Oliver Balfour (aka Tobsta, Lord of the 32bit Ring) 2016

(function(){
	
	var app = require('express')();
	var http = require('http').Server(app);
	var io = require('socket.io')(http);
	var path = require('path');
	var UUID = require('uuid');
	var sanitizer = require('sanitizer');
	
	//Other modules
	
	//Quick function for getting a module in the modules directory
	function getModule(name){
		return require(path.join(__dirname, 'modules', name));
	}
	
	var WaitingRoom = getModule('waiting-room');
	var GameRoom = getModule('game-room');
	var Player = getModule('player');
	var utils = getModule('utils');
	var EVENT = getModule('const').EVENT;
	
	//At the root of the server, the game is served
	app.get('/', function(req, res){
		res.sendFile(path.join(__dirname, 'index.html'));
	});
	
	//The files in the root that the public aren't allowed to see
	var blacklistedFiles = ['index.js', 'package.json', '.gitignore', 'TODO.txt', 'README.md'];
	
	//Get individual files on the server
	app.get('/*', function(req, res, next){
		var file = req.params[0];
		
		//If the file is blacklisted from public viewing or in any directory other than the root or whitelisted directories, pretend it's a 404 error
		if(blacklistedFiles.indexOf(file) !== -1 || (file.indexOf('/') !== -1 && file.startsWith('/icons'))){
			res.sendStatus(404);
		}
		
		res.sendFile(path.join(__dirname, '/' + file));
	});
	
	
	//Game namespace
	var game = {};
	
	//Get a game by it's ID
	game.getGame = function(id){
		for(var i = 0; i < this.gameRooms.length; i++){
			if(this.gameRooms[i].id === id) return this.gameRooms[i];
		}
		return false;
	}
	
	//Everyone goes through the waiting room
	//Once full, or everyone has agreed to start playing, or the timer has expired, all players inside get transferred to a new game room
	game.waitingRoom = new WaitingRoom(io, function(id, players){
		
		//Create new room when the waiting room has done its job
		game.gameRooms.push(new GameRoom(io, id, players, function(room){
			
			//When the game ends, remove it from the array
			game.gameRooms.splice(game.gameRooms.indexOf(room), 1);
			
		}));
		
		game.getGame(id).sendServerMessage('Game started.');
		
	});
	
	//An array of game rooms
	//Every individual game is an instance of GameRoom, and has at least two players
	//These are where the actual game is played
	game.gameRooms = [];
	
	io.on('connection', function(socket){
		console.log('A user connected');
		
		//Tell the user they're connected, and give them their ID
		socket.emit(EVENT.SERVER_CONNECT, socket.id);
		
		//They are a player, yes?
		socket.player = new Player(socket.id);
		
		//When the user hits play, they are given a waiting room
		//That is, assuming their name is valid
		socket.on(EVENT.JOIN_WAITING_ROOM, function(name, fn){
			
			//Stuff you hackers
			if(typeof name !== 'string' || typeof fn !== 'function')
				return false;
			
			//Die XSS
			name = sanitizer.sanitize(name);
			
			//Enforce name length limit
			if(name.length > 20) name = name.substring(0, 19);
			
			//Stupid anons
			socket.player.name = name !== '' ? name : 'Anonymous';
			
			console.log(socket.player.name + ' joined the waiting room.');
			
			//Add them to the waiting room
			socket.join(game.waitingRoom.id);
			game.waitingRoom.addPlayer(socket.player);
			socket.player.gameID = game.waitingRoom.id;
			socket.player.isWaiting = true;
			game.waitingRoom.updateClient();
			
			//Send back init waiting room data - minimum and maximum players; as well as the timer, force start count and player count
			fn(game.waitingRoom.getFullClient());
		});
		
		//Whenever the player toggles the force start button, this is triggered
		socket.on(EVENT.FORCE_START_STATUS, function(val){
			socket.player.forceStart = !!val;
			game.waitingRoom.updateClient();
		});
		
		//Whenever a player decides they're sick of waiting
		socket.on(EVENT.LEAVE_WAITING_ROOM, function(){
			//If this isn't true, then they're making a lame hacking attempt lol
			if(socket.player.isWaiting){
				game.waitingRoom.removePlayer(socket.player);
				game.waitingRoom.updateClient();
				
				socket.player.isWaiting = false;
				
				console.log(socket.player.name + ' got impatient and returned to the homepage');
			}
		});
		
		//When the player wishes to move their troops between two tiles
		socket.on(EVENT.MOVE_TROOPS, function(d){
			
			//Assuming the game they want to move troops in actually exists (ie it's still active) then move the troops
			if(game.getGame(socket.player.gameID))
				game.getGame(socket.player.gameID).map.moveTroops(socket.player, d);
			
		});
		
		socket.on(EVENT.TILE_UPGRADE, function(d){
			
			//Assuming the game they want to upgrade a tile in actually exists (ie it's still active) then upgrade the tile
			if(game.getGame(socket.player.gameID))
				game.getGame(socket.player.gameID).map.upgradeTile(socket.player, d);
			
		});
		
		socket.on(EVENT.CHAT_MESSAGE, function(m){
			
			//Assuming the game they want to send a message in actually exists (ie it's still active) then send the message
			//Also, it needs to not be a function or it looks weird as hell
			if(typeof m === 'string' && game.getGame(socket.player.gameID))
				game.getGame(socket.player.gameID).sendMessage(socket.player, m);
			
		});
		
		//When they disconnect
		socket.on('disconnect', function(){
			
			//Leave game if in one
			//Leave waiting room if applicable
			//Otherwise nothing needs to be done
			
			if(socket.player.inGame){			
				
				console.log(socket.player.name + ' ragequit');
				
				var socketGame = game.getGame(socket.player.gameID);
				
				socketGame.sendServerMessage(socket.player.name + ' ragequit');
				
				socketGame.removePlayer(socket.player);
				socket.to(socketGame.id).emit(EVENT.PLAYER_UPDATE, socketGame.map.tailoredPlayerArray());
				
				socketGame.checkForWin();
				
			}else if(socket.player.isWaiting){
				
				game.waitingRoom.removePlayer(socket.player);
				game.waitingRoom.updateClient();
				
				console.log(socket.player.name + ' stopped waiting');
				
			}else{
				
				console.log('A user disconnected');
				
			}
		});
	});
	
	var port = 3000;
	
	http.listen(port, function(){
		console.log('Loaded to http://localhost:' + port + '\n');
	});
	
})();