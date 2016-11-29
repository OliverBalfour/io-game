# Strategy-Game

An .io style HTML5 multiplayer strategy hexagon grid based game.

Built on node.js, socket.io and express with a few other odds and ends.

##Flow

Player and client used interchangeably.

The client connects to the server. They are asked for a username. When they have chosen their username, they click the play button.

Upon clicking the play button, the client connects to the waiting room. Once 8 players have joined, or (if there are >1 players in the room) if all the players wish to force start the game (there is a button that toggles that per player/client) or if the timer expires then the game starts.

Upon the game starting, all players in the waiting room are transferred from the waiting room to a new game room.

Inside a game room is where the game itself is played. A large flat topped hexagon grid is presented to the player, and depending on how the game works various parts of the map may be obscured.

##Logistics

The player may click on a tile (hexagon) to select it, click on another to select that one instead, or click on the currently selected tile to deselect it.

On each tile, a number of troops shall be present. A tile may be owned by a player, in which case there must be at least one troop present. Tiles start out as neutral, and a player may make a tile they own neutral. (So as to cover their tracks, I suppose)

A tile may also have certain buildings on it. A castle will generate a troop a turn, as will a fort. When all of a player's castles are captured by other players, the player loses. When a castle is captured, it becomes a fort. A fort may be upgraded to a castle, and any tile may be upgraded to a fort. Forts offer 30% defence, and castles 40%. In other words, an attacker needs at least 30%/40% more troops to conquer a tile like so. (The defence is calculated by multiplying defending troops by 1.3 (130%) or 1.4 (140%))

Also available are farms, which generate 100 troops worth of food per second. Farms may be upgraded for high prices (if possible having more lower leveled farms are cheaper, but you run the risk of not being able to properly defend them)

When a farm is conquered, it goes down a level and is given to the conqueror. A level one farm will return to normal land.

If your food stores go below zero, then as many troops as needed to restore the balance will die, randomly selected from each tile.

Barracks generate a troop every two turns, and are considerably cheaper than forts and castles. However, there are limitations on the barracks:fort:castle ratio. (Probably 6:3:1)

##Setup

You will need git, node.js and npm

Go to your parent directory of choice

`cd C:\Users\You\Your\Directory`

Clone the repo into your directory; it'll add a folder Strategy-Game

`git clone https://github.com/Tobsta/Strategy-Game.git`

Go into the new dir

`cd Strategy-Game`

Install dependencies (socket.io, express, and a few other bits and bobs)

`npm install`

Run the server

`node index`

Then navigate to [localhost:3000](http://localhost:3000)

If you don't have git, download this repo, unzip and put into your directory of choice, then run all commands after the git clone command. Or just get git. It's awesome. If you don't have node.js, don't even bother.

##Copyright notice

Copyright Oliver Balfour (Tobsta) 2016