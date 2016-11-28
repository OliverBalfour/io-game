
//Map class

//Map for the server end, contains all of the map data and controls networking necessary data to the client

//Shares many of the functions of the client side map, but has procedural generation, networking, and actual game logic involved
//When the map class is ready, it will be able to be given various procedural generation functions and other useful things
//Currently it only takes width and height in tiles

(function(){
	
	module.exports = function(w, h){
		
		//Size
		this.w = w;
		this.h = h;
		
		
		
	}
})();