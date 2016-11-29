
//GameRoom class

//Represents a room in which the game is played
//Not yet implemented, really

//Takes the io socket.io instance for broadcasting purposes
//Takes parameter id so that WaitingRoom can specify the ID and return it without having to create an instance of GameRoom itself

(function(){
	var UUID = require('uuid');
	var Map = require('./map');
	
	module.exports = function(io, id, players){
		this.id = id || UUID();
		
		this.io = io;
		
		this.players = players;
		
		//Alert players that they have joined a game
		this.io.to(this.id).emit('c', this.players);
		
		//Alter the player's game IDs
		for(var i = 0; i < this.players.length; i++){
			this.players[i].gameID = this.id;
		}
		
		//Removes a player and updates variables
		//Returns boolean, indicating success
		this.removePlayer = function(player){
			var removed = false;
			
			for(var i = 0; i < this.players.length; i++){
				
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
			
			return removed;
		}
		
		this.map = new Map(32, 32, this);
	}
})();