# CollabTool-BE

Backend service for the Collaborate tool. It consist of a the following:
    - A room manager for keeping track of which users are connected to which rooms.
    - A websocket server for receiving and broacasting messages to users on the same room. 
    - A faunaDB database for storing all items created on the rooms.

Built with express and deployed on heroku.