
//io style realtime multiplayer strategy game server
//Built with Node, Express and Socket.io (and a few other bits and bobs)

//Copyright Oliver Balfour (aka Tobsta, Lord of the 32bit Ring) 2016-2017

(function(){
	
	/* Dependencies */
	
	var app = require('express')();
	var http = require('http').Server(app);
	var io = require('socket.io')(http);
	
	var path = require('path');
	var fs = require('fs');
	
	var chalk = require('chalk');
	
	var UUID = require('uuid');
	var sanitizer = require('sanitizer');
	
	
	//Other modules
	
	//Quick function for getting a module in the /server directory
	function getModule(name){
		return require(path.join(__dirname, 'server', name));
	}
	
	var WaitingRoom = getModule('waiting-room');
	var GameRoom = getModule('game-room');
	var Player = getModule('player');
	var DataTree = getModule('tree');
	var EventHandler = getModule('handler');
	var utils = getModule('utils');
	var EVENT = getModule('const').EVENT;
	
	//NODE_ENV is dev/debug mode?
	var debug = process.env.NODE_ENV === 'development';
	
	
	
	/* Routing */
	
	//At the root of the server, the game's index.html file is served
	app.get('/', function(req, res){
		res.sendFile(path.join(__dirname, path.join('dist', 'index.html')));
	});
	
	//Load in file names for files in /dist
	//Note that if files are added to subdirectories within dist/ , they won't be in the array
	
	var distFiles = [];
	
	//Note that until this request has finished (a fraction of a second) any requests to /dist resources will result in a 404 error
	fs.readdir('dist/', function(err, files){
		
		if(!err)
			distFiles = files;
		else
			console.log(chalk.red(err));
		
	});
	
	//Get individual files on the server
	//Unless they are dist/ files being requested from the root, it only sends back files in debug
	app.get('/*', function(req, res, next){
		
		var file = req.params[0];
		
		if(distFiles.indexOf(file) !== -1){
			
			res.sendFile(path.join(__dirname, 'dist', file));
			
		}else if(debug){
			
			//Assuming the file actually exists that is wanted, send it
			//Otherwise, 404 error is sent
			fs.access(file, fs.F_OK, function(err){
				
				if(!err){
					res.sendFile(path.join(__dirname, file));
				}else{
					res.sendStatus(404);
					console.log(chalk.yellow('Client tried to access ' + file));
				}
				
			});
			
		}else{
			
			res.sendStatus(404);
			console.log(chalk.yellow('Client tried to access ' + file));
			
		}
		
	});
	
	
	
	/* Data tree */
	
	var tree = new DataTree(io);
	
	
	
	/* WebSockets (socket.io) */
	
	var handler = new EventHandler(tree, io);
	
	io.on('connection', function(socket){
		
		handler.connect(socket);
		
	});
	
	
	
	/* Initialisation */
	
	//If a (valid) port was supplied as a command line parameter (node index PORT_NO) then use it
	//Otherwise, fall back to port 3000
	var port = process.argv[2] ?
				process.argv[2].match(/[^0-9]+/g) ?
					3000 : parseInt(process.argv[2])
			   : 3000;
	
	http.listen(port, function(){
		console.log(chalk.cyan('Loaded to ') + chalk.blue('http://localhost:') + chalk.green.underline(port) + chalk.cyan(' with debug ' + (debug ? 'on' : 'off') + '\n'));
	});
	
})();