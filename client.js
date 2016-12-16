
var socket = io();

var data = {
	room: {},
	players: [],
	indexes: [],
	moved: false,
	queue: []
};

//Tile type enumeration
var TYPES = {
	UNKNOWN: -1,
	EMPTY: 0,
	CASTLE: 1,
	FORT: 2,
	FARM: 3,
	BARRACKS: 4,
	MOUNTAIN: 5
}

//Event code enumeration
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
	TILE_UPGRADE: 12,
	CHAT_MESSAGE: 13
};

//Costs of various buildings
var COST = {
	CASTLE: 5000,
	FORT: 2000,
	BARRACKS: 500,
	FARM: 200
}

//Connected to server
socket.on(EVENT.SERVER_CONNECT, function(id){
	data.id = id;
});

//Waiting room update
socket.on(EVENT.WAITING_ROOM_UPDATE, function(room){
	waitingRoomUpdate(room);
});

function waitingRoomUpdate(room){
	
	var nums = [];
	
	//Grab all of the data in an array
	if(typeof room === 'string'){
		nums = room.split(' ');
		
		//Parse everything into numbers
		nums = nums.map(function(str){
			return parseInt(str);
		});
	}else{
		//Just the timer sent as a number
		nums = [room];
	}
	
	//If a certain attribute has been sent, update to it
	if(typeof nums[0] !== 'undefined') data.room.timer = nums[0];
	if(typeof nums[1] !== 'undefined') data.room.forceStartCount = nums[1];
	if(typeof nums[2] !== 'undefined') data.room.playerCount = nums[2];
	if(typeof nums[3] !== 'undefined') data.room.playerLimit = nums[3];
	if(typeof nums[4] !== 'undefined') data.room.minPlayers = nums[4];
	
	updateRoom();
	
}

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
	
	//Indexes, essentially game specific IDs for players, great for saving bandwidth (1 byte instead of 16)
	data.indexes = d.indexes;
	
	fixMap(d.map);
	
	//Center the map on the only owned tile on the screen - the player's castle
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
	
	//Turn and money updating
	
	data.turn = d.turn;
	dom.id('turn-count').innerText = d.turn;
	
	data.money = d.money;
	dom.id('money-count').innerText = d.money;
	
	updateTiles();
	
	//Set the map data as a cleaned up version of the transmission
	fixMap(d.map);
	
	//Reset the map entirely
	map.prepareAndDrawMap();
	
	//Highlight and dull the appropriate buttons on the action bar
	map.updateActionBar();
	
	//They haven't made their move for the turn
	data.moved = false;
	
	//Or have they?
	map.nextInQueue();
	
});

//Fixes the map data sent and stores it
function fixMap(d){
	
	var tiles = [];
	
	//Cycle through tiles that need updating and update them
	for(var i = 0, tile, da, ij; i < d.length; i++){
		if(d[i]){
			
			tile = {};
			da = d[i].split(' ');
			
			if(typeof da[0] !== 'undefined') tile.troops = parseInt(da[0]);
			if(typeof da[1] !== 'undefined') tile.type = parseInt(da[1]);
			if(typeof da[2] !== 'undefined') ij = parseInt(da[2]);
			if(typeof da[3] !== 'undefined')
				tile.owner = data.indexes[parseInt(da[3])];
			else
				tile.owner = null;
			
			map.data[ij] = tile;
			
			tiles.push(ij);
			
		}
	}
	
}

//Client prediction; everything that isn't overridden by the server is predictable with constant change
function updateTiles(){
	for(var i = 0, tile; i < map.data.length; i++){
		tile = map.data[i];
		
		//For any owned tile, which needs to be updated
		if(tile.owner !== null){
			
			if(tile.type === TYPES.CASTLE || tile.type === TYPES.FORT){
				tile.troops++;
				if(tile.owner) tile.owner.money += 10;
			}
			
			if(tile.type === TYPES.BARRACKS && data.turn % 2 === 0){
				tile.troops++;
			}
			
			if(tile.type === TYPES.FARM){
				if(tile.owner) tile.owner.money += 10;
			}
			
			if(tile.type === TYPES.EMPTY && data.turn % 25 === 0){
				tile.troops++;
				if(tile.owner) tile.owner.money++;
			}else if(data.turn % 5 === 0){
				if(tile.owner) tile.owner.money++;
			}
			
		}
	}
}

//Client validation for tile upgrade request, saves the server a bit of bandwidth
//As in, a tiny tiny bit
//Like, 5KB a month
//xD
//But the code is copy/pasted so whatever
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
		if(!map.data[i].owner || map.data[i].owner !== data.id) return false;
		
		//Cycle through the possibilities and only send data if it matches one to save bandwidth
		//Of course, the server still checks everything
		
		//Building stuff on empty ground
		if(map.data[i].type === TYPES.EMPTY){
			
			//Build a farm, barracks or fort
			if(upgrade === TYPES.FARM && data.money >= COST.FARM || upgrade === TYPES.BARRACKS && data.money >= COST.BARRACKS || upgrade === TYPES.FORT && data.money >= COST.FORT)
				sendData();
			
		}
		
		//Upgrade fort to castle
		if(map.data[i].type === TYPES.FORT && upgrade === TYPES.CASTLE && data.money >= COST.CASTLE)
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

//Get a player object by their ID
function getPlayer(id){
	for(var i = 0; i < data.players.length; i++){
		if(data.players[i].id === id) return data.players[i];
	}
	
	return false;
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
	
	gameEnd();
	
});

//Ok, maybe you always win
socket.on(EVENT.GAME_WON, function(nothin){
	
	dom.show('gr-win');
	dom.hide('gr-lose');
	dom.show('game-end-modal');
	
	gameEnd();
	
});

function gameEnd(){
	
	//Deselect whatever tile they had selected
	map.selectedTile = -1;
	
	//Clear queue
	data.queue = [];
	
}

var canvas = document.getElementById('map'),
	map; //Empty until game start (becomes Map() )

//Namespace for abstracting the Document Object Model into a somewhat useful pile of crap
var dom = {};

dom.id = function(str){
	return document.getElementById(str);
}
dom.className = function(str){
	return document.getElementsByClassName(str);
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
		waitingRoomUpdate(room);
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
	
	//Concatenate player names into a list
	var playerNames = [];
	players.forEach(function(player){ playerNames.push("<span class='gr-player' style='color: " + player.color + "'>" + player.name + "</span>") });
	dom.id('gr-players').innerHTML = playerNames.join('');
}

function exitGame(){
	
	//Destroy map
	map.destroy();
	//map = null;
	
	//Change view
	dom.changeScreen('game-room', 'start-screen');
	
	//Remove modal
	dom.hide('game-end-modal');
	
	//Clear the last game's messages
	dom.id('messages').innerHTML = '';
	
}

//When client presses enter in the chat field, send message
dom.id('chatbox').addEventListener('keydown', function(e){
	
	if(e.which === 13){
		socket.emit(EVENT.CHAT_MESSAGE, dom.id('chatbox').value);
		dom.id('chatbox').value = '';
	}
	
});

socket.on(EVENT.CHAT_MESSAGE, function(msg){
	
	var html = '';
	
	if(msg.t === 'p'){
		html = "<div class='message'><span style='color: " + getPlayer(data.indexes[msg.i]).color + "'>" + getPlayer(data.indexes[msg.i]).name + ": </span>" + msg.m + "</div>";
	}else{
		html = "<div class='message'><b>" + msg.m + "</b></div>";
	}
	
	dom.id('messages').innerHTML += html;
	
	updateScroll();
	
});

function updateScroll(){
	var el = dom.id('messages');
	el.scrollTop = el.scrollHeight - 110;
}

/*
//Populate the HTML with building costs
function populateCosts(){
	
	//var names = dom.className('name'),
	//	actionIcons = dom.className('action-icon');
	
	//for(var i = 0; i < names.length; i++){
	//	names[i].innerHTML = names[i].innerHTML.replace(/%([A-Z]+)/g, /%([A-Z]+)/g.exec(names[i].innerHTML)[1]);
	//}
	
	var regex = /%([A-Z]+)/g;
	
	var match = regex.exec(document.body.innerHTML);
	
	var res = document.body.innerHTML;
	
	while(match !== null){
		
		var val = window[match[0]]
		
		res = res.replace(/%([A-Z]+)/, val);
		
		match = regex.exec(document.body.innerHTML);
		
	}
	
	document.body.innerHTML = res;
	
}
populateCosts();
*/