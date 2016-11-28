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

//Connected to server
socket.on('s', function(id){
	console.log(id);
	data.id = id;
});

//Waiting room update
socket.on('w', function(room){
	data.room = room;
	updateRoom();
});

//Game has started
socket.on('c', function(players){
	console.log(players);
	var playerNames = [];
	players.forEach(function(player){ playerNames.push(player.name) });
	dom.id('gr-players').innerText = playerNames.join(', ');
	dom.changeScreen('waiting-room', 'game-room');
	
	canvas = document.getElementById('map');
	map = new Map(32, 32, 30, canvas);
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
	socket.emit('j', dom.id('name').value, function(room){
		data.room = room;
		updateRoom();
		dom.changeScreen('start-screen', 'waiting-room');
	});
}

function leaveWaitingRoom(){
	socket.emit('l', null);
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
	socket.emit('f', dom.id('force-start').classList.contains('active'));
}