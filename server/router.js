
//EventHandler class

//Has functions for handling all of the events emitted by sockets

(function(){
	
	const fs = require('fs');
	const path = require('path');
	const chalk = require('chalk');
	
	module.exports = function(app, debug){
		
		this.app = app;
		this.debug = debug;
		
		//At the root of the server, the game's index.html file is served
		this.app.get('/', function(req, res){
			res.sendFile(path.join(__dirname, '..', path.join('dist', 'index.html')));
		});

		sendFileOr404 = (file, res) => {
			//Assuming the file actually exists that is wanted, send it
			//Otherwise, 404 error is sent
			fs.access(file, fs.F_OK, function(err){
				if(!err){
					res.sendFile(path.join(__dirname, '..', file));
				}else{
					res.sendStatus(404);
					console.log(chalk.yellow('Client tried to access ' + file));
				}
			});
		}
		
		//Load in file names for files in /dist
		//Note that if files are added to subdirectories within dist/, they won't be in the array
		let distFiles = [];
		
		//Note that until this request has finished (a fraction of a second) any requests to /dist resources will result in a 404 error
		fs.readdir('dist/', function(err, files){
			
			if(!err)
				distFiles = files;
			else
				console.log(chalk.red(err));
			
		});
		
		//Get individual files on the server
		//Unless they are dist/ files being requested from the root, or icons/ files it only sends back files in debug
		this.app.get('/*', function(req, res, next){
			
			let file = req.params[0];
			
			if(distFiles.indexOf(file) !== -1){
				res.sendFile(path.join(__dirname, '..', 'dist', file));
			}else if(this.debug){
				sendFileOr404(file, res);
			}else if(file.startsWith('icons/')){
				sendFileOr404(file, res);
			}else{
				res.sendStatus(404);
				console.log(chalk.yellow('Client tried to access ' + file));	
			}
			
		});
	}
})();
