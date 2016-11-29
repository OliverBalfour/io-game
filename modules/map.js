
//Map class

//Map for the server end, contains all of the map data and controls networking necessary data to the client

//Shares many of the functions of the client side map, but has procedural generation, networking, and actual game logic involved
//It is able to be given various procedural generation functions that are bound to the map on execution (ie generationFunction.bind(this) )
//Currently it only takes width and height in tiles, the game room it is in and the generation function
//Networking is handled through this.gameRoom.io

(function(){
	
	module.exports = function(w, h, gameRoom, generationFunction){
		
		//Tile type enumeration
		var TYPES = {
			EMPTY: 0,
			CASTLE: 1,
			FORT: 2,
			FARM: 3,
			BARRACKS: 4
		}
		
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
		
		this.turn = 0;
		//Seconds
		this.turnLength = 1;
		
		//Update tiles
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
			
			//Shitty networking bruh!
			//Transmits everything
			//Bandwidth inefficient and transmits data the user shouldn't see
			//But it works
			this.gameRoom.io.to(this.gameRoom.id).emit('g', this.data);
		}
		
		this.timerInterval = setInterval(this.updateTiles.bind(this), this.turnLength * 1000);
		
		//Initialisation
		
		this.generate();
		
		this.addPlayersToMap();
		
		//Init map dump
		this.gameRoom.io.to(this.gameRoom.id).emit('m', {
			w: this.mapWidth,
			h: this.mapHeight,
			data: this.data
		});
	}
})();