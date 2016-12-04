
//GameRoom class

//Represents a room in which the game is played
//Not yet implemented, really

//Takes the io socket.io instance for broadcasting purposes
//Takes parameter id so that WaitingRoom can specify the ID and return it without having to create an instance of GameRoom itself
//When the game ends, the end callback function (sent as parameter) is executed with the game as a parameter

(function(){
	var Map = require('./map');
	
	var EVENT = require('./const').EVENT;
	
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
		
		//Check to see if this game has been won
		//Triggered whenever a player loses or disconnects
		this.checkForWin = function(){
			if(this.players.length === 1){
				this.io.to(this.players[0]).emit(EVENT.GAME_WON, null);
			}
			
			//If there is only one player left, let them know they've won
			if(this.players.length === 1){
				
				//Update the game prematurely to show the winner the final map
				this.map.transmitMap();
				
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
			
			for(var i = 0; i < this.players.length; i++){
				this.players[i].factoryReset();
			}
			
			this.players = [];
			
			this.end();
		}
		
		//Make a map
		this.map = new Map(16, 16, this);
		
		//Alter the players game IDs
		for(var i = 0; i < this.players.length; i++){
			this.players[i].gameID = this.id;
		}
		
		//Alert players that they have joined a game
		this.io.to(this.id).emit(EVENT.GAME_START, this.map.tailoredPlayerArray());
	}
})();