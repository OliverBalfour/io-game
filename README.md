# Strategy-Game

An .io style HTML5 multiplayer strategy hexagon grid based game.

Built on node.js, socket.io and express with a few other odds and ends.

##Flow

Player and client used interchangeably.

The client connects to the server. They are asked for a username. When they have chosen their username, they click the play button.

Upon clicking the play button, the client connects to the waiting room. Once 8 players have joined, or (if there are >1 players in the room) if all the players wish to force start the game (there is a button that toggles that per player/client) or if the timer expires then the game starts.

Upon the game starting, all players in the waiting room are transferred from the waiting room to a new game room.

Inside a game room is where the game itself is played. A large hexagonal grid is presented to the player, and depending on how the game works various parts of the map may be obscured.