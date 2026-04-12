const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
    {
        groupId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Group',
            required: true,
            index: true,
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        // 'text' | 'restaurant_share' | 'poll'
        type: {
            type: String,
            enum: ['text', 'restaurant_share', 'poll'],
            default: 'text',
        },
        text: {
            type: String,
            trim: true,
        },
        // Stored when type === 'restaurant_share'
        // restaurantId is a plain String (not ObjectId ref) to avoid cast errors
        // when IDs come from different sources (Explore vs RestaurantDetail)
        restaurantData: {
            restaurantId: String,
            name: String,
            image: String,
            rating: Number,
            cuisine: String,
            price: String,
        },
        // Reference to Poll doc when type === 'poll'
        pollId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Poll',
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);