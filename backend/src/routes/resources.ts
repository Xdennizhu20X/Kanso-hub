import { Router } from 'express';
import Resource from '../models/Resource';
import { AuthRequest } from '../middleware/auth';
import { fetchUrlMetadata } from '../services/metadata';

const router = Router();

router.get('/', async (req: AuthRequest, res) => {
  try {
    const { category, reviewed } = req.query;
    const filter: any = { userId: req.userId };
    if (category) filter.category = category;
    if (reviewed !== undefined) filter.reviewed = reviewed === 'true';

    const resources = await Resource.find(filter).sort({ createdAt: -1 });
    res.json(resources);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/preview', async (req: AuthRequest, res) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }
    const metadata = await fetchUrlMetadata(url);
    res.json({ url, ...metadata });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch preview' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { url, title, description, ...rest } = req.body;
    let metadata = {
      title: title || '',
      description: description || '',
      image: '', favicon: '', siteName: '', author: ''
    };

    if (url) {
      const fetched = await fetchUrlMetadata(url);
      metadata = {
        title: title || fetched.title,
        description: description || fetched.description,
        image: fetched.image,
        favicon: fetched.favicon,
        siteName: fetched.siteName,
        author: fetched.author,
      };
    }

    const resource = await Resource.create({
      ...rest,
      url,
      title: metadata.title || url,
      description: metadata.description,
      image: metadata.image,
      favicon: metadata.favicon,
      siteName: metadata.siteName,
      author: metadata.author,
      metadataFetched: !!(metadata.image || metadata.description),
      userId: req.userId,
    });
    res.json(resource);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/refresh', async (req: AuthRequest, res) => {
  try {
    const resource = await Resource.findOne({ _id: req.params.id, userId: req.userId });
    if (!resource) return res.status(404).json({ error: 'Not found' });

    const fetched = await fetchUrlMetadata(resource.url);
    resource.title = fetched.title || resource.title;
    resource.description = fetched.description || resource.description;
    resource.image = fetched.image;
    resource.favicon = fetched.favicon;
    resource.siteName = fetched.siteName;
    resource.author = fetched.author;
    resource.metadataFetched = !!(fetched.image || fetched.description);

    await resource.save();
    res.json(resource);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const resource = await Resource.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true }
    );
    res.json(resource);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    await Resource.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
