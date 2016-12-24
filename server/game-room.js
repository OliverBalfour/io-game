
//GameRoom class

//Represents a room in which the game is played
//Not yet implemented, really

//Takes the io socket.io instance for broadcasting purposes
//Takes DataTree to remove itself from it when done
//When the game ends, the end callback function (sent as parameter) is executed with the game as a parameter

(function(){
	
	var Map = require('./map');
	
	var CONSTANTS = require('./const');
	var EVENT = CONSTANTS.EVENT;
	var TYPES = CONSTANTS.TYPES;
	
	var sanitizer = require('sanitizer');
	var UUID = require('uuid');
	var chalk = require('chalk');
	
	module.exports = function(io, tree, players, w, h){
		
		this.id = UUID();
		
		this.io = io;
		this.tree = tree;
		
		this.players = players;
		
		//Removes a player and updates variables
		//Returns boolean, indicating success
		this.removePlayer = function(player){
			var removed = false;
			
			for(var i = 0; i < this.players.length; i++){
				
				//If this is the player that is to be removed, remove it
				if(this.players[i] === player){
					//Remove from array
					this.players.splice(i, 1);
					
					//Change their game ID and status
					player.factoryReset();
					
					//Indicate that it was successful
					removed = true;
					
					//Stop looking
					break;
				}
			}
			
			return removed;
		}
		
		//Checks if a player is present in the room
		this.hasPlayer = function(player){
			var ret = false;
			
			for(var i = 0; i < this.players.length; i++){
				
				//If this is the player to be found, 
				if(this.players[i] === player){
					
					//Indicate that it was found
					ret = true;
					
					//Stop looking
					break;
				}
			}
			
			return ret;
		}
		
		//Returns an array of player IDs that are in the same order as this.players; useful for indentifying players without their full ID (less bytes to transmit)
		this.getPlayerIndexes = function(){
			
			var players = [];
			
			for(var i = 0; i < this.players.length; i++){
				players.push(this.players[i].id);
			}
			
			return players;
			
		}
		
		//Player sends a message
		this.sendMessage = function(player, m){
			
			//Stuff you XSS
			m = sanitizer.sanitize(m);
			
			this.io.to(this.id).emit(EVENT.CHAT_MESSAGE, {
				t: 'p',
				i: this.map.indexes.indexOf(player.id),
				m: m
			});
			
			//Chatting isn't possible with an AFK player
			//If people exploit this to make bots AFK then feel free to remove
			player.lastActivity = 0;
			
		}
		
		//Server sends a message
		this.sendServerMessage = function(m){
			
			this.io.to(this.id).emit(EVENT.CHAT_MESSAGE, {
				t: 's',
				m: m
			});
			
		}
		
		//Check to see if this game has been won
		//Triggered whenever a player loses or disconnects
		this.checkForWin = function(){
			
			//If there is only one player left, let them know they've won
			if(this.players.length === 1){
				
				//Update the game prematurely to show the winner the final map
				this.map.transmitMap(true);
				
				//Let them know
				this.io.to(this.players[0].id).emit(EVENT.GAME_WON, null);
				
				//Stop updating game if it's finished
				clearInterval(this.map.timerInterval);
				
				//Finish the game
				this.endGame(this.players[0]);
			}
			
		}
		
		this.updateInactivity = function(){
			
			for(var i = 0; i < this.players.length; i++){
				
				this.players[i].lastActivity ++;
				
			}
			
		}
		
		//Check all players for inactivity, and remove them if so
		this.checkInactivity = function(){
			
			for(var i = 0, socket; i < this.players.length; i++){
				
				//If they went AFK, purge them
				//And save ourselves some effort
				//And server time
				//And bandwidth
				//And ... whatever
				
				//We add one because every turn one is added to the lastActivity parameter *after* it is cleared, if it is cleared
				//Meaning on a turn a player moves a troop from tile A to B, they are counted as having had one turn pass since their last move even though the move occupied the entire turn
				if(this.players[i].lastActivity >= CONSTANTS.INACTIVITY_TURN_COUNT + 1){
					
					socket = this.io.sockets.connected[this.players[i].id];
					
					console.log(chalk.cyan(socket.player.name + ' went AFK'));
					
					this.sendServerMessage(socket.player.name + ' went AFK');
					
					this.removePlayer(socket.player);
					socket.to(this.id).emit(EVENT.PLAYER_UPDATE, this.map.tailoredPlayerArray());
					
					this.checkForWin();
				}
				
			}
			
		}
		
		//The game has been won
		this.endGame = function(winner){
			console.log(chalk.blue('A game has been won by ' + winner.name));
			this.sendServerMessage('The game has been won by ' + winner.name);
			
			for(var i = 0; i < this.players.length; i++){
				this.players[i].factoryReset();
			}
			
			this.players = [];
			
			//When the game ends, remove it from the array
			this.tree.gameRooms.splice(this.tree.gameRooms.indexOf(this), 1);
		}
		
		//Make a map
		this.map = new Map(w, h, this, function(){
			this.data = [];
			
			for(var i = 0, tile; i < this.mapWidth * this.mapHeight; i++){
				tile = {
					owner: null,
					troops: 0,
					type: Math.random() > 0.1 ? TYPES.EMPTY :
						Math.random() > 0.3 ? TYPES.MOUNTAIN : TYPES.FORT,
					changed: false,
					changedOwnershipFrom: null
				}
				
				//If the tile is a naturally generated fort, add troops to it (randomised between 50 and 75)
				if(tile.type === TYPES.FORT)
					tile.troops = Math.floor(Math.random() * 26) + 50;
				
				this.data.push(tile);
			}
		});
		
		//Alter the players game IDs
		for(var i = 0; i < this.players.length; i++){
			this.players[i].gameID = this.id;
		}
		
		console.log(chalk.blue('New game started: ' + this.id));
		
		//Cycle through all of the players in the room
		for(var i = 0, socket; i < this.players.length; i++){
			
			this.players[i].isWaiting = false;
			this.players[i].inGame = true;
			
			socket = this.io.sockets.connected[this.players[i].id];
			
			//Add player to this game room
			if(socket) socket.join(this.id);
			
		}
		
		//Alert players that they have joined a game
		this.io.to(this.id).emit(EVENT.GAME_START, this.map.tailoredPlayerArray());
	}
})();