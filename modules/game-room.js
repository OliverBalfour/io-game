
//GameRoom class

//Represents a room in which the game is played
//Not yet implemented, really

//Takes the io socket.io instance for broadcasting purposes
//Takes parameter id so that WaitingRoom can specify the ID and return it without having to create an instance of GameRoom itself
//When the game ends, the end callback function (sent as parameter) is executed with the game as a parameter

(function(){
	var Map = require('./map');
	
	var EVENT = require('./const').EVENT;
	var TYPES = require('./const').TYPES;
	
	var sanitizer = require('sanitizer');
	
	module.exports = function(io, id, players, end){
		
		this.id = id;
		
		this.io = io;
		
		this.players = players;
		
		this.end = end;
		
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
			if(this.players.length === 1){
				this.io.to(this.players[0]).emit(EVENT.GAME_WON, null);
			}
			
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
		
		//The game has been won
		this.endGame = function(winner){
			console.log('A game has been won by ' + winner.name);
			this.sendServerMessage('The game has been won by ' + winner.name);
			
			for(var i = 0; i < this.players.length; i++){
				this.players[i].factoryReset();
			}
			
			this.players = [];
			
			this.end();
		}
		
		//Make a map
		this.map = new Map(16, 16, this, function(){
			this.data = [];
			
			for(var i = 0, tile; i < this.mapWidth * this.mapHeight; i++){
				tile = {
					owner: null,
					troops: 0,
					type: Math.random() > 0.1 ? TYPES.EMPTY :
						Math.random() > 0.3 ? TYPES.MOUNTAIN : TYPES.FORT,
					changed: false
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
		
		//Alert players that they have joined a game
		this.io.to(this.id).emit(EVENT.GAME_START, this.map.tailoredPlayerArray());
	}
})();