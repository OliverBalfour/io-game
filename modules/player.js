
//Player class

//Represents a client in the eyes of the server whether they be in the main screen, a waiting room or a game room

//The id is the socket id, so:
//io.broadcast.to(id).emit('this will', 'be sent to the player')
//The gameID is to find the room they are in (if any)

(function(){
	var utils = require('./utils');

	module.exports = function(id, gameID){
		this.id = id;
		this.name = 'Anonymous';
		this.color = utils.randomColor();
		
		//For waiting rooms, boolean when in use
		this.forceStart = null;
		
		//Is in a waiting room?
		this.isWaiting = false;
		
		//Is in a game?
		this.inGame = false;
		
		//The ID of the game that the player is in
		this.gameID = gameID || null;
		
		//If the player is in a game, this is a list of their castles
		this.castles = [];
		
		//In game currency used to pay for buildings
		this.money = 0;
		
		//Indicates whether, in the current turn, the player has moved
		this.moved = false;
		
		//Reset a player for a new game
		this.factoryReset = function(){
			this.forceStart = null;
			this.isWaiting = false;
			this.inGame = false;
			this.gameID = null;
			this.color = utils.randomColor();
			this.castles = [];
			this.money = 0;
			this.moved = false;
		}
	}
})();
