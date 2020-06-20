const express = require("express");
const socketIO = require("socket.io");
const http = require("http");
const cors = require("cors");

const router = require("./router");

const { addUser, removeUser, getUser, getUsersInRoom } = require("./users");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3002;

app.use(router);
app.use(cors);

// Whenever a new socket joins below code will run and will create an instance
io.on("connection", (socket) => {
  console.log("New socket connected!");

  // Client emitted 'join' event will be caught here and the that user will be added to the specified room with given id
  socket.on("join", ({ name, room }, callback) => {
    // adding user to the users array that contains user's name and room
    const { error, user } = addUser({ id: socket.id, name, room });

    // if same user is present in that particular room then it will give an error to the client
    if (error) return callback(error);

    // If user addition was successful then event will emit to the client
    // with user and text property
    socket.emit("message", {
      user: "admin",
      text: `${user.name}, welcome to the room ${user.room}`,
    });

    // This event will broadcast the message to that particular room that new user has arrived
    socket.broadcast
      .to(user.room)
      .emit("message", { user: "admin", text: `${user.name} has joined!` });

    // Finally adding that user to the room
    socket.join(user.room);

    console.log(
      "Users in the user's room are ",
      io.sockets.adapter.rooms[user.room].length
    );

    console.log(
      "Total sockets connected :  ",
      Object.keys(io.sockets.sockets).length
    );
  });

  // On the message from client,that message will be send to the room the user is in
  socket.on("sendMessage", (message, callback) => {
    // to get the user info such as room and his name
    const user = getUser(socket.id);

    // Broadcasting the user sent message in the particular room
    io.to(user.room).emit("message", { user: user.name, text: message });

    // Calling function sent from the client
    callback();
  });

  // When user is disconnected from the room
  socket.on("disconnect", () => {
    // removing user from the user array
    const user = removeUser(socket.id);

    if (user) {
      //Emitting message in the room that user has left
      io.to(user.room).emit("message", {
        user: "admin",
        text: `${user.name} has left`,
      });
    }
    console.log("Socket disconnected!");
  });
});

server.listen(PORT, () => console.log(`Server has started on port ${PORT}`));
