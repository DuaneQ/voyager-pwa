import { https } from 'firebase-functions/v2';
import prisma from '../db/prismaClient';

// Example HTTPS callable function that returns itineraries for a user
export const listItineraries = https.onRequest(async (req, res) => {
  try {
    const userId = req.query.userId as string | undefined;
    if (!userId) {
      res.status(400).json({ success: false, message: 'userId required' });
      return;
    }

    const items = await prisma.itinerary.findMany({ where: { userId } });
    res.json({ success: true, data: items });
    return;
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: String(err) });
    return;
  }
});
