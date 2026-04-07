const mongoose = require('mongoose');

const pollSchema = new mongoose.Schema(
    {
        groupId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Group',
            required: true,
        },
        question: {
            type: String,
            required: true,
            default: 'Where should we go?',
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        // Each option is a restaurant snapshot
        options: [
            {
                restaurantId: mongoose.Schema.Types.ObjectId,
                name: String,
                image: String,
                rating: Number,
                cuisine: String,
            },
        ],
        // Map of userId → restaurantId (one vote per user)
        votes: {
            type: Map,
            of: String,
            default: {},
        },
        isOpen: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Poll', pollSchema);