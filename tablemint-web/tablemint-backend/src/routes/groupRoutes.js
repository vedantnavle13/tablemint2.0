const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    createGroup,
    getMyGroups,
    getGroupById,
    getMessages,
    shareRestaurant,
    updateGroup,
    inviteMembers,
    removeMember,
    leaveGroup,
} = require('../controllers/groupController');

router.use(protect); // All group routes require login

router.post('/',   createGroup);
router.get('/',    getMyGroups);
router.get('/:id', getGroupById);
router.patch('/:id', updateGroup);                          // edit name
router.get('/:id/messages', getMessages);
router.post('/:id/share-restaurant', shareRestaurant);
router.post('/:id/invite', inviteMembers);                  // invite by email
router.delete('/:id/members/:userId', removeMember);        // remove a member
router.delete('/:id/leave', leaveGroup);                    // leave group

module.exports = router;