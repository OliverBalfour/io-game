var socket = io();
var data = {};

//Socket event codes
//These are minimised for minimal bandwidth usage
//s - Connected to server
//j - Join waiting room for new game room
//w - Waiting room data update (timer, player count, force start count)
//f - Changing a player's force start status
//c - Server alerting client that their game has started and that they have been transferred from the waiting room
//l - Leave waiting room, or cancel waiting
//m - Map init
//g - Map update

var EVENT = {
	SERVER_CONNECT: 0,
	JOIN_WAITING_ROOM: 1,
	WAITING_ROOM_UPDATE: 2,
	FORCE_START_STATUS: 3,
	GAME_START: 4,
	LEAVE_WAITING_ROOM: 5,
	MAP_INITIALISATION: 6,
	MAP_UPDATE: 7
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
socket.on(EVENT.GAME_START, function(players){
	console.log(players);
	var playerNames = [];
	players.forEach(function(player){ playerNames.push(player.name) });
	dom.id('gr-players').innerText = playerNames.join(', ');
	dom.changeScreen('waiting-room', 'game-room');
	
	canvas = document.getElementById('map');
});

//Init map
socket.on(EVENT.MAP_INITIALISATION, function(d){
	map = new Map(d.w, d.h, 30, canvas);
	map.data = d.data;
	map.prepareAndDrawMap();
});

//Map update
socket.on(EVENT.MAP_UPDATE, function(d){
	map.data = d;
	map.prepareAndDrawMap();
});

var canvas, map;

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