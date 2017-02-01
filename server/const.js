
//Constants

//Has constants for event codes and tile types and other bits and bobs

(function(){
	
	//Event code enumeration
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
		CHAT_MESSAGE: 13,		//A player is sending or has sent a message, or the server is sending a message in game
		START_TUTORIAL: 14,		//A player is starting the tutorial
		CONCEDE_GAME: 15,		//A player has decided that they don't want to continue playing
		GONE_INACTIVE: 16
	};
	
	//Tile type enumeration
	module.exports.TYPES = {
		UNKNOWN: -1,			//Client only, indicates if a tile's type is completely unknown
		EMPTY: 0,				//Empty tile (may have troops)
		CASTLE: 1,				//Castle tile, when all of a player's castles are captured they lose
		FORT: 2,				//Fort/fortress, generates a troop a turn along with castles
		FARM: 3,				//Generate money, which is needed to sustain buildings
		BARRACKS: 4,			//Generate troops more cheaply than a castle or fort, once every two turns a troop is trained
		MOUNTAIN: 5				//Mountain tile; cannot be passed
	};
	
	//Building costs
	module.exports.COST = {
		CASTLE: 5000,			//Castle costs 5000 to build on top of an already present fort
		FORT: 2000,				//Fort costs 2000 to build
		BARRACKS: 500,			//Barracks cost 500 to build
		FARM: 200				//Farms cost 200 to build
	}
	
	//Tile defence multipliers, MULTIPLIERS[tile.type] gets the relevant multiplier
	//eg. for 0.4, defending troops simulate being 1 + 0.4 times larger in force
	module.exports.MULTIPLIERS = [
		0,						//Empty
		0.1,					//Castle
		0.05,					//Fort
		0.025,					//Farm
		0.04,					//Barracks
		1						//Mountain, WTF?
	];
	
	//Sent to the client when they need to stop seeing a tile
	module.exports.UNKNOWN_TILE = {
		type: -1,
		troops: 0,
		owner: null,
		changed: false,
		changedOwnershipFrom: null
	};
	
	//The amount of turns in which no activity is made by a user before they are counted as inactive and removed from the game
	module.exports.INACTIVITY_TURN_COUNT = 50;
	
})();