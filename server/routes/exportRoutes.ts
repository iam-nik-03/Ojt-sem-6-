import express from 'express';
import { generateProjectDoc } from '../services/exportService';

const router = express.Router();

router.get('/generate-doc', async (req, res) => {
  try {
    const buffer = await generateProjectDoc();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename=project-documentation.docx');
    res.send(buffer);
  } catch (err) {
    console.error('Failed to generate project documentation:', err);
    res.status(500).json({ error: 'Failed to generate project documentation' });
  }
});

export default router;
