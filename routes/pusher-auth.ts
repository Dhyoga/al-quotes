import express from 'express';
import { requireJwt } from '../lib/auth.js';
import { pusher } from '../lib/pusher.js';

const router = express.Router();
router.use(requireJwt);

router.post('/', (req, res) => {
  const { socket_id, channel_name } = req.body;
  if (!socket_id || !channel_name) {
    return res.status(400).json({ message: 'socket_id and channel_name are required' });
  }

  if (channel_name !== `private-user-${req.userId}`) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  res.json(pusher.authorizeChannel(socket_id, channel_name));
});

export default router;
