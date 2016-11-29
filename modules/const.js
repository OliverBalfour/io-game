
//Constants

//Has constants for event codes and tile types

(function(){
	
	module.exports.EVENT = {
		SERVER_CONNECT: 0,
		JOIN_WAITING_ROOM: 1,
		WAITING_ROOM_UPDATE: 2,
		FORCE_START_STATUS: 3,
		GAME_START: 4,
		LEAVE_WAITING_ROOM: 5,
		MAP_INITIALISATION: 6,
		MAP_UPDATE: 7,
		MOVE_TROOPS: 8,
		PLAYER_CAPTURED: 9,
		PLAYER_UPDATE: 10,
		GAME_WON: 11
	};
	
	module.exports.TYPES = {
		UNKNOWN: -1,
		EMPTY: 0,
		CASTLE: 1,
		FORT: 2,
		FARM: 3,
		BARRACKS: 4
	};
	
})();