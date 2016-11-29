

//Strategy game server server side code
//Built with Node, Express and Socket.io

//Copyright Oliver Balfour 2016

(function(){
	
	var app = require('express')();
	var http = require('http').Server(app);
	var io = require('socket.io')(http);
	var path = require('path');
	var UUID = require('uuid');
	
	//Other modules
	
	//Quick function for getting a module in the modules directory
	function getModule(name){
		return require(path.join(__dirname, 'modules', name));
	}
	
	var WaitingRoom = getModule('waiting-room');
	var GameRoom = getModule('game-room');
	var Player = getModule('player');
	var utils = getModule('utils');
	
	//Game namespace
	var game = {};
	
	//At the root of the server, the game is served
	app.get('/', function(req, res){
		res.sendFile(path.join(__dirname, 'index.html'));
	});
	
	//Get individual files on the server - currently unsafe
	app.get('/*', function(req, res, next){
		var file = req.params[0];
		
		res.sendFile(path.join(__dirname, '/' + file));
	});
	
	//Everyone goes through the waiting room
	//Once full, or everyone has agreed to start playing, or the timer has expired, all players inside get transferred to a new game room
	game.waitingRoom = new WaitingRoom(io, function(id, players){
		game.gameRooms.push(new GameRoom(io, id, players));
	});
	
	//An array of game rooms
	//Every individual game is an instance of GameRoom, and has at least two players
	//These are where the actual game is played
	game.gameRooms = [];
	
	//Get a game by it's ID
	game.getGame = function(id){
		for(var i = 0; i < this.gameRooms.length; i++){
			if(this.gameRooms[i].id === id) return this.gameRooms[i];
		}
		return false;
	}
	
	var EVENT = {
		SERVER_CONNECT: 0,
		JOIN_WAITING_ROOM: 1,
		WAITING_ROOM_UPDATE: 2,
		FORCE_START_STATUS: 3,
		GAME_START: 4,
		LEAVE_WAITING_ROOM: 5,
		MAP_INITIALISATION: 6,
		MAP_UPDATE: 7
	};
	
	io.on('connection', function(socket){
		console.log('A user connected');
		
		//Socket event codes
		//These are minimised for minimal bandwidth usage
		//s - Connected to server
		//j - Join waiting room for new game room
		//w - Waiting room data update (timer, player count, force start count)
		//f - Changing a player's force start status
		//c - Server alerting client that their game has started and that they have been transferred from the waiting room
		//l - Leave waiting room, or cancel waiting
		//m - Map init
		//g - Map update
		
		//Tell the user they're connected, and give them their ID
		socket.emit(EVENT.SERVER_CONNECT, socket.id);
		
		//They are a player, yes?
		socket.player = new Player(socket.id);
		
		//When the user hits play, they are given a waiting room
		//That is, assuming their name is valid
		socket.on(EVENT.JOIN_WAITING_ROOM, function(name, fn){
			//Stupid anons
			socket.player.name = name !== '' ? name : 'Anonymous';
			
			socket.player.gameID = game.waitingRoom.id;
			
			console.log(socket.player.name + ' joined the waiting room.');
			
			//Add them to the waiting room
			socket.join(game.waitingRoom.id);
			game.waitingRoom.addPlayer(socket.player);
			socket.player.gameID = game.waitingRoom.id;
			socket.player.isWaiting = true;
			game.waitingRoom.updateClient();
			
			//Send back barebones waiting room data - the timer, force start count and player count
			fn(game.waitingRoom.client);
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
		
		//When they disconnect
		socket.on('disconnect', function(){
			
			//Leave game if in one
			//Leave waiting room if applicable
			//Otherwise nothing needs to be done
			
			if(socket.player.inGame){			
				
				console.log(socket.player.name + ' ragequit');
				
				game.getGame(socket.player.gameID).removePlayer(socket.player);
				
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