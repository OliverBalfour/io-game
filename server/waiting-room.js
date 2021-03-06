
//WaitingRoom class

//Represents a waiting room, where players accumulate until a game is started
//A game may start one of three ways
// - The maximum player limit reached
// - All players (>1) choose to force start the match
// - The timer expires (the timer is only active when >1 players are in the waiting room, otherwise it is reset)
//When a game starts, all players in the waiting room are transferred to the game and the waiting room resets

//Parameters
//io - The socket.io server instance
//tree - The DataTree to add newly started games to
//options - object:
//	timerLength - The time in seconds that the timer lasts, default 120
//	playerLimit - The maximum amount of players, when reached the game starts, default 8
//	minPlayers - The minimum amount of players to start a game, default 2
//	forceStart - Boolean, should force starting be an option or not, default true
//	useTimer - Boolean, should the timer be active, default true

(function(){
	
	const UUID = require('uuid');
	const chalk = require('chalk');
	
	const GameRoom = require('./game-room');
	
	const EVENT = require('./const').EVENT;
	
	module.exports = function(io, tree, options){
		//Save ourselves a lotta hassle
		options = options || {};
		
		//ID
		this.id = UUID();
		
		this.io = io;
		this.tree = tree;
		
		//Safe to send to the client; contains player count, timer and the count of people who want to force start the game
		//When sent to the client though, it should be stringified and minified first to save bandwidth
		this.client = {
			//Seconds until automatic start, only active if more than one player is in the waiting room
			timer: options.timerLength || 120,
			
			//Player count, equal to this.players.length
			playerCount: 0,
			
			//Force start count (amount of players who want to force start)
			forceStartCount: 0,
			
			//Player limit (most players that can be in a game)
			playerLimit: options.playerLimit || 8,
			
			//Minimum players to start a game (with < min_players the timer and force start options don't work)
			minPlayers: options.minPlayers || 2
		}
		
		this.players = [];
		
		this.updateTimer = function(){
			//Update the timer
			this.client.timer -= 1;
			
			//If the timer has expired, start the game!
			if(this.client.timer === 0){
				this.startGame();
			}
			
			//Send timer to all currently waiting clients
			this.io.to(this.id).emit(EVENT.WAITING_ROOM_UPDATE, this.client.timer);
		}
		
		//When the timer starts (2 or more players in this.players) this will become a setInterval intervalId (number) for use with clearInterval
		this.timerInterval = null;
		
		//Timer length in seconds
		this.timerLength = options.timerLength || 120;
		
		//Force start and timer usage booleans
		this.forceStart = options.forceStart || true;
		this.useTimer = options.useTimer || true;
		
		//Update the count for the amount of people who want to force start
		//And the player count
		this.updateClient = function(){
			//Update force start count
			this.client.forceStartCount = 0;
			for(i in this.players){
				if(this.players[i].forceStart) this.client.forceStartCount ++;
			}
			
			//Update player count
			this.client.playerCount = this.players.length;
			
			//If the number of players has reached the limit, start the game
			if(this.players.length === this.client.playerLimit){
				this.startGame();
			}
			
			//If all (>1) of the players wish to force start and force start is enabled, start the game
			if(this.forceStart && this.players.length > 1 && this.client.forceStartCount === this.players.length){
				this.startGame();
			}
			
			//If timer in use
			if(this.useTimer){
				//If the timer is off and should be on, restart it!
				if(this.timerInterval === null && this.players.length > 1){
					this.timerInterval = setInterval(this.updateTimer.bind(this), 1000);
				}
				
				//If the timer is on and should be off, stop it
				if(this.timerInterval !== null && this.players.length < 2){
					clearInterval(this.timerInterval);
					this.timerInterval = null;
					this.client.timer = this.timerLength;
				}
			}
			
			//Send that data!
			//We send it in a much more efficient format than JSON; just a string, but given that the waiting room updates are never huge anyway that is enough
			this.io.to(this.id).emit(
				EVENT.WAITING_ROOM_UPDATE,
				this.client.timer + ' ' + this.client.forceStartCount + ' ' + this.client.playerCount
			);
		}
		
		//Adds a player and updates relevant variables
		//If the addition is successful it returns true, meaning that all of the clients in the waiting room need to have their counters updated
		this.addPlayer = function(player){
			//No doubleups thanks!
			if(this.players.indexOf(player) === -1){
				this.players.push(player);
				this.client.playerCount = this.players.length;
			}
			
			//The player is a doubleup
			//Trying to cheat lol
			return false;
		}
		
		//Removes a player and updates variables
		//Same as addPlayer, but removes instead
		//Returns boolean like addPlayer
		this.removePlayer = function(player){
			let removed = false;
			
			for(let i = 0; i < this.players.length; i++){
				
				//If this is the player that is to be removed, remove it
				if(this.players[i] === player){
					//Remove from array
					this.players.splice(i, 1);
					
					//Indicate that it was successful
					removed = true;
					
					//Stop looking
					break;
				}
			}
			
			this.client.playerCount = this.players.length;
			
			return removed;
		}
		
		//Grabs a transmissable waiting room client data string
		this.getFullClient = function(){
			return this.client.timer + ' ' + this.client.forceStartCount + ' ' + this.client.playerCount + ' ' + this.client.playerLimit + ' ' + this.client.minPlayers;
		}
		
		//Start game
		this.startGame = function(){
			
			//Create new room when the waiting room has done its job
			let gameRoom = new GameRoom(this.io, this.tree, this.players.slice(0), 16, 16);
			
			//Stop players receiving waiting room updates
			for(let i = 0, socket; i < this.players.length; i++){
				
				socket = this.io.sockets.connected[this.players[i].id];
				
				socket.leave(this.id);
				
			}
			
			//Remove players from this waiting room's player list
			this.players = [];
			
			//Add game to list
			this.tree.gameRooms.push(gameRoom);
			
		}
	}
})();