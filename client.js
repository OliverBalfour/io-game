var socket = io();
var data = {};

//Tile type enumeration
var TYPES = {
	UNKNOWN: -1,
	EMPTY: 0,
	CASTLE: 1,
	FORT: 2,
	FARM: 3,
	BARRACKS: 4
}

var EVENT = {
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
	GAME_WON: 11,
	TILE_UPGRADE: 12
};

//Connected to server
socket.on(EVENT.SERVER_CONNECT, function(id){
	console.log(id);
	data.id = id;
});

//Waiting room update
socket.on(EVENT.WAITING_ROOM_UPDATE, function(room){
	data.room = room;
	updateRoom();
});

//Game has started
//The view is changed once the map has been sorted out
socket.on(EVENT.GAME_START, function(players){
	
	data.players = players;
	updatePlayers();
	
});

//Init map
socket.on(EVENT.MAP_INITIALISATION, function(d){
	
	map = new Map(socket, d.w, d.h, 30, canvas, data.id, data);
	
	data.turn = d.turn;
	
	map.data = d.map;
	
	fixMap();
	
	//Focus around the center tile
	for(var i = 0; i < map.data.length; i++){
		if(map.data[i].owner){
			map.centerTile(i);
		}
	}
	
	//Initial map draw
	map.prepareAndDrawMap();
	
	//Change view
	dom.changeScreen('waiting-room', 'game-room');
	
	//Reset force start status
	dom.id('force-start').classList.remove('active');
	
	map.updateActionBar();
	
});

//Map update
socket.on(EVENT.MAP_UPDATE, function(d){
	
	map.data = d.map;
	
	data.turn = d.turn;
	dom.id('turn-count').innerText = d.turn;
	
	data.money = d.money;
	dom.id('money-count').innerText = d.money;
	
	fixMap();
	
	map.prepareAndDrawMap();
	
	map.updateActionBar();
	
});

//Fixes the map data sent
function fixMap(){
	for(var i = 0; i < map.data.length; i++){
		
		//If the current tile is empty, make it not empty
		if(!map.data[i]){
			map.data[i] = {
				owner: null,
				troops: 0,
				type: TYPES.UNKNOWN
			}
		}
	}
}

//Client validation for tile upgrade request, saves the server a bit of bandwidth
function upgradeTile(upgrade){
	if(map.selectedTile !== -1){
		
		function sendData(){
			socket.emit(EVENT.TILE_UPGRADE, {
				i: map.selectedTile,
				u: upgrade
			});
		}
		
		var i = map.selectedTile;
		
		//Ensure the player owns the tile
		if(map.data[i].owner.id !== data.id) return false;
		
		//Cycle through the possibilities and only send data if it matches one to save bandwidth
		//Of course, the server still checks everything
		
		//Building stuff on empty ground
		if(map.data[i].type === TYPES.EMPTY){
			
			//Build a farm, barracks or fort
			if(upgrade === TYPES.FARM && data.money >= 500 || upgrade === TYPES.BARRACKS && data.money >= 2000 || upgrade === TYPES.FORT && data.money >= 5000)
				sendData();
			
		}
		
		//Upgrade fort to castle
		if(map.data[i].type === TYPES.FORT && upgrade === TYPES.CASTLE && data.money >= 7500)
			sendData();
		
		//They want to demolish something
		if(upgrade === TYPES.EMPTY && map.data[i].type !== TYPES.EMPTY && map.data[i].type !== TYPES.UNKNOWN)
			sendData();
		
	}
}

//Toggle the details panel on the action bar
function toggleActionBarDetail(){
	dom.id('action-bar').classList.toggle('expanded');
	dom.id('action-toggle-detail').innerText = dom.id('action-toggle-detail').innerText === '<' ? '>' : '<';
}

socket.on(EVENT.PLAYER_UPDATE, function(players){
	data.players = players;
	
	updatePlayers();
});

//Sometimes you win, sometimes you lose
socket.on(EVENT.PLAYER_CAPTURED, function(player){
	dom.show('gr-lose');
	dom.hide('gr-win');
	dom.show('game-end-modal');
	
	//Deselect whatever tile they had selected
	map.selectedTile = -1;
});

//Ok, maybe you always win
socket.on(EVENT.GAME_WON, function(nothin){
	dom.show('gr-win');
	dom.hide('gr-lose');
	dom.show('game-end-modal');
})

var canvas = document.getElementById('map'),
	map; //Empty until game start (becomes Map() )

//Namespace for abstracting the Document Object Model
var dom = {};

dom.id = function(str){
	return document.getElementById(str);
}
dom.hide = function(str){
	this.id(str).classList.add('hidden');
}
dom.show = function(str){
	this.id(str).classList.remove('hidden');
}
dom.changeScreen = function(s1, s2){
	this.hide(s1);
	this.show(s2);
}


function joinWaitingRoom(){
	socket.emit(EVENT.JOIN_WAITING_ROOM, dom.id('name').value, function(room){
		data.room = room;
		updateRoom();
		dom.changeScreen('start-screen', 'waiting-room');
	});
}

function leaveWaitingRoom(){
	socket.emit(EVENT.LEAVE_WAITING_ROOM, null);
	dom.changeScreen('waiting-room', 'start-screen');
}

function updateRoom(){
	//Player count update
	dom.id('wr-count').innerText = dom.id('wr-pc').innerText = data.room.playerCount;
	
	//Force start count update
	dom.id('wr-fsc').innerText = data.room.forceStartCount;
	
	//Timer update
	dom.id('wr-timer').innerText = Math.floor(data.room.timer / 60) + ':' + (
		data.room.timer % 60 < 10 ? '0' + (data.room.timer % 60) : data.room.timer % 60
	);
	
	//Max player limit update
	dom.id('wr-player-limit').innerText = data.room.playerLimit;
	
	//Hiding and showing relevant parts of the screen
	if(data.room.playerCount < 2){
		dom.hide('force-start');
		dom.hide('wr-timer-cont');
		dom.id('wr-cancel').classList.add('fill-gap');
	}else{
		dom.show('force-start');
		dom.show('wr-timer-cont');
		dom.id('wr-cancel').classList.remove('fill-gap');
	}
}

function toggleForceStart(){
	dom.id('force-start').classList.toggle('active');
	socket.emit(EVENT.FORCE_START_STATUS, dom.id('force-start').classList.contains('active'));
}

function updatePlayers(){
	var players = data.players;
	
	console.log(players)
	
	//Concatenate player names into a list
	var playerNames = [];
	players.forEach(function(player){ playerNames.push(player.name) });
	dom.id('gr-players').innerHTML = "<span class='gr-player'>" + playerNames.join("</span><span class='gr-player'>") + "</span>";
}

function exitGame(){
	
	//Destroy map
	map.destroy();
	//map = null;
	
	//Change view
	dom.changeScreen('game-room', 'start-screen');
	
	//Remove modal
	dom.hide('game-end-modal');
	
}