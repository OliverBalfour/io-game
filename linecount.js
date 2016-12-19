
//Counts lines of code in all specified files

var fs = require('fs');

var files = [
	'index.js',
	'linecount.js',
	'modules/const.js',
	'modules/game-room.js',
	'modules/map.js',
	'modules/player.js',
	'modules/utils.js',
	'modules/waiting-room.js',
	'src/client.js',
	'src/hex.js',
	'src/index.html',
	'src/style.css',
	'src/tutorial.js'
];

console.log('\n');

for(var i = 0, len, total = 0; i < files.length; i++){
	
	len = fs.readFileSync(files[i]).toString().split('\n').length;
	
	total += len;
	
	console.log(files[i] + tabs(4, files[i]) + len + spaces(5, len + '') + 'lines');
	
}

//Gets the amount of tabs necessary to indent to s tabs (given 8 wide tabs in the cmd)
//Give a string for width
function tabs(s, width){
	
	var tot = s - Math.floor(width.length / 8),
		str = '';
	
	for(var i = 0; i < tot; i++){
		str += '\t';
	}
	
	return str;
	
}

function spaces(s, width){
	
	var tot = s - width.length,
		str = '';
	
	for(var i = 0; i < tot; i++){
		str += ' ';
	}
	
	return str;
	
}

console.log('\nTotal lines: ' + total);