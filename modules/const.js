
//Constants

//Has constants for event codes and tile types and other bits and bobs

(function(){
	
	module.exports.EVENT = {
		SERVER_CONNECT: 0,		//Connected to server
		JOIN_WAITING_ROOM: 1,	//Join waiting room to wait for a new game room
		WAITING_ROOM_UPDATE: 2,	//Waiting room data update (timer, player count, force start count)
		FORCE_START_STATUS: 3,	//Changing a player's force start status
		GAME_START: 4,			//Server alerting client that their game has started and that they have been transferred from the waiting room
		LEAVE_WAITING_ROOM: 5,	//Leave waiting room, or cancel waiting
		MAP_INITIALISATION: 6,	//Inital map data dump
		MAP_UPDATE: 7,			//Map update; updating the tiles the user can see
		MOVE_TROOPS: 8,			//A player wants to move troops from tile A to tile B (tiles A and B must be next to each other)
		PLAYER_CAPTURED: 9,		//Sent to a player when they have lost the game (I LOST THE GAME!!!)
		PLAYER_UPDATE: 10,		//Sent when the in game leaderboard needs to be updated
		GAME_WON: 11,			//Sent to the winner of the game (I LOST THE GAME!!!)
		TILE_UPGRADE: 12,		//A player wants to upgrade a tile, or build something on it
		CHAT_MESSAGE: 13		//A player is sending or has sent a message, or the server is sending a message in game
	};
	
	module.exports.TYPES = {
		UNKNOWN: -1,			//Client only, indicates if a tile's type is completely unknown
		EMPTY: 0,				//Empty tile (may have troops)
		CASTLE: 1,				//Castle tile, when all of a player's castles are captured they lose
		FORT: 2,				//Fort/fortress, generates a troop a turn along with castles
		FARM: 3,				//Generate money, which is needed to sustain buildings
		BARRACKS: 4				//Generate troops more cheaply than a castle or fort, once every two turns a troop is trained
	};
	
	module.exports.COST = {
		CASTLE: 7500,			//Castle costs 7500 to build on top of an already present fort
		FORT: 5000,				//Fort costs 5000 to build
		BARRACKS: 1500,			//Barracks cost 1500 to build
		FARM: 500				//Farms cost 500 to build
	}
	
})();