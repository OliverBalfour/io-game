
//DataTree class

//Represents a data tree containing all active game and waiting rooms

//Also contains a few utility functions (ie for finding games by their IDs, etc)

(function(){
	
	var WaitingRoom = require('./waiting-room');
	
	module.exports = function(io){
		
		this.io = io;
		
		//Get a game by its ID
		this.getGame = function(id){
			for(var i = 0; i < this.gameRooms.length; i++){
				if(this.gameRooms[i].id === id) return this.gameRooms[i];
			}
			return false;
		}
		
		//Everyone goes through the waiting room
		//Once full, or everyone has agreed to start playing, or the timer has expired, all players inside get transferred to a new game room
		this.waitingRoom = new WaitingRoom(this.io, this);
		
		//An array of game rooms
		//Every individual game is an instance of GameRoom, and has at least two players
		//These are where the actual game is played
		this.gameRooms = [];
		
	}
})();
