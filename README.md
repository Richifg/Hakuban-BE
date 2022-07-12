# ![hakuban logo](https://res.cloudinary.com/richi/image/upload/v1657562389/previews/hakuban_logo_zbhqqn.png) Hakuban-BE

Backend service for Hakuban, an online whiteboard tool for collaborating in real time. It consist of the following:
* A room manager for keeping track of which users are connected to which rooms.
* A websocket server for receiving and broacasting messages to users on the same room. 
* A faunaDB database for storing all items created on the rooms.

Built with NodeJS + express.

## App
https://hakuban.app

## Client repo
https://github.com/Richifg/Hakuban-FE