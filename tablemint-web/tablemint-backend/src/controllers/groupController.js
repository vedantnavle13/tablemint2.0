const Group = require('../models/Group');
const Message = require('../models/Message');
const User = require('../models/User');

// ── Shared io broadcaster (non-fatal if socket not ready) ─────────────────────
function broadcast(room, event, data) {
    try {
        const io = require('../socket/io-instance').getIO();
        io.to(room).emit(event, data);
    } catch (e) {
        console.warn('Socket broadcast skipped:', e.message);
    }
}

// ─── Create a new group ───────────────────────────────────────────────────────
exports.createGroup = async (req, res) => {
    try {
        const { name, inviteEmails = [] } = req.body;
        const invitedUsers = await User.find({ email: { $in: inviteEmails } }).select('_id');
        const memberIds = invitedUsers.map((u) => u._id);
        if (!memberIds.some((id) => id.toString() === req.user._id.toString())) {
            memberIds.push(req.user._id);
        }

        const group = await Group.create({
            name,
            createdBy: req.user._id,
            members: memberIds,
        });

        await group.populate('members', 'name email');
        await group.populate('createdBy', 'name email');
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

// ─── Get a single group ───────────────────────────────────────────────────────
exports.getGroupById = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('members', 'name email');

        if (!group) return res.status(404).json({ status: 'error', message: 'Group not found.' });

        const isMember = group.members.some((m) => m._id.equals(req.user._id));
        if (!isMember) return res.status(403).json({ status: 'error', message: 'Access denied.' });

        res.json({ status: 'success', data: group });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};

// ─── Get message history ──────────────────────────────────────────────────────
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
            .limit(100);

        res.json({ status: 'success', data: messages });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};

// ─── Share a restaurant (REST – works from any page) ─────────────────────────
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

        broadcast(req.params.id, 'newMessage', message);

        res.status(201).json({ status: 'success', data: message });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};

// ─── PATCH /api/groups/:id — edit group name ──────────────────────────────────
exports.updateGroup = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name?.trim()) {
            return res.status(400).json({ status: 'error', message: 'Name is required.' });
        }

        const group = await Group.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('members', 'name email');

        if (!group) return res.status(404).json({ status: 'error', message: 'Group not found.' });

        // Only creator can rename
        if (!group.createdBy._id.equals(req.user._id)) {
            return res.status(403).json({ status: 'error', message: 'Only the group creator can rename this group.' });
        }

        group.name = name.trim();
        await group.save();
        await group.populate('createdBy', 'name email');
        await group.populate('members', 'name email');

        // Broadcast updated group to all members in the room
        broadcast(req.params.id, 'groupUpdated', group);

        res.json({ status: 'success', data: group });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};

// ─── POST /api/groups/:id/invite — invite members by email ───────────────────
exports.inviteMembers = async (req, res) => {
    try {
        const { emails = [] } = req.body;
        if (!Array.isArray(emails) || emails.length === 0) {
            return res.status(400).json({ status: 'error', message: 'Provide at least one email.' });
        }

        const group = await Group.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('members', 'name email');

        if (!group) return res.status(404).json({ status: 'error', message: 'Group not found.' });

        // Only creator can invite
        if (!group.createdBy._id.equals(req.user._id)) {
            return res.status(403).json({ status: 'error', message: 'Only the group creator can invite members.' });
        }

        const cleanEmails = emails.map((e) => e.trim().toLowerCase()).filter(Boolean);

        // Find users by email
        const foundUsers = await User.find({ email: { $in: cleanEmails } }).select('_id name email');
        const existingMemberIds = group.members.map((m) => m._id.toString());

        const newUsers = foundUsers.filter((u) => !existingMemberIds.includes(u._id.toString()));
        const notFound  = cleanEmails.filter(
            (e) => !foundUsers.some((u) => u.email === e)
        );
        const alreadyIn = foundUsers.filter((u) => existingMemberIds.includes(u._id.toString()));

        if (newUsers.length > 0) {
            await Group.findByIdAndUpdate(req.params.id, {
                $addToSet: { members: { $each: newUsers.map((u) => u._id) } }
            });
        }

        const updatedGroup = await Group.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('members', 'name email');

        broadcast(req.params.id, 'groupUpdated', updatedGroup);

        res.json({
            status: 'success',
            data: updatedGroup,
            meta: {
                added: newUsers.map((u) => u.email),
                alreadyMembers: alreadyIn.map((u) => u.email),
                notFound,
            },
        });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};

// ─── DELETE /api/groups/:id/members/:userId — remove a member ────────────────
exports.removeMember = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('members', 'name email');

        if (!group) return res.status(404).json({ status: 'error', message: 'Group not found.' });

        const targetId = req.params.userId;

        // Only creator can remove others; you can always remove yourself (use /leave for that)
        if (!group.createdBy._id.equals(req.user._id)) {
            return res.status(403).json({ status: 'error', message: 'Only the group creator can remove members.' });
        }

        // Creator cannot remove themselves this way
        if (targetId === group.createdBy._id.toString()) {
            return res.status(400).json({ status: 'error', message: 'The creator cannot be removed. Transfer ownership or delete the group.' });
        }

        group.members = group.members.filter((m) => m._id.toString() !== targetId);
        await group.save();

        await group.populate('createdBy', 'name email');
        await group.populate('members', 'name email');

        broadcast(req.params.id, 'groupUpdated', group);
        // Let the removed user know they've been kicked
        broadcast(req.params.id, 'memberRemoved', { userId: targetId, groupId: req.params.id });

        res.json({ status: 'success', data: group });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};

// ─── DELETE /api/groups/:id/leave — leave a group ─────────────────────────────
exports.leaveGroup = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('members', 'name email');

        if (!group) return res.status(404).json({ status: 'error', message: 'Group not found.' });

        const isMember = group.members.some((m) => m._id.equals(req.user._id));
        if (!isMember) return res.status(400).json({ status: 'error', message: 'You are not a member of this group.' });

        // Creator cannot leave (they must delete or transfer ownership)
        if (group.createdBy._id.equals(req.user._id)) {
            return res.status(400).json({ status: 'error', message: 'You created this group. You cannot leave — only delete it.' });
        }

        group.members = group.members.filter((m) => !m._id.equals(req.user._id));
        await group.save();

        await group.populate('createdBy', 'name email');
        await group.populate('members', 'name email');

        broadcast(req.params.id, 'groupUpdated', group);
        broadcast(req.params.id, 'memberRemoved', { userId: req.user._id.toString(), groupId: req.params.id });

        res.json({ status: 'success', message: 'You have left the group.' });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};