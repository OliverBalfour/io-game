
//EventHandler class

//Has functions for handling all of the events emitted by sockets

(function(){
	
	var chalk = require('chalk');
	var sanitizer = require('sanitizer');
	var UUID = require('UUID');
	
	var GameRoom = require('./game-room');
	var Player = require('./player');
	var EVENT = require('./const').EVENT;
	
	module.exports = function(tree, io){
		
		this.tree = tree;
		this.io = io;
		
		this.connect = function(socket){
			console.log(chalk.green('A user connected'));
			
			//Tell the user they're connected, and give them their ID
			socket.emit(EVENT.SERVER_CONNECT, socket.id);
			
			//They are a player, yes?
			socket.player = new Player(socket.id);
			
			//When the user hits play, they are given a waiting room
			//That is, assuming their name is valid
			socket.on(EVENT.JOIN_WAITING_ROOM, this.joinWaitingRoom.bind(this, socket));
			
			//Whenever the player toggles the force start button, this is triggered
			socket.on(EVENT.FORCE_START_STATUS, this.forceStartStatus.bind(this, socket));
			
			//Whenever a player decides they're sick of waiting
			socket.on(EVENT.LEAVE_WAITING_ROOM, this.leaveWaitingRoom.bind(this, socket));
			
			//When the player wishes to move their troops between two tiles
			socket.on(EVENT.MOVE_TROOPS, this.moveTroops.bind(this, socket));
			
			//When the player wants to build (or demolish) something on a tile
			socket.on(EVENT.TILE_UPGRADE, this.tileUpgrade.bind(this, socket));
			
			//When they want to send a message to chat
			socket.on(EVENT.CHAT_MESSAGE, this.chatMessage.bind(this, socket));
			
			//The server handles the tutorial match because it means that the client doesn't need any sensitive code
			socket.on(EVENT.START_TUTORIAL, this.startTutorial.bind(this, socket));
			
			//When they wish to concede
			socket.on(EVENT.CONCEDE_GAME, this.concedeGame.bind(this, socket));
			
			//When they disconnect
			socket.on('disconnect', this.disconnect.bind(this, socket));
		}
		
		//When the user hits play, they are given a waiting room
		//That is, assuming their name is valid
		this.joinWaitingRoom = function(socket, name, fn){
			
			//Stuff you hackers
			if(typeof name !== 'string' || typeof fn !== 'function')
				return false;
			
			//Die XSS
			name = sanitizer.sanitize(name);
			
			//Enforce name length limit
			if(name.length > 20) name = name.substring(0, 19);
			
			//Stupid anons
			socket.player.name = name !== '' ? name : 'Anonymous';
			
			console.log(chalk.green(socket.player.name + ' joined the waiting room.'));
			
			//Add them to the waiting room
			socket.join(this.tree.waitingRoom.id);
			this.tree.waitingRoom.addPlayer(socket.player);
			socket.player.gameID = this.tree.waitingRoom.id;
			socket.player.isWaiting = true;
			this.tree.waitingRoom.updateClient();
			
			//Send back init waiting room data - minimum and maximum players; as well as the timer, force start count and player count
			fn(this.tree.waitingRoom.getFullClient());
		}
		
		//Whenever the player toggles the force start button, this is triggered
		this.forceStartStatus = function(socket, val){
			socket.player.forceStart = !!val;
			this.tree.waitingRoom.updateClient();
		}
		
		//Whenever a player decides they're sick of waiting
		this.leaveWaitingRoom = function(socket){
			
			//If this isn't true, then they're making a lame hacking attempt lol
			if(socket.player.isWaiting){
				
				this.tree.waitingRoom.removePlayer(socket.player);
				this.tree.waitingRoom.updateClient();
				
				socket.player.isWaiting = false;
				
				console.log(chalk.green(socket.player.name + ' got impatient and returned to the homepage'));
				
			}
			
		}
		
		//When the player wishes to move their troops between two tiles
		this.moveTroops = function(socket, d){
			
			var game = this.tree.getGame(socket.player.gameID);
			
			//Assuming the game they want to move troops in actually exists (ie it's still active) then move the troops
			if(game)
				game.map.moveTroops(socket.player, d);
			
		}
		
		//When the player wants to build (or demolish) something on a tile
		this.tileUpgrade = function(socket, d){
			
			var game = this.tree.getGame(socket.player.gameID);
			
			//Assuming the game they want to upgrade a tile in actually exists (ie it's still active) then upgrade the tile
			if(game)
				game.map.upgradeTile(socket.player, d);
			
		}
		
		//When they want to send a message to chat
		this.chatMessage = function(socket, m){
			
			//Assuming the game they want to send a message in actually exists (ie it's still active) then send the message
			//Also, it needs to not be a function or it looks weird as hell
			if(typeof m === 'string' && this.tree.getGame(socket.player.gameID))
				this.tree.getGame(socket.player.gameID).sendMessage(socket.player, m);
			
		}
		
		//The server handles the tutorial match because it means that the client doesn't need any sensitive code
		this.startTutorial = function(socket, emptyVar, fn){
			
			//Stuff you hackers
			if(typeof fn !== 'function')
				return false;
			
			//Join tutorial room
			var gameRoomID = UUID();
			socket.join(gameRoomID);
			socket.player.inGame = true;
			
			socket.player.name = 'You';
			
			//Create a dummy player for the player to beat
			//Don't add it to the socket.io room or else strange occurances will, well, occur
			var dummyPlayer = new Player('dummy-' + Math.random(), gameRoomID);
			dummyPlayer.inGame = true;
			dummyPlayer.name = 'Tutorial AI';
			
			//Create new room when the waiting room has done its job
			this.tree.gameRooms.push(new GameRoom(io, this.tree, [socket.player, dummyPlayer], 6, 6));
			
			console.log(chalk.blue('Tutorial started: ' + gameRoomID));
			
			
			var map = this.tree.gameRooms[this.tree.gameRooms.length - 1].map;
			
			//Send back data like a MAP_INITIALISATION event combined with a GAME_START event
			fn({
				map: map.minifiedTailoredMapData(socket.player, false),
				w: map.mapWidth,
				h: map.mapHeight,
				turn: map.turn,
				indexes: map.indexes,
				players: map.tailoredPlayerArray()
			});
			
		}
		
		//When they wish to concede
		this.concedeGame = function(socket){
			
			console.log(chalk.cyan(socket.player.name + ' conceded'));
			
			var socketGame = this.tree.getGame(socket.player.gameID);
			
			socketGame.sendServerMessage(socket.player.name + ' conceded');
			
			socketGame.removePlayer(socket.player);
			socket.to(socketGame.id).emit(EVENT.PLAYER_UPDATE, socketGame.map.tailoredPlayerArray());
			
			socketGame.checkForWin();
			
		}
		
		//When they disconnect
		this.disconnect = function(socket){
			
			//Leave game if in one
			//Leave waiting room if applicable
			//Otherwise nothing needs to be done
			
			if(socket.player.inGame){			
				
				console.log(chalk.cyan(socket.player.name + ' ragequit'));
				
				var socketGame = this.tree.getGame(socket.player.gameID);
				
				socketGame.sendServerMessage(socket.player.name + ' ragequit');
				
				socketGame.removePlayer(socket.player);
				socket.to(socketGame.id).emit(EVENT.PLAYER_UPDATE, socketGame.map.tailoredPlayerArray());
				
				socketGame.checkForWin();
				
			}else if(socket.player.isWaiting){
				
				this.tree.waitingRoom.removePlayer(socket.player);
				this.tree.waitingRoom.updateClient();
				
				console.log(chalk.cyan(socket.player.name + ' stopped waiting'));
				
			}else{
				
				console.log(chalk.cyan('A user disconnected'));
				
			}
		}
		
	}
})();
