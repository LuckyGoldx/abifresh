import { Router } from 'express';
import { authService } from '../services/auth.service';
import { generateToken } from '../middleware/auth';

const router = Router();

/**
 * Register new user
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name, role, store_location } = req.body;

    if (!email || !password || !full_name || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await authService.registerUser(email, password, full_name, role, store_location);

    res.status(201).json({
      user,
      message: 'User registered successfully',
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Login user - use Supabase authentication only
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    console.log('Login attempt:', { username });

    // Authenticate with Supabase
    console.log('Validating credentials with Supabase...');
    const user = await authService.loginByUsername(username, password);
    
    if (!user) {
      console.log('Login failed - invalid credentials or user not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id, user.email, user.role);
    
    console.log(`✅ Login successful for ${username} with role: ${user.role}`);
    
    res.json({
      user,
      token,
      message: 'Login successful',
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(400).json({ error: error.message || 'Login failed' });
  }
});

/**
 * Get current user
 */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const userId = req.body.user_id || req.query.user_id;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const user = await authService.getUserById(userId as string);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
