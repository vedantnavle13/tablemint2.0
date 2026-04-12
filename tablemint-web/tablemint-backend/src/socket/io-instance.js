/**
 * io-instance.js — singleton holder for the Socket.io server instance.
 * Set it once in server.js; import it anywhere to broadcast events.
 */
let io;

module.exports = {
    setIO(ioInstance) {
        io = ioInstance;
    },
    getIO() {
        if (!io) throw new Error('Socket.io has not been initialised yet.');
        return io;
    },
};
