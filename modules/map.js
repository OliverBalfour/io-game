
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
			return i > 0 && i < this.data.length;
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
				if(tile.owner !== null){
					
					if(tile.type === TYPES.CASTLE || tile.type === TYPES.FORT)
						tile.troops++;
					
					if(tile.type === TYPES.EMPTY && this.turn % 25 === 0)
						tile.troops++;
					
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
			
			//Crappy networking
			//Transmits everything
			//Bandwidth inefficient and transmits data the user shouldn't see
			//But it works
			//For now
			this.gameRoom.io.to(this.gameRoom.id).emit(EVENT.MAP_UPDATE, {
				map: this.data,
				turn: this.turn
			});
			
		}
		
		//Triggered when a player wants to move their troops to another tile
		//Given a player and an object d containing origin and endpoint properties, integers, indicating the tile indexes for the origin and endpoint of the movement
		this.moveTroops = function(player, d){
			
			//Make sure the tiles exist first
			if(!this.tileExists(d.origin) || !this.tileExists(d.endpoint)) return false;
			
			var origin = this.data[d.origin],
				endpoint = this.data[d.endpoint];
			
			//If the player owns the tile the troops would be coming from, move the troops
			if(origin.owner && origin.owner.id === player.id){
				
				//A player shouldn't kill their own troops
				//But they should kill other troops
				if(endpoint.owner && origin.owner.id === endpoint.owner.id){
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
					}
					
					//Downgrading
					if(endpoint.type === TYPES.CASTLE)
						endpoint.type = TYPES.FORT;
				}
				
				origin.troops = 1;
			}
		}
		
		//Triggered when a player captures another player
		//Two params, the capturer and the captured
		//Remember the order!
		this.playerCaptured = function(capturer, captured){
			
			var capturedSocket = this.gameRoom.io.sockets.connected[captured.id];
			
			//Alert the captured player of their loss
			this.gameRoom.io.to(captured.id).emit(EVENT.PLAYER_CAPTURED, capturer);
			
			//Hand over all of the the captured player's tiles to the capturer
			for(var i = 0, tile; i < this.data.length; i++){
				tile = this.data[i];
				
				if(tile.owner === captured)
					tile.owner = capturer;
			}
			
			//Remove player from the game room
			this.gameRoom.removePlayer(captured);
			
			//Alert all other players of captured's demise
			//MWAH HA HAAAAA
			capturedSocket.broadcast.emit(EVENT.PLAYER_UPDATE, this.gameRoom.players);
			
			//If there is only one player left, let them know they've won
			//The only player left is definitely the capturer
			if(this.gameRoom.players.length === 1){
				
				//Update the game prematurely to show the winner and loser the final map
				this.transmitMap();
				
				//Let them know
				this.gameRoom.io.to(capturer.id).emit(EVENT.GAME_WON, null);
				
				//Stop updating game if it's finished
				clearInterval(this.timerInterval);
				
				//Finish the game
				this.gameRoom.endGame();
			}
			
			//Leave game room, stop receiving updates
			capturedSocket.leave(this.gameRoom.id);
			
			//Change their game ID and status
			captured.factoryReset();
			
		}
		
		this.timerInterval = setInterval(this.updateTiles.bind(this), this.turnLength * 1000);
		
		//Initialisation
		
		this.generate();
		
		this.addPlayersToMap();
		
		//Init map dump
		this.gameRoom.io.to(this.gameRoom.id).emit(EVENT.MAP_INITIALISATION, {
			w: this.mapWidth,
			h: this.mapHeight,
			data: this.data
		});
	}
})();