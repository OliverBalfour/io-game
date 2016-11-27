
//Utils modules

//Filled with miscellaneous utility functions

(function(){
	
	//Random colour generator
	module.exports.randomColor = function(){
		var hexadecimal = ['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F'];
		for(var c = 0, color = ''; c < 6; c++){
			color += hexadecimal[Math.floor(Math.random() * 15 + 1)];
		}
		return '#' + color;
	}
	
	
})();