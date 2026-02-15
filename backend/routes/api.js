const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const taskController = require('../controllers/taskController');
const reviewController = require('../controllers/reviewController');
const subscriptionController = require('../controllers/subscriptionController');
const leaderboardController = require('../controllers/leaderboardController');
const badgeController = require('../controllers/badgeController');
const adminController = require('../controllers/adminController');

const { authenticateToken, requireSubscription, requireRole } = require('../middleware/auth');

router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/profile', authenticateToken, authController.getProfile);

router.get('/tasks', authenticateToken, requireSubscription, taskController.getTasks);
router.get('/tasks/:taskId', authenticateToken, requireSubscription, taskController.getTaskInstance);
router.post('/tasks', authenticateToken, taskController.createTask);
router.post('/tasks/:taskInstanceId/submit', authenticateToken, requireSubscription, taskController.submitSolution);

router.get('/reviews/pending', authenticateToken, requireRole(['advanced', 'mentor', 'reviewer']), taskController.getPendingReviews);
router.post('/reviews/:solutionId', authenticateToken, requireRole(['advanced', 'mentor', 'reviewer']), reviewController.submitReview);
router.get('/solutions/my', authenticateToken, reviewController.getUserSolutions);
router.get('/solutions/:solutionId/reviews', authenticateToken, reviewController.getSolutionReviews);

router.post('/subscription/create-checkout', authenticateToken, subscriptionController.createCheckoutSession);
router.post('/subscription/cancel', authenticateToken, subscriptionController.cancelSubscription);
router.get('/subscription/status', authenticateToken, subscriptionController.getSubscriptionStatus);
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), subscriptionController.handleWebhook);

router.get('/leaderboard', authenticateToken, leaderboardController.getLeaderboard);
router.get('/leaderboard/rank', authenticateToken, leaderboardController.getUserRank);

router.get('/badges', authenticateToken, badgeController.getBadges);

router.get('/admin/stats', authenticateToken, requireRole(['reviewer']), adminController.getAdminStats);
router.get('/admin/tasks/pending', authenticateToken, requireRole(['reviewer']), adminController.getPendingTasks);
router.post('/admin/tasks/:taskId/approve', authenticateToken, requireRole(['reviewer']), adminController.approveTask);
router.post('/admin/tasks/:taskId/reject', authenticateToken, requireRole(['reviewer']), adminController.rejectTask);
router.get('/admin/activity', authenticateToken, requireRole(['reviewer']), adminController.getRecentActivity);

module.exports = router;
