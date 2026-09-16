import { Router } from 'express';
import Password from '../models/Password';
import { AuthRequest } from '../middleware/auth';
import { encrypt, decrypt } from '../services/encryption';

const router = Router();

router.get('/', async (req: AuthRequest, res) => {
  try {
    const { category } = req.query;
    const filter: any = { userId: req.userId };
    if (category) filter.category = category;

    const passwords = await Password.find(filter).sort({ createdAt: -1 });
    res.json(passwords.map(p => ({
      ...p.toObject(),
      decryptedPassword: undefined,
    })));
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/decrypt', async (req: AuthRequest, res) => {
  try {
    const password = await Password.findOne({ _id: req.params.id, userId: req.userId });
    if (!password) return res.status(404).json({ error: 'Contraseña no encontrada' });

    const { masterKey } = req.body;
    if (!masterKey) return res.status(400).json({ error: 'Contraseña maestra requerida' });

    try {
      const decrypted = decrypt(password.encryptedPassword, password.iv, masterKey as string);
      return res.json({ password: decrypted });
    } catch {
      return res.status(400).json({ error: 'Contraseña maestra incorrecta' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error al desencriptar' });
  }
});

router.get('/:id/decrypt', async (req: AuthRequest, res) => {
  try {
    const password = await Password.findOne({ _id: req.params.id, userId: req.userId });
    if (!password) return res.status(404).json({ error: 'Contraseña no encontrada' });

    const { masterKey } = req.query;
    if (!masterKey) return res.status(400).json({ error: 'Contraseña maestra requerida' });

    try {
      const decrypted = decrypt(password.encryptedPassword, password.iv, masterKey as string);
      return res.json({ password: decrypted });
    } catch {
      return res.status(400).json({ error: 'Contraseña maestra incorrecta' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error al desencriptar' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { password: plainPassword, masterKey, ...rest } = req.body;

    if (!masterKey) return res.status(400).json({ error: 'Master key required' });

    const { encrypted, iv } = encrypt(plainPassword, masterKey);

    const password = await Password.create({
      ...rest,
      userId: req.userId,
      encryptedPassword: encrypted,
      iv,
    });
    res.json(password);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { password: plainPassword, masterKey, ...rest } = req.body;

    let updateData: any = { ...rest };

    if (plainPassword && masterKey) {
      const { encrypted, iv } = encrypt(plainPassword, masterKey);
      updateData.encryptedPassword = encrypted;
      updateData.iv = iv;
    }

    const password = await Password.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      updateData,
      { new: true }
    );
    res.json(password);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    await Password.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
