import { Response } from 'express';
import { db } from '../db/database';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { CardEntity } from '../types';

export class CardController {
  public static async getCards(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required.' });
    const list = await db.cards.findByUser(userId);
    res.json({ cards: list });
  }

  public static async issueCard(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required.' });
    const { tier, type } = req.body;

    const user = await db.users.get(userId);
    const suffix = Math.floor(1000 + Math.random() * 9000).toString();

    const newCard: CardEntity = {
      id: `card_${Date.now()}`,
      userId,
      type: type || 'physical',
      tier: tier || 'Black Titanium',
      cardNumber: `4821 9084 3192 ${suffix}`,
      maskedNumber: `•••• ${suffix}`,
      holderName: user ? user.fullName.toUpperCase() : 'DBS CLIENT',
      expiry: '08/31',
      cvv: Math.floor(100 + Math.random() * 900).toString(),
      isFrozen: false,
      isPrimary: false,
      monthlyLimit: tier === 'Black Titanium' ? 50000 : 25000,
      currentSpent: 0,
      contactlessEnabled: true,
      onlinePurchasesEnabled: true,
      atmWithdrawalsEnabled: type === 'physical',
      pin: Math.floor(1000 + Math.random() * 9000).toString(),
      createdAt: new Date().toISOString(),
    };

    await db.cards.set(newCard.id, newCard);
    db.saveToFile();

    res.status(201).json({
      message: 'Card successfully provisioned and activated.',
      card: newCard,
    });
  }

  public static async toggleFreeze(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params as { id: string };
    const card = await db.cards.get(id);

    if (!card || card.userId !== req.user?.id) {
      return res.status(404).json({ error: 'Card not found.' });
    }

    card.isFrozen = !card.isFrozen;
    await db.cards.set(card.id, card);
    db.saveToFile();

    res.json({
      message: card.isFrozen ? 'Card has been frozen.' : 'Card has been unfrozen.',
      card,
    });
  }

  public static async updateLimits(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params as { id: string };
    const { monthlyLimit } = req.body;
    const card = await db.cards.get(id);

    if (!card || card.userId !== req.user?.id) {
      return res.status(404).json({ error: 'Card not found.' });
    }

    card.monthlyLimit = parseFloat(monthlyLimit) || card.monthlyLimit;
    await db.cards.set(card.id, card);
    db.saveToFile();

    res.json({
      message: 'Monthly limit updated.',
      card,
    });
  }

  public static async revealDetails(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params as { id: string };
    const card = await db.cards.get(id);

    if (!card || card.userId !== req.user?.id) {
      return res.status(404).json({ error: 'Card not found.' });
    }

    // In production, this requires biometric authorization signature
    res.json({
      cardNumber: card.cardNumber,
      cvv: card.cvv,
      expiry: card.expiry,
      pin: card.pin,
    });
  }
}
