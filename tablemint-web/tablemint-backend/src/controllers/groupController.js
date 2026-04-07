const Group = require('../models/Group');
const Message = require('../models/Message');
const User = require('../models/User');

// ─── Create a new group ───────────────────────────────────────────────────────
exports.createGroup = async (req, res) => {
    try {
        const { name, inviteEmails = [] } = req.body;

        // Resolve invited emails to user IDs
        const invitedUsers = await User.find({ email: { $in: inviteEmails } }).select('_id');
        const memberIds = invitedUsers.map((u) => u._id);

        const group = await Group.create({
            name,
            createdBy: req.user._id,
            members: memberIds, // creator is added by pre-save hook
        });

        await group.populate('members', 'name email');
        res.status(201).json({ status: 'success', data: group });
    } catch (err) {
        res.status(400).json({ status: 'error', message: err.message });
    }
};

// ─── Get all groups the current user belongs to ───────────────────────────────
exports.getMyGroups = async (req, res) => {
    try {
        const groups = await Group.find({ members: req.user._id })
            .populate('createdBy', 'name email')
            .populate('members', 'name email')
            .sort('-createdAt');

        res.json({ status: 'success', data: groups });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};

// ─── Get a single group (members only) ───────────────────────────────────────
exports.getGroupById = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('members', 'name email');

        if (!group) return res.status(404).json({ status: 'error', message: 'Group not found.' });

        // Ensure requester is a member
        const isMember = group.members.some((m) => m._id.equals(req.user._id));
        if (!isMember) return res.status(403).json({ status: 'error', message: 'Access denied.' });

        res.json({ status: 'success', data: group });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};

// ─── Get message history for a group ─────────────────────────────────────────
exports.getMessages = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ status: 'error', message: 'Group not found.' });

        const isMember = group.members.some((m) => m.equals(req.user._id));
        if (!isMember) return res.status(403).json({ status: 'error', message: 'Access denied.' });

        const messages = await Message.find({ groupId: req.params.id })
            .populate('sender', 'name email')
            .populate('pollId')
            .sort('createdAt')
            .limit(100); // Last 100 messages

        res.json({ status: 'success', data: messages });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};

// ── Share a restaurant card into a group (REST – works from any page) ─────────
exports.shareRestaurant = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ status: 'error', message: 'Group not found.' });

        const isMember = group.members.some((m) => m.equals(req.user._id));
        if (!isMember) return res.status(403).json({ status: 'error', message: 'Access denied.' });

        const { restaurantData } = req.body;
        if (!restaurantData?.name) {
            return res.status(400).json({ status: 'error', message: 'restaurantData.name is required.' });
        }

        const message = await Message.create({
            groupId: req.params.id,
            sender: req.user._id,
            type: 'restaurant_share',
            restaurantData,
        });
        await message.populate('sender', 'name email');

        // ── Broadcast to all members currently in the group room ──────────────
        try {
            const io = require('../socket/io-instance').getIO();
            io.to(req.params.id).emit('newMessage', message);
        } catch (socketErr) {
            // Non-fatal: socket may not be initialised in test envs
            console.warn('Socket broadcast skipped:', socketErr.message);
        }

        res.status(201).json({ status: 'success', data: message });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};