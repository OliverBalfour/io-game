
//Map class

//Map for the server end, contains all of the map data and controls networking necessary data to the client

//Shares many of the functions of the client side map, but has procedural generation, networking, and actual game logic involved
//It is able to be given various procedural generation functions that are bound to the map on execution (ie generationFunction.bind(this) )
//Currently it only takes width and height in tiles, the game room it is in and the generation function
//Networking is handled through this.gameRoom.io

(function(){
	
	var CONSTANTS = require('./const');
	var EVENT = CONSTANTS.EVENT;
	var TYPES = CONSTANTS.TYPES;
	var COST = CONSTANTS.COST;
	
	module.exports = function(w, h, gameRoom, generationFunction){
		
		//Size
		this.mapWidth = w;
		this.mapHeight = h;
		
		//Game room (for accessing players)
		this.gameRoom = gameRoom;
		
		//The data for the map is all stored in one big array
		this.data = [];
		
		//If generation function is provided, use that, otherwise just use a basic generation function that has empty tiles
		this.generate = generationFunction ? generationFunction.bind(this) : function(){
			//Populating that array with empty tile objects
			this.data = [];
			
			for(var i = 0; i < this.mapWidth * this.mapHeight; i++){
				this.data.push({
					owner: null,
					troops: 0,
					type: TYPES.EMPTY
				});
			}
		}
		
		//Add starting castles, one per player, to the map
		this.addPlayersToMap = function(){
			for(var i = 0, player, j; i < this.gameRoom.players.length; i++){
				player = this.gameRoom.players[i];
				
				var tile = this.getEmptyTile();
				
				this.data[tile].owner = player;
				this.data[tile].troops = 1;
				this.data[tile].type = TYPES.CASTLE;
				
				player.castles = [tile];
			}
		}
		
		//Get a random empty tile
		//Returns the index
		this.getEmptyTile = function(){
			var i = Math.floor(Math.random() * this.data.length);
			
			while(!this.tileIsEmpty(i)){
				i = Math.floor(Math.random() * this.data.length);
			}
			
			return i;
		}
		
		//Returns true if the tile is empty (unowned and ownable)
		this.tileIsEmpty = function(i){
			
			if(!this.tileExists) return false;
			
			//WARNING
			//As soon as mountains are implemented this will need to be fixed
			return this.data[i].owner === null;
			
		}
		
		//Returns true if the tile index specified is in the boundaries
		this.tileExists = function(i){
			return typeof i === 'number' && i >= 0 && i < this.data.length;
		}
		
		//Neighbour not neighbor American scumbags
		//But yes, I use color consistently instead of colour
		//This is because I'm used to it
		//Neighbor I dislike though
		//Takes a tile id and returns the tile's neighbour's id at rotation rotation
		//Rotation starts at 0 being directly above and then increments as it goes clockwise:
		
		//    0
		// 5     1
		//
		// 4     2
		//    3
		
		//If either tile doesn't exist it returns false
		
		this.getTileNeighbour = function(i, rotation){
			
			rotation %= 6;
			
			if(i < 0 || i >= this.data.length) return false;
			
			var j = 0,
				even = i % 2 === 0;
			
			switch(rotation){
				case 0:
					j = i - this.mapWidth;
					break;
				
				case 3:
					j = i + this.mapWidth;
					break;
				
				case 1:
					if(even)
						j = i - this.mapWidth + 1;
					else
						j = i + 1;
					break;
				
				case 2:
					if(even)
						j = i + 1;
					else
						j = i + this.mapWidth + 1;
					break;
				
				case 4:
					if(even)
						j = i - 1;
					else
						j = i + this.mapWidth - 1;
					break;
				
				case 5:
					if(even)
						j = i - this.mapWidth - 1;
					else
						j = i - 1;
					break;
			}
			
			if(
				//Making sure the tile isn't being wrapped to the other side of the map
				!(
					j % this.mapWidth === this.mapWidth - 1 && i % this.mapWidth === 0 ||
					i % this.mapWidth === this.mapWidth - 1 && j % this.mapWidth === 0
				) &&
				
				//Making sure j is actually a tile
				j >= 0 && j < this.data.length
			){
				return j;
			}
			
			//Not a tile
			return false;
		}
		
		//Turn number
		//Transmitted to the client
		//A troop a turn is generated on a castle or fort
		this.turn = 0;
		
		//Time in seconds that it takes for a turn to expire
		//Turns are not standard turns; when the turn length has expired then it will go straight to the next without waiting for users
		//This makes for a hectic game
		this.turnLength = 1;
		
		//Update tiles based on user input
		this.updateTiles = function(){
			for(var i = 0, tile; i < this.data.length; i++){
				tile = this.data[i];
				
				//For any owned tile, which needs to be updated
				//A tile is only considered owned and in need of updating if the owner is online
				if(tile.owner !== null && this.gameRoom.hasPlayer(tile.owner)){
					
					if(tile.type === TYPES.CASTLE || tile.type === TYPES.FORT){
						tile.troops++;
						if(tile.owner) tile.owner.money += 10;
					}
					
					if(tile.type === TYPES.BARRACKS && this.turn % 2 === 0){
						tile.troops++;
					}
					
					if(tile.type === TYPES.FARM){
						if(tile.owner) tile.owner.money += 10;
					}
					
					if(tile.type === TYPES.EMPTY && this.turn % 25 === 0){
						tile.troops++;
						if(tile.owner) tile.owner.money++;
					}else if(this.turn % 5 === 0){
						if(tile.owner) tile.owner.money++;
					}
					
				}
			}
			
			//Update turn count
			this.turn++;
			
			//Send it to the users
			this.transmitMap();
		}
		
		//Networking
		//Transmit the map
		this.transmitMap = function(){
			
			//Less crappy networking
			//Secure
			//But not bandwidth efficient yet
			for(var i = 0, player; i < this.gameRoom.players.length; i++){
				
				//Grab the player
				player = this.gameRoom.players[i];
				
				//Transmit
				this.transmitMapTo(player);
				
			}
			
		}
		
		//Transmit a tailored map to a player
		this.transmitMapTo = function(player){
			
			//Send map data tailored to the player's tile positions
			//Also send turn and player's money
			this.gameRoom.io.to(player.id).emit(EVENT.MAP_UPDATE, {
				map: this.minifiedTailoredMapData(player),
				turn: this.turn,
				money: player.money
			});
			
		}
		
		this.indexes = this.gameRoom.getPlayerIndexes();
		
		//Get a version of the map that can be safely viewed by a certain player
		//Well, almost
		//The owner for each tile is clear and easy to access, which is dangerous because that contains an array of their castle's positions
		//Returns an altered version of the this.data array
		this.tailoredMapData = function(player){
			
			//Empty array, a blank this.data
			//Every tile that should be seen will be overriden
			var data = new Array(this.data.length);
			
			for(var i = 0, tile, j, petal; i < this.data.length; i++){
				
				tile = this.data[i];
				
				//If the tile is owned by the player, make it and the flower around it viewable
				if(tile.owner === player){
					data[i] = this.data[i];
					
					//Flower of 6 petals
					for(j = 0; j < 6; j++){
						
						petal = this.getTileNeighbour(i, j);
						
						data[petal] = this.data[petal];
						
					}
					
				}
				
			}
			
			//Return the finalised array
			return data;
		}
		
		//Essentially minifies tailored map data
		//Also replaces the owner of each tile with their ID, making it safe to transmit
		this.minifiedTailoredMapData = function(player){
			
			//Grab tailored map data
			var arr = this.tailoredMapData(player),
				data = [];
			
			//Loop through it and only keep actual data
			//Keep track of positions by adding an i (index) property
			//Tiles are stored as strings following a specific format to save memory
			for(var i = 0, tile; i < arr.length; i++){
				if(arr[i]){
					
					tile = arr[i].troops + ' ' + arr[i].type;
					
					//Add the index property
					tile += ' ' + i;
					
					//Replace owner with their index ID
					if(arr[i].owner)
						tile += ' ' + this.indexes.indexOf(arr[i].owner.id);
					
					//Add it
					data.push(tile);
					
				}
			}
			
			return data;
			
		}
		
		//Get a version of a player's data that can be safely viewed by players
		this.tailoredPlayerData = function(player){
			return {
				id: player.id,
				name: player.name,
				money: player.money,
				color: player.color
			}
		}
		
		//Get a version of this.gameRoom.players that is safe for players to see
		this.tailoredPlayerArray = function(){
			
			//Empty array
			var players = [];
			
			//Populate it with tailored player data
			for(var i = 0; i < this.gameRoom.players.length; i++){
				players.push(this.tailoredPlayerData(this.gameRoom.players[i]));
			}
			
			return players;
			
		}
		
		//Triggered when a player wants to move their troops to another tile
		//Given a player and an object d containing origin and endpoint properties, integers, indicating the tile indexes for the origin and endpoint of the movement
		this.moveTroops = function(player, d){
			
			//Make sure the tiles exist first
			//And make sure they are neighbours - One tile at a time, hackers!
			if(
				!this.tileExists(d.origin) || !this.tileExists(d.endpoint) ||
				!this.tilesAreNeighbours(d.origin, d.endpoint)
			){
				return false;
			}
			
			var origin = this.data[d.origin],
				endpoint = this.data[d.endpoint];
			
			//If the player owns the tile the troops would be coming from, move the troops
			if(origin.owner && origin.owner.id === player.id){
				
				//A player shouldn't kill their own troops
				//But they should kill other troops
				if(endpoint.owner && origin.owner.id === endpoint.owner.id){
					
					//Simply transfer troops from one tile to the other
					endpoint.troops += origin.troops - 1;
					
				}else{
					endpoint.troops -= origin.troops - 1;
					
					//If the tile has been captured, transfer ownership
					if(endpoint.troops < 0){
						endpoint.troops *= -1;
						
						//If a castle has been captured, check to see if that was the player's last castle
						if(endpoint.type === TYPES.CASTLE){
							endpoint.owner.castles.splice(endpoint.owner.castles.indexOf(d.endpoint), 1);
							
							//If that was their last castle, they lose
							if(endpoint.owner.castles.length === 0){
								this.playerCaptured(player, endpoint.owner);
							}
						}
						
						endpoint.owner = player;
					
						//Downgrading
						if(endpoint.type === TYPES.CASTLE)
							endpoint.type = TYPES.FORT;
					}
				}
				
				//Always at the end of a movement the amount of troops on the first tile will be 1, the least possible to own a tile (0 is possible but buggy)
				origin.troops = 1;
			}
		}
		
		//Check if two tiles are neighbours
		//Used in this.moveTroops to make sure the player isn't trying to hack the game and move troops more than one tile at a time
		//Return boolean, of course
		this.tilesAreNeighbours = function(a, b){
			
			//6 rotations
			for(var i = 0; i < 6; i++){
				if(this.getTileNeighbour(a, i) === b)
					return true;
			}
			
			//If the tiles do not border on any of their six sides, they aren't neighbours
			return false;
		}
		
		//Triggered when a player captures another player
		//Two params, the capturer and the captured
		//Remember the order!
		this.playerCaptured = function(capturer, captured){
			
			//Grab their socket
			var capturedSocket = this.gameRoom.io.sockets.connected[captured.id];
			
			//Hand over all of the the captured player's tiles to the capturer
			for(var i = 0, tile; i < this.data.length; i++){
				tile = this.data[i];
				
				if(tile.owner === captured)
					tile.owner = capturer;
			}
			
			//Assuming the player is actually online, we send data
			if(capturedSocket){
				
				//Prematurely send the captured player a map update to show them the map after they lost
				//This will be blank, of course, for their tiles are no longer theirs
				this.transmitMapTo(captured);
				
				//Alert the captured player of their loss
				this.gameRoom.io.to(captured.id).emit(EVENT.PLAYER_CAPTURED, this.tailoredPlayerData(capturer));
				
				//Remove player from the game room
				this.gameRoom.removePlayer(captured);
				
				//Alert all other players of captured's demise
				//MWAH HA HAAAAA
				capturedSocket.to(this.gameRoom.id).emit(EVENT.PLAYER_UPDATE, this.tailoredPlayerArray());
				
				//Check if the game has been won
				this.gameRoom.checkForWin(capturer);
				
				//Leave game room, stop receiving updates
				capturedSocket.leave(this.gameRoom.id);
				
				//Change their game ID and status
				captured.factoryReset();
			}
			
			
		}
		
		//Triggered when a player wants to build something on a tile
		//Or demolish something
		//Entirely up to them
		this.upgradeTile = function(player, d){
			
			//Ensure the tile exists
			if(!this.tileExists(d.i)) return false;
			
			//Ensure the player owns the tile
			if(this.data[d.i].owner !== player) return false;
			
			//Building stuff on empty ground
			if(this.data[d.i].type === TYPES.EMPTY){
				
				//Build a farm
				if(d.u === TYPES.FARM && player.money >= COST.FARM){
					this.data[d.i].type = TYPES.FARM;
					player.money -= COST.FARM;
				}
				
				//Build a barracks
				if(d.u === TYPES.BARRACKS && player.money >= COST.BARRACKS){
					this.data[d.i].type = TYPES.BARRACKS;
					player.money -= COST.BARRACKS;
				}
				
				//Build a fort
				if(d.u === TYPES.FORT && player.money >= COST.FORT){
					this.data[d.i].type = TYPES.FORT;
					player.money -= COST.FORT;
				}
				
			}
			
			//Upgrade fort to castle
			if(this.data[d.i].type === TYPES.FORT && d.u === TYPES.CASTLE && player.money >= COST.CASTLE){
				this.data[d.i].type = TYPES.CASTLE;
				player.castles.push(d.i);
				player.money -= COST.CASTLE;
			}
			
			//If the tile isn't empty and they want it to be, I don't see why not...
			if(this.data[d.i].type !== TYPES.EMPTY && d.u === TYPES.EMPTY){
				
				//WTF is wrong with you...
				//You're demolishing a CASTLE of all things?
				//I suppose some people don't strive to win
				//Or, you know, have fun
				//...
				//Sorry, but you really can't demolish a castle
				//I can't be bothered programming the check for loss in
				if(this.data[d.i].type !== TYPES.CASTLE){
					this.data[d.i].type = TYPES.EMPTY;
				}
				
			}
			
		}
		
		this.timerInterval = setInterval(this.updateTiles.bind(this), this.turnLength * 1000);
		
		//Initialisation
		
		this.generate();
		
		this.addPlayersToMap();
		
		//Init map dump
		this.initMapDump = function(){
			
			for(var i = 0, player; i < this.gameRoom.players.length; i++){
				
				//Grab the player
				player = this.gameRoom.players[i];
				
				//Send map data tailored to the player's tile positions
				this.gameRoom.io.to(player.id).emit(EVENT.MAP_INITIALISATION, {
					map: this.minifiedTailoredMapData(player),
					w: this.mapWidth,
					h: this.mapHeight,
					turn: this.turn,
					indexes: this.indexes
				});
				
			}
			
		}
		
		this.initMapDump();
	}
})();