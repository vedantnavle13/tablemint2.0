const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Group = require('../models/Group');
const Message = require('../models/Message');
const Poll = require('../models/Poll');

/**
 * Initialise Socket.io with JWT authentication and group room logic.
 * @param {import('socket.io').Server} io
 */
module.exports = function initSocket(io) {
    // ─── Auth middleware: verify JWT on every connection ─────────────────────
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            if (!token) return next(new Error('Authentication required.'));

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select('_id name email isActive');

            if (!user || !user.isActive) return next(new Error('User not found or inactive.'));

            socket.user = user;
            next();
        } catch {
            next(new Error('Invalid or expired token.'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`🔌 Socket connected: ${socket.user.name} (${socket.id})`);

        // ─── joinGroup ────────────────────────────────────────────────────────
        socket.on('joinGroup', async ({ groupId }) => {
            try {
                const group = await Group.findById(groupId);
                if (!group) return socket.emit('error', { message: 'Group not found.' });

                const isMember = group.members.some((m) => m.equals(socket.user._id));
                if (!isMember) return socket.emit('error', { message: 'Access denied.' });

                socket.join(groupId);
                socket.emit('joinedGroup', { groupId });
                console.log(`👥 ${socket.user.name} joined room ${groupId}`);
            } catch (err) {
                socket.emit('error', { message: err.message });
            }
        });

        // ─── sendMessage ──────────────────────────────────────────────────────
        socket.on('sendMessage', async ({ groupId, text, type = 'text', restaurantData }) => {
            try {
                const group = await Group.findById(groupId);
                if (!group) return socket.emit('error', { message: 'Group not found.' });

                const isMember = group.members.some((m) => m.equals(socket.user._id));
                if (!isMember) return socket.emit('error', { message: 'Access denied.' });

                const messageData = {
                    groupId,
                    sender: socket.user._id,
                    type,
                    text: type === 'text' ? text : undefined,
                    restaurantData: type === 'restaurant_share' ? restaurantData : undefined,
                };

                const message = await Message.create(messageData);
                await message.populate('sender', 'name email');

                io.to(groupId).emit('newMessage', message);
            } catch (err) {
                socket.emit('error', { message: err.message });
            }
        });

        // ─── createPoll ───────────────────────────────────────────────────────
        socket.on('createPoll', async ({ groupId, question, restaurantOptions }) => {
            try {
                const group = await Group.findById(groupId);
                if (!group) return socket.emit('error', { message: 'Group not found.' });

                const isMember = group.members.some((m) => m.equals(socket.user._id));
                if (!isMember) return socket.emit('error', { message: 'Access denied.' });

                const poll = await Poll.create({
                    groupId,
                    question: question || 'Where should we go?',
                    createdBy: socket.user._id,
                    options: restaurantOptions,
                });

                const message = await Message.create({
                    groupId,
                    sender: socket.user._id,
                    type: 'poll',
                    pollId: poll._id,
                });
                await message.populate('sender', 'name email');
                await message.populate('pollId');

                io.to(groupId).emit('newMessage', message);
            } catch (err) {
                socket.emit('error', { message: err.message });
            }
        });

        // ─── castVote ─────────────────────────────────────────────────────────
        socket.on('castVote', async ({ pollId, restaurantId }) => {
            try {
                const poll = await Poll.findById(pollId);
                if (!poll) return socket.emit('error', { message: 'Poll not found.' });
                if (!poll.isOpen) return socket.emit('error', { message: 'Poll is closed.' });

                const group = await Group.findById(poll.groupId);
                const isMember = group.members.some((m) => m.equals(socket.user._id));
                if (!isMember) return socket.emit('error', { message: 'Access denied.' });

                // One vote per user — overwrite if they change their mind
                poll.votes.set(socket.user._id.toString(), restaurantId);
                await poll.save();

                io.to(poll.groupId.toString()).emit('pollUpdated', poll);
            } catch (err) {
                socket.emit('error', { message: err.message });
            }
        });

        // ─── endPoll ──────────────────────────────────────────────────────────
        socket.on('endPoll', async ({ pollId }) => {
            try {
                const poll = await Poll.findById(pollId);
                if (!poll) return socket.emit('error', { message: 'Poll not found.' });

                if (!poll.createdBy.equals(socket.user._id)) {
                    return socket.emit('error', { message: 'Only the poll creator can end it.' });
                }

                poll.isOpen = false;
                await poll.save();

                io.to(poll.groupId.toString()).emit('pollUpdated', poll);
                console.log(`🗳️ Poll ${pollId} ended by ${socket.user.name}`);
            } catch (err) {
                socket.emit('error', { message: err.message });
            }
        });

        socket.on('disconnect', () => {
            console.log(`🔌 Socket disconnected: ${socket.user?.name}`);
        });
    });
};