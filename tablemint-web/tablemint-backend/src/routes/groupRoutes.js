const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    createGroup,
    getMyGroups,
    getGroupById,
    getMessages,
    shareRestaurant,
} = require('../controllers/groupController');

router.use(protect); // All group routes require login

router.post('/', createGroup);
router.get('/', getMyGroups);
router.get('/:id', getGroupById);
router.get('/:id/messages', getMessages);
router.post('/:id/share-restaurant', shareRestaurant);

module.exports = router;