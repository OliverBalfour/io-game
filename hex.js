function Map(w, h, side, canvas){
	
	//The data for the map is all stored in one big array
	this.data = [];
	
	//Client data
	this.client = {
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
		}
	};
	
	//Position of map
	this.x = 0;
	this.y = 0;
	
	this.generate = function(){
		//Populating that array with empty tile objects
		this.data = [];
		
		for(var i = 0; i < w * h; i++){
			this.data.push({
				owner: null,
				troops: 0
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
		ctx.fillStyle = tile.owner ? tile.owner.color : 'lightgrey';
		
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
		
		//Write troop number in the middle of the hexagon if there are any troops
		if(tile.troops > 0){
			ctx.fillStyle = 'black';
			
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
	this.selectHex = function(i){
		
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
			
		}else{
			
			//To clear us of the currently selected tile, we redraw a flower of hexes around the selected tile
			if(this.selectedTile !== -1){
				this.drawHexFlower(0, 0, this.selectedTile, this.gridctx, this.drawHex);
				this.drawHexFlower(this.x, this.y, this.selectedTile, this.ctx, this.drawHex);
			}
			
			//Select
			this.selectedTile = i;
			
			//When drawing selected tile hex flowers, we draw a hex flower and then highlight the middle tile even more
			
			//Draw the hex to the grid canvas
			this.drawHexFlower(0, 0, i, this.gridctx, this.highlightHex);
			this.highlightHex(d.x, d.y, i, this.gridctx);
			
			//Render the hex simultaneously
			this.drawHexFlower(this.x, this.y, i, this.ctx, this.highlightHex);
			this.highlightHex(d.x + this.x, d.y + this.y, i, this.ctx);
		}
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
			if(j < that.data.length && j >= 0){
				drawingFunction.call(that, td.x + x, td.y + y, j, ctx);
			}
		}
		
		//Middle hex
		extrapolateParamsAndDraw(i);
		
		//Outer hexes
		extrapolateParamsAndDraw(i - 1);
		extrapolateParamsAndDraw(i + 1);
		extrapolateParamsAndDraw(i - this.mapWidth);
		extrapolateParamsAndDraw(i + this.mapWidth);
		if(i % 2 === 0){
			extrapolateParamsAndDraw(i - this.mapWidth - 1);
			extrapolateParamsAndDraw(i - this.mapWidth + 1);			
		}else{
			extrapolateParamsAndDraw(i + this.mapWidth - 1);
			extrapolateParamsAndDraw(i + this.mapWidth + 1);
		}
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
			
			//Map boundaries
			//The map is allowed to be a third of the screen
			if(this.x > Math.floor(innerWidth / 3))
				this.x = Math.floor(innerWidth / 3);
			if(this.y > Math.floor(innerHeight / 3))
				this.y = Math.floor(innerHeight / 3);
			if(this.x < -this.gridcanvas.width + Math.floor(innerWidth / 3 * 2))
				this.x = -this.gridcanvas.width + Math.floor(innerWidth / 3 * 2);
			if(this.y < -this.gridcanvas.height + Math.floor(innerHeight / 3 * 2))
				this.y = -this.gridcanvas.height + Math.floor(innerHeight / 3 * 2);
			
			this.draw();
		}
	}
	
	//Ugly event handlers
	
	this.setupCanvas = function(){
		this.canvas.width = innerWidth;
		this.canvas.height = innerHeight;
		
		this.prepareAndDrawMap();
	}
	window.addEventListener('resize', this.setupCanvas.bind(this));

	this.canvas.addEventListener('mousedown', function(e){
		this.client.mouse.down = true;
		this.client.mouse.x = e.clientX;
		this.client.mouse.y = e.clientY;
		
		this.mousedown();
	}.bind(this));

	this.canvas.addEventListener('mousemove', function(e){
		this.client.mouse.x = e.clientX;
		this.client.mouse.y = e.clientY;
		
		this.mousemove();
	}.bind(this));

	this.canvas.addEventListener('mouseup', function(e){
		this.client.mouse.down = false;
		this.client.mouse.x = e.clientX;
		this.client.mouse.y = e.clientY;
		
		this.mouseup();
	}.bind(this));

	document.addEventListener('mouseout', function(){
		this.client.mouse.down = false;
		
		this.mouseup();
	}.bind(this));
	
	//Finally, initialisation
	
	this.generate();
	
	this.setupCanvas();
	
	this.draw();
}