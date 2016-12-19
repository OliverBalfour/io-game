
var tutorialPosition = 0,
	banner = dom.id('tutorial-banner');

var tutorialMessages = [
	"Welcome to [name].io",
	"The aim of the game is to conquer other player's territories",
	"To move troops, first click on one of your tiles",
	"You can move troops in any direction from that tile with the keys Q, W, E, A, S and D",
	"Have a go at moving troops around and capturing empty tiles",
	"There is another player on the map",
	"When you capture a player's last castle, they lose",
	"See if you can find them and conquer their castle",
	"There are different kinds of tiles",
	"You can't pass mountains",
	"Castles, forts and barracks generate troops and give you money",
	"Farms give you money, with which you buy buildings",
	"Build a farm on one of your empty tiles by selecting a tile and clicking the barn icon on the right",
	"You will need $500 to buy a farm. Money is displayed in the top left",
	"Perfect! You're ready to go!"
];

function startTutorial(){
	
	data.tutorial = true;
	
	//The function gets data like in EVENT.MAP_INITIALISATION
	socket.emit(EVENT.START_TUTORIAL, null, function(d){
		
		data.turn = d.turn;
		
		data.players = d.players;
		
		//Indexes, essentially game specific IDs for players, great for saving bandwidth (1 byte instead of 16)
		data.indexes = d.indexes;
		
		fixMap(d.map);
		
		//Center the map on the only owned tile on the screen - the player's castle
		for(var i = 0; i < data.activeMap.data.length; i++){
			if(data.activeMap.data[i].owner){
				data.activeMap.centerTile(i);
			}
		}
		
		//Initial map draw
		data.activeMap.prepareAndDrawMap();
		
	});
	
	tutorialPosition = 0;
	banner.innerHTML = tutorialMessages[tutorialPosition];
	
	dom.show('tutorial');
	dom.hide('chat');
	
}

function endTutorial(){
	
	//Go back to the main menu
	dom.hide('tutorial');
	dom.changeScreen('game-room', 'start-screen');
	
	//Reset the tutorial screen
	dom.id('tut-next').innerHTML = 'Next';
	dom.hide('tut-prev');
	tutorialPosition = 0;
	banner.innerHTML = tutorialMessages[tutorialPosition];
	dom.show('chat');
	
	//Change the game state
	data.tutorial = false;
	data.activeMap = null;
	
	//Let the server know that this game is pointless to continue
	socket.emit(EVENT.CONCEDE_GAME, null);
	
}

//Advance to the next position in the tutorial
function nextInTutorial(){
	
	//If they finished, end the tutorial
	if(tutorialPosition === tutorialMessages.length - 1){
		
		endTutorial();
		
		//We don't want to continue with this function call
		return;
		
	}
	
	//Increment
	tutorialPosition++;
	
	//Show new message
	banner.innerHTML = tutorialMessages[tutorialPosition];
	
	//If they are advancing to the last position, change 'Next' to 'Finish'
	if(tutorialPosition === tutorialMessages.length - 1){
		dom.id('tut-next').innerHTML = 'Finish';
	}
	
	//If they are advancing from the start of the tutorial, show the 'Previous' button
	if(tutorialPosition === 1){
		dom.show('tut-prev');
	}
	
}

//Go back to the previous position in the tutorial
function prevInTutorial(){
	
	//Decrement
	tutorialPosition--;
	
	//Show last message
	banner.innerHTML = tutorialMessages[tutorialPosition];
	
	//If they are going back to the first position, hide the 'Previous' button
	if(tutorialPosition === 0){
		dom.hide('tut-prev');
	}
	
	//If they are going back from the last position, change 'Finish' to 'Next'
	if(tutorialPosition === tutorialMessages.length - 2){
		dom.id('tut-next').innerHTML = 'Next';
	}
	
}