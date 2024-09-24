import { Server } from 'socket.io';

export default function handler(req, res) {
  if (res.socket.server.io) {
    console.log('Socket is already set up');
    res.end();
    return;
  }

  const io = new Server(res.socket.server);

  io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });

  res.socket.server.io = io;
  res.end();
}
