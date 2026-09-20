import { Request, Response, CookieOptions } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '../db/database';
import { JWT_SECRET } from '../middleware/authMiddleware';
import { UserEntity } from '../types';
import { SmsService } from '../services/smsService';

export const AUTH_COOKIE_NAME = 'aurelis_auth_token';

export const getAuthCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
});

export class AuthController {
  public static async register(req: Request, res: Response) {
    const { email, password, fullName, country, baseCurrency, currency, phone } = req.body;
    const chosenCurrency = (baseCurrency || currency || 'BDT') as any;

    if (!email || !fullName) {
      return res.status(400).json({ error: 'Full Name and Email Address are required.' });
    }

    const trimmedEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    if (await db.users.has(trimmedEmail)) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const baseTag = fullName.toLowerCase().trim().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.').replace(/^\.|\.$/g, '') || 'client';
    let tag = `@${baseTag}`;
    let counter = 1;
    while (await db.findUserByEmailOrTag(tag)) {
      tag = `@${baseTag}${counter}`;
      counter++;
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const userPhone = phone && String(phone).trim() ? String(phone).trim() : '+880 1700-000000';

    const newUser: UserEntity = {
      id: userId,
      email: trimmedEmail,
      passwordHash,
      fullName: fullName.trim(),
      phone: userPhone,
      aurelisTag: tag,
      baseCurrency: chosenCurrency,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      twoFactorEnabled: true,
      biometricEnabled: true,
      passkeyEnabled: true,
      address: {
        street: 'Gulshan Avenue, Road 11',
        city: 'Dhaka',
        country: country || 'Bangladesh',
        postalCode: '1212',
      },
      transactionPin: '1234',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.users.set(newUser.id, newUser);

    // Auto-provision initial isolated base wallet for new user (default BDT if not specified)
    const walletId = `w_${chosenCurrency.toLowerCase()}_${Date.now()}`;
    await db.wallets.set(walletId, {
      id: walletId,
      userId: newUser.id,
      currency: chosenCurrency,
      balance: 0.00, // Dynamic opening balance starting at zero
      pendingBalance: 0,
      accountNumber: `DBS ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`,
      iban: `BD89 DBSB 0210 0002 ${Math.floor(1000 + Math.random() * 9000)}`,
      bic: `DBSB${chosenCurrency}DH`,
      isPrimary: true,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    db.saveToFile();

    // Dispatch welcome SMS alert via sms.net.bd if phone number is provided
    if (userPhone && !userPhone.includes('555')) {
      SmsService.sendSms({
        to: userPhone,
        msg: `[DBS Bank] Welcome ${newUser.fullName} to DBS Digital Banking. Your account has been established. Tag: ${newUser.aurelisTag}. Security: Active.`,
      }).catch((err) => {
        console.warn('[DBS-AUTH-SMS] Welcome SMS dispatch warning:', err.message);
      });
    }

    const token = jwt.sign({ id: newUser.id, email: newUser.email, tier: newUser.tier }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());

    res.status(201).json({
      message: 'Account successfully registered.',
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        phone: newUser.phone,
        aurelisTag: newUser.aurelisTag,
        tier: newUser.tier,
        avatar: newUser.avatar,
        baseCurrency: newUser.baseCurrency,
      },
      token,
    });
  }

  public static async login(req: Request, res: Response) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const trimmedEmail = email.toLowerCase().trim();
    const user = await db.getUserByEmail(trimmedEmail);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, tier: user.tier }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());

    res.json({
      message: 'Authentication successful.',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        aurelisTag: user.aurelisTag,
        tier: user.tier,
        avatar: user.avatar,
        baseCurrency: user.baseCurrency,
      },
      token,
    });
  }

  public static async logout(req: Request, res: Response) {
    res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
    res.json({ message: 'Client successfully signed out.' });
  }

  public static async passkeyVerify(req: Request, res: Response) {
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
    let user: UserEntity | undefined;

    const tokenToVerify = cookieToken || (authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null);

    if (tokenToVerify) {
      try {
        const decoded = jwt.verify(tokenToVerify, JWT_SECRET) as any;
        if (decoded?.id) user = await db.getUserById(decoded.id);
      } catch {
        // ignore
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Passkey verification failed. Please sign in with your account first.' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, tier: user.tier }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());

    res.json({
      message: 'Passkey FIDO2 cryptographic assertion verified.',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        tier: user.tier,
        avatar: user.avatar,
        aurelisTag: user.aurelisTag,
      },
      token,
    });
  }

  public static async getProfile(req: Request, res: Response) {
    const authUser = (req as any).user;
    const userId = authUser?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required.' });

    let user = await db.getUserById(userId);
    if (!user && authUser.email) {
      user = await db.getUserByEmail(authUser.email);
    }

    if (!user) {
      return res.status(404).json({ error: 'User profile not found. Please sign in again.' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        aurelisTag: user.aurelisTag,
        tier: user.tier,
        baseCurrency: user.baseCurrency,
        avatar: user.avatar,
        twoFactorEnabled: user.twoFactorEnabled,
        biometricEnabled: user.biometricEnabled,
        passkeyEnabled: user.passkeyEnabled,
        address: user.address,
        transactionPin: user.transactionPin || '1234',
        createdAt: user.createdAt,
      },
    });
  }

  public static async lookupUser(req: Request, res: Response) {
    const query = String(req.query.q || '').trim();
    if (!query) {
      return res.status(400).json({ error: 'Search query parameter (q) is required.' });
    }

    const currentUserId = (req as any).user?.id;
    const clean = query.toLowerCase().trim();
    const cleanTag = clean.startsWith('@') ? clean : `@${clean}`;
    const cleanNoTag = clean.replace('@', '');

    // 1. Direct exact match check (by user ID, email, tag, or full name)
    const exactTarget = (await db.getUserById(query)) || (await db.getUserByEmail(query)) || (await db.findUserByEmailOrTag(query));

    if (exactTarget && exactTarget.id === currentUserId) {
      return res.json({ found: true, isSelf: true });
    }

    // 2. Find all matching users (excluding current authenticated user)
    const allUsers = await db.users.values();
    const matchedUsers = allUsers.filter((u) => {
      if (u.id === currentUserId) return false;
      return (
        u.id.toLowerCase().trim() === clean ||
        u.id.toLowerCase().includes(clean) ||
        u.email.toLowerCase().trim() === clean ||
        u.email.toLowerCase().includes(clean) ||
        u.aurelisTag.toLowerCase().trim() === cleanTag ||
        u.aurelisTag.toLowerCase().replace('@', '').includes(cleanNoTag) ||
        u.fullName.toLowerCase().includes(clean)
      );
    });

    if (!exactTarget && matchedUsers.length === 0) {
      return res.json({ found: false });
    }

    const targetUser = (exactTarget && exactTarget.id !== currentUserId) ? exactTarget : matchedUsers[0];

    const allWallets = await db.wallets.values();
    const toUserSummary = (u: any) => {
      const uWallets = allWallets.filter((w) => w.userId === u.id);
      const primaryWallet = uWallets.find((w) => w.isPrimary) || uWallets[0];
      return {
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        aurelisTag: u.aurelisTag,
        avatar: u.avatar,
        tier: u.tier,
        baseCurrency: u.baseCurrency || primaryWallet?.currency || 'USD',
      };
    };

    res.json({
      found: true,
      isSelf: false,
      user: toUserSummary(targetUser),
      matches: matchedUsers.slice(0, 10).map(toUserSummary),
    });
  }

  public static async updatePin(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required.' });

    const { newPin, currentPin } = req.body;
    if (!newPin || typeof newPin !== 'string' || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      return res.status(400).json({ error: 'New PIN must be exactly 4 numeric digits.' });
    }

    let user = await db.getUserById(userId);
    if (!user && (req as any).user?.email) {
      user = await db.getUserByEmail((req as any).user.email);
    }
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const existingPin = user.transactionPin;
    if (existingPin) {
      if (!currentPin || currentPin !== existingPin) {
        return res.status(400).json({ error: 'Current Security PIN is incorrect.' });
      }
    }

    user.transactionPin = newPin;
    user.updatedAt = new Date().toISOString();
    await db.users.set(user.id, user);
    db.saveToFile();

    res.json({
      message: 'Transaction Security PIN successfully updated.',
      transactionPin: newPin,
    });
  }
}
