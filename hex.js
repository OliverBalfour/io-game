
//Map class (client)

//The map class contains all of the interface code, drawing code, prediction code
//Also has networking sorted

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

function Map(socket, w, h, side, canvas, playerID, playerData){
	
	//Networking
	this.socket = socket;
	this.playerID = playerID;
	
	//The data for the map is all stored in one big array
	this.data = [];
	
	//Client data
	//Mostly event handling
	this.client = {
		
		//Object containing mouse data
		mouse: {
			//Mouse down
			down: false,
			
			//Position
			x: 0,
			y: 0,
			
			//If mouse is down, position when mouse went down
			startX: 0,
			startY: 0,
			
			//Offset, for map dragging
			offsetX: 0,
			offsetY: 0
		},
		
		//Array to be populated with booleans, where if this.client.keys[KEYCODE] is true, key with code KEYCODE is down, otherwise it is up (undefined also counts as up)
		keys: []
	};
	
	//Position of map
	this.x = 0;
	this.y = 0;
	
	this.playerData = playerData;
	
	this.generate = function(){
		//Populating that array with empty tile objects
		this.data = [];
		
		for(var i = 0; i < this.mapWidth * this.mapHeight; i++){
			this.data.push({
				owner: null,
				troops: 0,
				type: TYPES.UNKNOWN
			});
		}
	}
	
	//Setting simple map constants
	this.mapWidth = w;
	this.mapHeight = h;
	this.tileSideLength = side;
	
	//Calculating more complex map constants
	this.tileWidth = this.tileSideLength * 2;
	this.tileHeight = this.tileSideLength * Math.sqrt(3);
	this.xMultiplier = 1.5 * this.tileSideLength;
	
	//The canvas that the map is drawn to
	this.canvas = canvas;
	this.ctx = canvas.getContext('2d');
	
	//The canvas that the map is saved to, the grid canvas
	this.gridcanvas = document.createElement('canvas');
	this.gridctx = this.gridcanvas.getContext('2d');
	this.gridcanvas.width = this.xMultiplier * this.mapWidth + this.tileSideLength / 2;
	this.gridcanvas.height = this.tileHeight * this.mapHeight + this.tileHeight / 2 + 4;
	
	//Draw the map to the grid canvas
	this.prepareMap = function(){
		//Set up context
		this.ctx.font = '14px sans-serif';
		this.gridctx.font = '14px sans-serif';
		this.gridctx.clearRect(0, 0, this.gridcanvas.width, this.gridcanvas.height);
		
		//Render every last tile to the grid canvas
		for(var i = 0; i < this.data.length; i++){
			
			d = this.getTileData(i);
			
			this.drawHex(d.x, d.y, i, this.gridctx);
		}
		
		//No flickering thanks
		this.drawSelection();
	}
	
	//Draw the map from the grid canvas to the canvas
	this.draw = function(){
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.ctx.drawImage(this.gridcanvas, this.x, this.y);
	}
	
	//Draw the map to the grid canvas and then draw the grid canvas to the canvas
	this.prepareAndDrawMap = function(){
		this.prepareMap();
		this.draw();
	}
	
	//Get tile x, y coords (top left corner in bounding box of flat topped hexagon)
	//Given the index in the data array
	//Extracts the position on the grid, then formulates the final position for it and returns it
	this.getTileData = function(i){
		//Tile data
		var tile = this.data[i];
		
		//Positions on grid
		var xArr = i % this.mapWidth,
			yArr = Math.floor(i / this.mapWidth);
		
		//Coords for top left corner for a hexagon's bounding box
		var x = this.xMultiplier * xArr,
			y = this.tileHeight * yArr;
		
		//Tiles aren't on the same y level in the same row for a hex grid
		if(xArr % 2 === 1) y += this.tileHeight / 2;
		
		return {x: x, y: y};
	}
	
	//Draw a hexagon (i, index in this.data) and anything in it to a canvas given at x, y (the canvas is provided so that it can be drawn to either the grid or rendering canvas)
	this.drawHex = function(x, y, i, ctx){
		//Tile data
		var tile = this.data[i];
		
		//Draw hexagon
		
		//Tile color
		ctx.fillStyle = tile.owner ? getPlayer(tile.owner).color : 'lightgrey';
		
		if(tile.type === TYPES.UNKNOWN) ctx.fillStyle = '#777';
		
		//Hexagon path
		
		ctx.beginPath();
		
		ctx.moveTo(x + this.tileSideLength / 2, y);
		ctx.lineTo(x + this.xMultiplier, y);
		ctx.lineTo(x + this.tileSideLength * 2, y + this.tileHeight / 2);
		ctx.lineTo(x + this.xMultiplier, y + this.tileHeight);
		ctx.lineTo(x + this.tileSideLength / 2, y + this.tileHeight);
		ctx.lineTo(x, y + this.tileHeight / 2);
		ctx.lineTo(x + this.tileSideLength / 2, y);
		
		ctx.fill();
		ctx.stroke();
		
		//If the tile type is not unknown or empty, draw the appropriate icon
		if(tile.type !== TYPES.EMPTY && tile.type !== TYPES.UNKNOWN){
			
			//Grab the appropriate icon
			var icon = this.getIcon(tile.type);
			
			//Draw it
			ctx.drawImage(icon, x + this.tileWidth / 6, y + this.tileHeight / 10, this.tileWidth / 1.5, this.tileWidth / 1.5);
			
		}
		
		//Write troop number in the middle of the hexagon if there are any troops
		if(tile.troops > 0){
			ctx.fillStyle = 'white';
			ctx.font = '14px arial';
			
			ctx.fillText(
				tile.troops,
				x + this.tileSideLength - ctx.measureText(tile.troops).width / 2,
				y + this.tileHeight / 2 + 4
			);
		}
	}
	
	//Redraw a hex to both the grid and rendering canvas (so as to not require the entire map to be redrawn)
	this.redrawHex = function(i){
		//Get the hex position
		var d = this.getTileData(i);
		
		//Draw the hex to the grid canvas
		this.drawHex(d.x, d.y, i, this.gridctx);
		
		//Render the hex simultaneously
		this.drawHex(d.x + this.x, d.y + this.y, i, this.ctx);
	}
	
	//The currently selected tile's index
	//-1 if no tile is selected
	this.selectedTile = -1;
	
	//Triggered when the client clicks on a tile, given the tile index in this.data
	//Also optionally takes the previous tile as a secondary parameter, to ensure that they are a tile apart (to avoid accidental screen wrap)
	this.selectHex = function(i, oldI){
		
		//If i isn't valid (if it doesn't exist) then abort
		if(typeof i !== 'number') return false;
		
		//Get the hex position
		var d = this.getTileData(i);
		
		//If the user is clicking on the currently selected tile, we deselect it
		//Otherwise, we select the new tile and deselect the old one
		if(i === this.selectedTile){
			
			//Redraw tile
			this.drawHexFlower(0, 0, this.selectedTile, this.gridctx, this.drawHex);
			this.drawHexFlower(this.x, this.y, this.selectedTile, this.ctx, this.drawHex);
			
			//Deselect
			this.selectedTile = -1;
			
			this.updateActionBar();
			
		}else{
			
			//Validate the new tile to select
			
			if(i < 0 || i >= this.data.length) return false;
			
			if(oldI){
				if(
					oldI % this.mapWidth === this.mapWidth - 1 && i    % this.mapWidth === 0 ||
					i    % this.mapWidth === this.mapWidth - 1 && oldI % this.mapWidth === 0
				){
					return false;
				}
			}
			
			//To clear us of the currently selected tile, we redraw a flower of hexes around the selected tile
			if(this.selectedTile !== -1){
				this.drawHexFlower(0, 0, this.selectedTile, this.gridctx, this.drawHex);
				this.drawHexFlower(this.x, this.y, this.selectedTile, this.ctx, this.drawHex);
			}
			
			//Select
			this.selectedTile = i;
			
			this.updateActionBar();
			
			this.drawSelection();
			
		}
	}
	
	this.drawSelection = function(){
		var d = this.getTileData(this.selectedTile);
		
		//When drawing selected tile hex flowers, we draw a hex flower and then highlight the middle tile even more
		
		//Draw the hex to the grid canvas
		this.drawHexFlower(0, 0, this.selectedTile, this.gridctx, this.highlightHex);
		this.highlightHex(d.x, d.y, this.selectedTile, this.gridctx);
		
		//Render the hex simultaneously
		this.drawHexFlower(this.x, this.y, this.selectedTile, this.ctx, this.highlightHex);
		this.highlightHex(d.x + this.x, d.y + this.y, this.selectedTile, this.ctx);
	}
	
	//Draws over a hex, but highlighted
	//Same params as this.drawHex, but with highlight color as well
	this.highlightHex = function(x, y, i, ctx, color){
		
		//Tile color
		ctx.fillStyle = color || 'rgba(0, 0, 0, 0.2)';
		
		//Hexagon path
		
		ctx.beginPath();
		
		ctx.moveTo(x + this.tileSideLength / 2, y);
		ctx.lineTo(x + this.xMultiplier, y);
		ctx.lineTo(x + this.tileSideLength * 2, y + this.tileHeight / 2);
		ctx.lineTo(x + this.xMultiplier, y + this.tileHeight);
		ctx.lineTo(x + this.tileSideLength / 2, y + this.tileHeight);
		ctx.lineTo(x, y + this.tileHeight / 2);
		ctx.lineTo(x + this.tileSideLength / 2, y);
		
		ctx.fill();
		ctx.stroke();
	}
	
	//Draws a hexagonal flower (a hex surrounded by six hexes) given the index of the center tile and a drawing function
	//The drawing function has to be either this.drawHex or this.highlightHex
	//Or any custom drawing function that takes the same parameters as this.drawHex
	//The parameters required for the drawing function are also required (x, y, ctx)
	//However, x and y are additive to the positions of each hexagon
	this.drawHexFlower = function(x, y, i, ctx, drawingFunction){
		
		var that = this;
		function extrapolateParamsAndDraw(j){
			
			var td = that.getTileData(j);
			
			//If the tile actually exists, draw it!
			if(typeof j === 'number'){
				drawingFunction.call(that, td.x + x, td.y + y, j, ctx);
			}
		}
		
		//Middle hex
		extrapolateParamsAndDraw(i);
		
		//Outer hexes
		extrapolateParamsAndDraw(that.getTileNeighbour.call(that, i, 0));
		extrapolateParamsAndDraw(that.getTileNeighbour.call(that, i, 1));
		extrapolateParamsAndDraw(that.getTileNeighbour.call(that, i, 2));
		extrapolateParamsAndDraw(that.getTileNeighbour.call(that, i, 3));
		extrapolateParamsAndDraw(that.getTileNeighbour.call(that, i, 4));
		extrapolateParamsAndDraw(that.getTileNeighbour.call(that, i, 5));
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
	
	//Given a point p with x and y coords relative to 0, 0 on the grid canvas, returns the index in this.data that the hex underneath is colliding with
	//Will return false if non existant
	//BE WARNED: Do not check if(this.hexUnderPoint(p)){ and use it here }
	//If the return is 0, the if statement will fail
	//Instead, if(... !== false)
	this.hexUnderPoint = function(p){
		var hex, hexes = [];
		for(var i = 0; i < this.data.length; i++){
			
			//Create a collidable object
			hex = this.getTileData(i);
			hex.w = this.tileWidth;
			hex.h = this.tileHeight;
			
			//If a rough bounding box collision succeeds, do a precise one
			if(this.pointCollision(hex, p)){
				
				//Each hex is given a dist(ance) indicating the distance between the centre of the hex and the point p
				//The idea is that the hex closest to the point is under it, because a hex grid functions as a voronoi diagram
				hexes.push({
					hex: hex,
					i: i,
					dist: Math.hypot(hex.x + map.tileWidth / 2 - p.x - this.x, hex.y + map.tileHeight / 2 - p.y - this.y)
				});
			}
		}
		
		//Sort all possible collisions by distance between centre and point p
		hexes.sort(function(a, b){
			return a.dist - b.dist;
		});
		
		//If there is a colliding hex, return its index in this.data
		//The closest hex to the point (and therefore the colliding one) is ranked first in the hexes array
		//The hexes array can only be up to 2 long though
		if(hexes.length > 0){
			return hexes[0].i;
		}
		
		//If there isn't a collision, return false
		return false;
	}
	
	//Rotation param the same as in this.getTileNeighbour, the direction in which the selection is to be moved
	//Used with the QWEASD keys
	this.moveSelection = function(rotation){
		
		//If the tile is owned by the player troops can be moved from it
		if(this.data[this.selectedTile].owner === this.playerID){
			
			//Move the troops
			this.moveTroops(this.selectedTile, this.getTileNeighbour(this.selectedTile, rotation));
			
		}
		
		//Select the new tile
		this.selectHex(this.getTileNeighbour(this.selectedTile, rotation), this.selectedTile);
	}
	
	//Returns true if the tile index specified is in the boundaries
	this.tileExists = function(i){
		return typeof i === 'number' && i >= 0 && i < this.data.length;
	}
	
	//Center the map about the given tile
	this.centerTile = function(i){
		if(!this.tileExists(i)) return false;
		
		var d = this.getTileData(i);
		
		this.x = Math.floor(-d.x + innerWidth / 2);
		this.y = Math.floor(-d.y + innerHeight / 2);
		
		this.handleMapBoundaries();
	}
	
	//Point colliding with a bounding box?
	//obj has x, y, w, h properties while point has x, y
	//Returns boolean; true if colliding
	this.pointCollision = function(obj, point){
		return (
			obj.x < point.x &&
			obj.x + obj.w > point.x &&
			obj.y < point.y &&
			obj.h + obj.y > point.y
		);
	}
	
	/* Map Networking */
	
	this.moveTroops = function(o, n){
		this.socket.emit(EVENT.MOVE_TROOPS, {
			origin: o,
			endpoint: n
		});
	}
	
	this.icons = {};
	
	this.loadIcon = function(name, file){
		this.icons[name] = new Image();
		this.icons[name].src = 'icons/' + file;
	}
	
	var icons = ['barn.png', 'castle.png', 'medieval-pavilion.png', 'peaks.png', 'stone-tower.png'],
		names = ['farm', 'castle', 'barracks', 'mountains', 'fort'];
	
	for(var i = 0; i < icons.length; i++){
		this.loadIcon(names[i], icons[i]);
	}
	
	this.typeMap = [null, 'castle', 'fort', 'farm', 'barracks'];
	
	this.getIcon = function(type){
		return this.icons[this.typeMap[type]];
	}
	
	//Map boundaries
	//The map is allowed to be a third off the screen
	this.handleMapBoundaries = function(){
		if(this.x > Math.floor(innerWidth / 3))
			this.x = Math.floor(innerWidth / 3);
		if(this.y > Math.floor(innerHeight / 3))
			this.y = Math.floor(innerHeight / 3);
		if(this.x < -this.gridcanvas.width + Math.floor(innerWidth / 3 * 2))
			this.x = -this.gridcanvas.width + Math.floor(innerWidth / 3 * 2);
		if(this.y < -this.gridcanvas.height + Math.floor(innerHeight / 3 * 2))
			this.y = -this.gridcanvas.height + Math.floor(innerHeight / 3 * 2);
	}
	
	/* User interactivity */
	
	//Uses the client
	//Updates the action bar, which shows what the currently selected tile can be upgraded into
	this.updateActionBar = function(){
		
		//Start with all of the buttons disabled
		dom.id('bd-demolisher').classList.add('disabled');
		dom.id('bd-barn').classList.add('disabled');
		dom.id('bd-barracks').classList.add('disabled');
		dom.id('bd-fort').classList.add('disabled');
		dom.id('bd-castle').classList.add('disabled');
		
		//If the player owns the tile, then the player may be able to build on it
		if(this.tileExists(this.selectedTile) && this.data[this.selectedTile].owner === this.playerID){
			
			//If types['TYPE'] is false, it cannot be built
			//Overidden below
			var types = {
				barn: false,
				barracks: false,
				fort: false,
				castle: false
			};
			
			var type = this.data[this.selectedTile].type;
			
			//If the tile is empty, anything other than a castle can be built
			//Assuming the player has enough money, of course
			if(type === TYPES.EMPTY){
				
				//Checking money
				if(this.playerData.money >= 5000)
					types.barn = types.barracks = types.fort = true;
				else if(this.playerData.money >= 1500)
					types.barn = types.barracks = true;
				else if(this.playerData.money >= 500)
					types.barn = true;
				
			}
			
			//If the tile is a fort, a castle can be built (if the player has enough money)
			if(type === TYPES.FORT && this.playerData.money >= 7500)
				types.castle = true;
			
			//Check one by one for buttons that should be enabled
			if(types.barn)
				dom.id('bd-barn').classList.remove('disabled');
			if(types.barracks)
				dom.id('bd-barracks').classList.remove('disabled');
			if(types.fort)
				dom.id('bd-fort').classList.remove('disabled');
			if(types.castle)
				dom.id('bd-castle').classList.remove('disabled');
			
			if(type !== TYPES.EMPTY && type !== TYPES.UNKNOWN && type !== TYPES.CASTLE)
				dom.id('bd-demolisher').classList.remove('disabled');
			
		}
		
	}
	
	//When the mouse goes down on the canvas
	this.mousedown = function(){
		this.client.mouse.startX = this.client.mouse.x;
		this.client.mouse.startY = this.client.mouse.y;
		this.client.mouse.offsetX = this.client.mouse.x - this.x;
		this.client.mouse.offsetY = this.client.mouse.y - this.y;
	}
	
	//When the mouse goes up on the canvas
	this.mouseup = function(){
		if(this.client.mouse.startX === this.client.mouse.x && this.client.mouse.startY === this.client.mouse.y){
			var i = this.hexUnderPoint({x: this.client.mouse.x - this.x, y: this.client.mouse.y - this.y});
			//Not if(i){ ... } because if i === 0, the if will fail to execute
			if(i !== false){
				this.selectHex(i);
			}
		}
		
		this.client.mouse.startX = 0;
		this.client.mouse.startY = 0;
	}
	
	//When the mouse moves on the canvas
	this.mousemove = function(){
		if(this.client.mouse.down){
			this.x = this.client.mouse.x - this.client.mouse.offsetX;
			this.y = this.client.mouse.y - this.client.mouse.offsetY;
			
			this.handleMapBoundaries();
			
			this.draw();
		}
	}
	
	//Key starts being pressed
	this.keydown = function(key){
		
		//If a tile is selected, QWEASD hotkeys will be used
		if(this.selectedTile !== -1){
			
			//QWEASD keys move the selected tile by one tile in the direction of the key from the midpoint between the keys on the keyboard
			//eg. W is up, S is down, Q is upper left, D lower right
			
			switch(key){
				case 81: //Q
					this.moveSelection(5);
					break;
				
				case 87: //W
					this.moveSelection(0);
					break;
				
				case 69: //E
					this.moveSelection(1);
					break;
				
				case 65: //A
					this.moveSelection(4);
					break;
				
				case 83: //S
					this.moveSelection(3);
					break;
				
				case 68: //D
					this.moveSelection(2);
					break;
			}
		}
	}
	
	//Key stops being pressed
	this.keyup = function(key){
		
	}
	
	//When the window is resized the canvas is too
	//Also serves as an initialisation function
	this.setupCanvas = function(){
		this.canvas.width = innerWidth;
		this.canvas.height = innerHeight;
		
		this.prepareAndDrawMap();
	}
	
	/* Ugly event handlers */
	//Event handlers have to be stored in the evt namespace so that the map destroy function can remove the event listeners
	
	this.evt = {};
	
	//Mouse
	
	this.evt.mousedown = function(e){
		this.client.mouse.down = true;
		this.client.mouse.x = e.clientX;
		this.client.mouse.y = e.clientY;
		
		this.mousedown();
	}.bind(this);
	
	this.canvas.addEventListener('mousedown', this.evt.mousedown);
	
	this.evt.mousemove = function(e){
		this.client.mouse.x = e.clientX;
		this.client.mouse.y = e.clientY;
		
		this.mousemove();
	}.bind(this);
	
	this.canvas.addEventListener('mousemove', this.evt.mousemove);
	
	this.evt.mouseup = function(e){
		this.client.mouse.down = false;
		this.client.mouse.x = e.clientX;
		this.client.mouse.y = e.clientY;
		
		this.mouseup();
	}.bind(this)
	
	this.canvas.addEventListener('mouseup', this.evt.mouseup);
	
	this.evt.mouseout = function(){
		this.client.mouse.down = false;
		
		this.mouseup();
	}.bind(this);
	
	document.addEventListener('mouseout', this.evt.mouseout);
	
	//Keyboard
	
	this.evt.keydown = function(e){
		
		this.client.keys[e.which || e.keyCode] = true;
		
		this.keydown(e.which || e.keyCode);
		
	}.bind(this);
	
	document.addEventListener('keydown', this.evt.keydown);
	
	this.evt.keyup = function(e){
		
		this.client.keys[e.which || e.keyCode] = false;
		
		this.keyup(e.which || e.keyCode);
		
	}.bind(this);
	
	document.addEventListener('keyup', this.evt.keyup);
	
	//Misc
	
	this.evt.windowResize = this.setupCanvas.bind(this);
	
	window.addEventListener('resize', this.evt.windowResize);
	
	//Now that all the handlers are set up, the destroy function is ready
	
	//Removes all event handlers and cleans up
	//Essentially stops the map entirely
	//Actually deleting the map once done with it is to be done externally
	this.destroy = function(){
		
		this.canvas.removeEventListener('mousedown', this.evt.mousedown);
		this.canvas.removeEventListener('mousemove', this.evt.mousemove);
		this.canvas.removeEventListener('mouseup', this.evt.mouseup);
		
		document.removeEventListener('mouseout', this.evt.mouseout);
		document.removeEventListener('keydown', this.evt.keydown);
		document.removeEventListener('keyup', this.evt.keyup);
		
		window.removeEventListener('resize', this.evt.windowResize);
		
	}
	
	//Finally, initialisation
	
	this.generate();
	this.setupCanvas();
}