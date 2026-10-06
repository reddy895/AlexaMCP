import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { agentService } from '../agent/agentService.js';
import { ollamaService } from '../services/ollamaService.js';
import { mcpClient } from '../services/mcpClient.js';

export const apiRouter = Router();

// Validation schema for investigation request
const InvestigateInputSchema = z.object({
  content: z.string().min(1, 'Content cannot be empty').max(20000, 'Content exceeds maximum length of 20,000 characters')
});

// GET /api/health
apiRouter.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'alexa-digital-detective-backend',
    timestamp: new Date().toISOString()
  });
});

// GET /api/ollama/health
apiRouter.get('/ollama/health', async (req: Request, res: Response) => {
  try {
    const health = await ollamaService.checkHealth();
    res.json(health);
  } catch (err: any) {
    res.status(500).json({
      available: false,
      error: 'Failed to check Ollama health'
    });
  }
});

// POST /api/investigate
apiRouter.post('/investigate', async (req: Request, res: Response) => {
  try {
    const parsed = InvestigateInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid input',
        details: parsed.error.issues.map(i => i.message)
      });
      return;
    }

    const investigationId = await agentService.startInvestigation(parsed.data.content);
    res.status(202).json({
      investigation_id: investigationId,
      status: 'started'
    });
  } catch (err: any) {
    console.error('[API] /investigate error:', err.message);
    res.status(500).json({
      error: 'An internal error occurred while initiating the investigation'
    });
  }
});

// GET /api/investigate/:id
apiRouter.get('/investigate/:id', (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const inv = agentService.getInvestigation(id);
    if (!inv) {
      res.status(404).json({ error: `Investigation ${id} not found` });
      return;
    }

    res.json(inv);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve investigation' });
  }
});

// GET /api/investigate/:id/activity
apiRouter.get('/investigate/:id/activity', (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const activity = agentService.getActivity(id);
    res.json({
      investigation_id: id,
      tool_calls: activity
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve investigation activity' });
  }
});

// GET /api/investigate/:id/report
apiRouter.get('/investigate/:id/report', (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const report = agentService.getReport(id);
    if (!report) {
      res.status(404).json({ error: `Report for ${id} not found or still pending` });
      return;
    }
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve report' });
  }
});

// GET /api/investigations
apiRouter.get('/investigations', (req: Request, res: Response) => {
  try {
    const list = agentService.listInvestigations(30);
    res.json({
      count: list.length,
      investigations: list
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list investigations' });
  }
});
