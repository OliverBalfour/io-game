
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
					type: TYPES.EMPTY,
					changed: false,
					changedOwnershipFrom: null
				});
			}
		}
		
		//Add starting castles, one per player, to the map
		//If the amount of players isn't enough for the map, this'll go into an infinite loop
		//Players spawn at least 5 tiles away from each other
		this.addPlayersToMap = function(){
			for(var i = 0, player, j; i < this.gameRoom.players.length; i++){
				player = this.gameRoom.players[i];
				
				//Get a random empty tile with no players within five hexagons
				var that = this,
					tile = this.getEmptyTile(5, function(i){ return !that.data[i].owner; });
				
				this.data[tile].owner = player;
				this.data[tile].troops = 1;
				this.data[tile].type = TYPES.CASTLE;
				
				player.castles = [tile];
			}
		}
		
		//Get a random empty tile
		//Returns the index
		//Takes an optional parameter, indicating the radius in which the tiles around it must also be empty (radius meaning number of hexagonal rings)
		//If the optional parameter is given, another parameter, a function, has to be given
		//This function is passed a tile index as a parameter and should return a boolean indicating whether it is indeed 'empty' in the way intended
		this.getEmptyTile = function(r, isEmpty){
			
			//Array for all tiles which are empty and have r || 0 hexagonal rings, when passed into a secondary parameter, a function, for every tile, is true
			var empty = [];
			
			//If we need to check for
			if(r && isEmpty){
				
				//Array for all tiles which the second parameter function, isEmpty, fails
				var notEmpty = [];
				
				//Populate notEmpty
				for(var i = 0; i < this.data.length; i++){
					if(!isEmpty(i)) notEmpty.push(i);
				}
				
			}
			
			for(var i = 0; i < this.data.length; i++){
				
				if(this.data[i].type === TYPES.EMPTY && !this.data[i].owner){
					
					if(r){
						
						var invalid = false;
						
						//Loop through not empty tiles and check each one to see if it is in the radius
						for(var j = 0, ta = this.getTilePosition(i), tb; j < notEmpty.length; j++){
							tb = this.getTilePosition(notEmpty[j]);
							
							//Ahhh fuck it
							//Just a simple, incorrect, inaccurate hypotenuse distance check
							//Haven't even bothered to treat as hexes, these act as squares
							//This is not even slightly accurate
							//But it should do an ok job
							
							//If the tile is probably in the radius, say it is
							if(Math.hypot(ta.x - tb.x, ta.y - tb.y) < r){
								invalid = true;
								break;
							}
						}
						
						//Goddamnit, if it's valid add it
						if(!invalid){
							empty.push(i);
						}
						
						//This code took too long to write to want to waste
						//It's ridiculously overcomplicated though
						/*
						
						var invalid = false;
						
						//The number of tiles in all rings surrounding the central tile
						//Equal to (rings + 1) * 6 * rings * 0.5
						//Essentially Gauss's adding numbers 1-100 by multiplying 100+1 by 100 and halving, but altered slightly (*0.5 being halving)
						var numTiles = ( (r + 1) * 6 ) * r * 0.5;
						
						for(var j = 0; j < r; j++){
							
							//Gets filled with the corner indexes for the six corners of the hex ring
							//Follows the ordering of sides with this.getTileNeighbour, assuming sides are replaced by their most anticlockwise tiles, or leftmost corners
							var corners = [];
							
							for(var corner = 0, path; corner < 6; corner++){
								
								//Reset variable tracking position of corner
								path = i;
								
								//For this corner, we go out in the direction of the corner the number of times there are rings
								//Each iteration is a step in the direction of the corner
								//If the corner tile does not exist, we forget about that entire side revolving around it
								//And revert to the closest side that actually exists (should not cause any noticeable problems, except in really extreme cases)
								
								for(var dist = 0, p; dist <= j; dist++){
									
									p = this.getTileNeighbour(path, corner);
									
									if(p)
										path = p;
									else
										break;
									
								}
								
								//We have the corner's index, hopefully, so we can add it
								corners.push(path);
								
							}
							
							for(var t = 0, ringSide, ringSideIndex; t < (j + 1) * 6; t++){
								
								//Corner index and side of the ring
								ringSide = Math.floor(t / 6);
								
								//Position along the ring side starting at the corner
								ringSideIndex = t % 6;
								
								for(var )
								
							}
							
						}
						
						if(!invalid)
							empty.push(i);
						
						*/
						
					}else{
						if(this.tileIsEmpty(i)) empty.push(i);
					}
					
				}
				
			}
			
			//Return a random tile from the possible tiles
			return empty[Math.floor(Math.random() * empty.length)];
			
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
		
		//Get the x, y position of a tile on the grid given its index
		this.getTilePosition = function(i){
			
			return {
				x: i % this.mapWidth,
				y: Math.floor(i / this.mapWidth)
			}
			
		}
		
		//Neighbour not neighbor American noobs
		//But yes, I use color consistently instead of colour
		//This is because I'm used to it
		//Neighbor I dislike though
		//Takes a tile id and returns the tile's neighbour's id at rotation rotation
		//Rotation starts at 0 being directly above and then increments as it goes clockwise:
		
		//     0
		// 5       1
		//
		// 4       2
		//     3
		
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
						tile.owner.troops++;
						tile.owner.money += 10;
					}
					
					if(tile.type === TYPES.BARRACKS && this.turn % 2 === 0){
						tile.troops++;
						tile.owner.troops++;
					}
					
					if(tile.type === TYPES.FARM){
						tile.owner.money += 10;
					}
					
					if(tile.type === TYPES.EMPTY && this.turn % 25 === 0){
						tile.troops++;
						tile.owner.troops++;
						tile.owner.money++;
					}else if(this.turn % 5 === 0){
						tile.owner.money++;
					}
					
				}
			}
			
			//Update turn count
			this.turn++;
			
			//Send it to the users
			this.transmitMap(true);
			
			//Go through all of the players and reset their moved variable
			for(var i = 0; i < this.gameRoom.players.length; i++){
				this.gameRoom.players[i].moved = false;
			}
			
			//Go through all of the tiles and reset their changedOwnershipFrom variable
			for(var i = 0; i < this.data.length; i++){
				this.data[i].changedOwnershipFrom = null;
			}
			
			//Update all of the players last activity checks
			this.gameRoom.updateInactivity();
			
			//Check all players to see if they are inactive
			this.gameRoom.checkInactivity();
			
		}
		
		//Networking
		//Transmit the map
		//If changed is true, only send tiles that have changed unpredictably (not according to code; ie a player moving troops)
		this.transmitMap = function(changed){
			
			//Less crappy networking
			//Secure
			//But not bandwidth efficient yet
			for(var i = 0, player; i < this.gameRoom.players.length; i++){
				
				//Grab the player
				player = this.gameRoom.players[i];
				
				//Transmit
				this.transmitMapTo(player, changed);
				
			}
			
			//Reset all of the 'changed' attributes of tiles
			for(var i = 0; i < this.data.length; i++){
				this.data[i].changed = false;
			}
			
		}
		
		//Transmit a tailored map to a player
		//The changed parameter is as in this.transmitMap
		this.transmitMapTo = function(player, changed){
			
			//Send map data tailored to the player's tile positions
			//Also send turn and player's money
			this.gameRoom.io.to(player.id).emit(EVENT.MAP_UPDATE, {
				map: this.minifiedTailoredMapData(player, changed),
				turn: this.turn,
				money: player.money,
				players: this.leaderboardStatsUpdate()
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
		//The changed parameter is as in this.transmitMap
		this.minifiedTailoredMapData = function(player, changed){
			
			//Grab tailored map data
			var arr = this.tailoredMapData(player),
				data = [];
			
			//Loop through it and only keep actual data
			//Keep track of positions by adding an i (index) property
			//Also, only add tiles if they have been changed in an unpredictable manner should changed === true
			for(var i = 0; i < arr.length; i++){
				
				if(arr[i] && (changed && arr[i].changed || !changed)){
					
					//Add it
					data.push(this.minifiedTileData(arr[i], i));
					
				}
				
			}
			
			//If a tile shares no border with any other tile of the same owner, upon capture, it will not update properly
			//As such, whenever a tile changes hands, its original owner is alerted here, by being given an unknown tile
			//They are only served an unknown tile if none of the bordering tiles are owned by the captured tile's original owner
			for(var i = 0, valid; i < this.data.length; i++){
				if(this.data[i].changedOwnershipFrom === player){
					
					valid = true;
					
					for(var j = 0; j < 6; j++){
						
						if(this.getTileNeighbour(i, j) !== false && this.data[this.getTileNeighbour(i, j)].owner === player){
							valid = false;
						}
						
					}
					
					if(valid)
						data.push(this.minifiedTileData(CONSTANTS.UNKNOWN_TILE, i));
					
				}
			}
			
			return data;
			
		}
		
		//Get a minified version of a tile object
		//Tiles are sent as strings following a specific format to save bandwidth
		this.minifiedTileData = function(tile, i){
			
			var ntile = tile.troops + ' ' + tile.type;
			
			//Add the index property
			ntile += ' ' + i;
			
			//Replace owner with their index ID
			if(tile.owner)
				ntile += ' ' + this.indexes.indexOf(tile.owner.id);
			
			return ntile;
			
		}
		
		//Get a version of a player's data that can be safely viewed by players
		this.tailoredPlayerData = function(player){
			return {
				id: player.id,
				name: player.name,
				money: player.money,
				land: player.land,
				troops: player.troops,
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
		
		//Get a version of this.gameRoom.players that only shows stats visible in the leaderboard
		this.leaderboardStatsUpdate = function(){
			
			var stats = [];
			
			for(var i = 0, p; i < this.gameRoom.players.length; i++){
				
				p = this.gameRoom.players[i];
				
				//Damn you, floats
				p.troops = parseInt(p.troops);
				
				stats.push(p.money + ' ' + p.land + ' ' + p.troops);
				
			}
			
			return stats;
			
		}
		
		//Triggered when a player wants to move their troops to another tile
		//Given a player and an object d containing origin and endpoint properties, integers, indicating the tile indexes for the origin and endpoint of the movement
		this.moveTroops = function(player, d){
			
			//Check to make sure that the player hasn't already moved
			if(player.moved)
				return false;
			
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
			
			//Make sure the tile isn't a mountain
			if(endpoint.type === TYPES.MOUNTAIN)
				return false;
			
			//Indicate that the tiles have been changed, and need to be transmitted
			origin.changed = endpoint.changed = true;
			
			//The player has made their move, yes?
			player.moved = true;
			player.lastActivity = 0;
			
			//For the sake of fog of war, all of the tiles around the endpoint get flagged changed too, because if they aren't, the player won't see them
			//Veeeery hacky but it works xD
			for(var r = 0, t; r < 6; r++){
				
				t = this.getTileNeighbour(d.endpoint, r);
				
				//t could be 0, so no if(t){ ... }
				if(t !== false){
					this.data[t].changed = true;
				}
				
			}
			
			//If the player owns the tile the troops would be coming from, move the troops
			if(origin.owner && origin.owner.id === player.id){
				
				//A player shouldn't kill their own troops
				//But they should kill other troops
				if(endpoint.owner && origin.owner.id === endpoint.owner.id){
					
					//Simply transfer troops from one tile to the other
					endpoint.troops += origin.troops - 1;
					
				}else{
					
					//Ensure defence multipliers are used
					var mult = CONSTANTS.MULTIPLIERS[endpoint.type];
					
					var def = Math.round( endpoint.troops * (1 + mult) ) - (origin.troops - 1);
					if(def < 0){
						if(endpoint.owner) endpoint.owner.troops -= endpoint.troops;
						endpoint.troops = def;
						//Set the attacker's troop count
						player.troops -= origin.troops - 1 + def;
					}else{
						endpoint.troops -= Math.round((origin.troops - 1) * (1 - mult));
						if(endpoint.owner) endpoint.owner.troops -= (origin.troops - 1) * (1 - mult);
					}
					
					//If the tile has been captured, transfer ownership
					if(endpoint.troops < 0){
						endpoint.troops *= -1;
						
						//Update the previous owner's land count
						if(endpoint.owner){
							endpoint.owner.land--;
						}
						
						//Update the new owner's land count
						player.land++;
						
						//If a castle has been captured, check to see if that was the player's last castle
						if(endpoint.type === TYPES.CASTLE && endpoint.owner){
							endpoint.owner.castles.splice(endpoint.owner.castles.indexOf(d.endpoint), 1);
							
							//If that was their last castle, they lose
							if(endpoint.owner.castles.length === 0){
								this.playerCaptured(player, endpoint.owner);
							}
						}
						
						//Actually transfer it
						endpoint.changedOwnershipFrom = endpoint.owner;
						endpoint.owner = player;
					}
				}
				
				//Always at the end of a movement the amount of troops on the first tile will be 1, the least possible to own a tile (0 is possible but as a result of an attack only)
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
			
			//Grab their socket, if they have one
			var capturedSocket = this.gameRoom.io.sockets.connected[captured.id];
			
			//Hand over all of the the captured player's tiles to the capturer
			for(var i = 0, tile; i < this.data.length; i++){
				tile = this.data[i];
				
				if(tile.owner === captured)
					tile.owner = capturer;
				
				//It has changed ownership after all
				tile.changed = true;
			}
			
			//Update the land leaderboard stat
			capturer.land += captured.land;
			
			//Assuming the player is actually online (or isn't an AI), we send data
			if(capturedSocket){
				
				this.gameRoom.sendServerMessage(captured.name + ' was captured by ' + capturer.name);
				
				//Prematurely send the captured player a map update to show them the map after they lost
				//This will be blank, of course, for their tiles are no longer theirs
				this.transmitMapTo(captured, true);
				
				//Alert the captured player of their loss
				this.gameRoom.io.to(captured.id).emit(EVENT.PLAYER_CAPTURED, this.tailoredPlayerData(capturer));
				
				//Leave game room, stop receiving updates
				capturedSocket.leave(this.gameRoom.id);
				
			}
			
			//Remove player from the game room
			this.gameRoom.removePlayer(captured);
			
			//Alert all other players of captured's demise
			//MWAH HA HAAAAA
			if(capturedSocket)
				capturedSocket.to(this.gameRoom.id).emit(EVENT.PLAYER_UPDATE, this.tailoredPlayerArray());
			else
				this.gameRoom.io.to(this.gameRoom.id).emit(EVENT.PLAYER_UPDATE, this.tailoredPlayerArray());
			
			//Check if the game has been won
			this.gameRoom.checkForWin(capturer);
			
			//Change their game ID and status
			captured.factoryReset();
			
		}
		
		//Triggered when a player wants to build something on a tile
		//Or demolish something
		//Entirely up to them
		this.upgradeTile = function(player, d){
			
			//Ensure the tile exists
			if(!this.tileExists(d.i)) return false;
			
			//Ensure the player owns the tile
			if(this.data[d.i].owner !== player) return false;
			
			//Indicate that the tile has been changed and needs to be transmitted
			this.data[d.i].changed = true;
			
			//Indicate that the player has moved
			this.data[d.i].lastActivity = 0;
			
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
					map: this.minifiedTailoredMapData(player, false),
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