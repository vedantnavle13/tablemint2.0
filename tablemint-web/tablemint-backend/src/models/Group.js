const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Group name is required'],
            trim: true,
            maxlength: [80, 'Group name cannot exceed 80 characters'],
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        // All members including the creator
        members: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
    },
    { timestamps: true }
);

// Ensure the creator is always in members
groupSchema.pre('save', function (next) {
    if (!this.members.includes(this.createdBy)) {
        this.members.push(this.createdBy);
    }
    next();
});

module.exports = mongoose.model('Group', groupSchema);