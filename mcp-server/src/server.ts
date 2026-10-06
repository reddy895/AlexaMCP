import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

import {
  ClaimTypeSchema,
  ExtractClaimsInputSchema,
  InspectUrlInputSchema,
  AnalyzeMessageInputSchema,
  SearchEvidenceInputSchema,
  CrossReferenceInputSchema,
  CalculateRiskInputSchema,
  GenerateReportInputSchema,
  InvestigationVerdictSchema
} from './schemas/tools.js';

import { extractClaimsFromContent } from './tools/claimExtractor.js';
import { inspectUrlTool } from './tools/urlInspector.js';
import { analyzeMessageTool } from './tools/messageAnalyzer.js';
import { searchEvidenceTool } from './tools/evidenceSearcher.js';
import { crossReferenceTool } from './tools/crossReferencer.js';
import { calculateRiskTool } from './tools/riskCalculator.js';
import { generateReportTool } from './tools/reportGenerator.js';

dotenv.config();
const PORT = parseInt(process.env.MCP_PORT || '3000', 10);

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '2mb' }));

// Initialize MCP Server
const mcpServer = new McpServer({
  name: 'alexa-digital-detective-mcp',
  version: '1.0.0'
});

// TOOL 1: extract_claims
mcpServer.tool(
  'extract_claims',
  'Extract factual claims and indicators from the submitted content',
  {
    content: z.string().describe('Suspicious message, email, claim, or URL text')
  },
  async ({ content }) => {
    try {
      const result = extractClaimsFromContent(content);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Error extracting claims: ${err.message}` }]
      };
    }
  }
);

// TOOL 2: inspect_url
mcpServer.tool(
  'inspect_url',
  'Analyze URL structure, SSL/TLS, domain mismatch, redirects, and suspicious path/query patterns',
  {
    url: z.string().describe('Target URL to inspect')
  },
  async ({ url }) => {
    try {
      const result = await inspectUrlTool(url);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Error inspecting URL: ${err.message}` }]
      };
    }
  }
);

// TOOL 3: analyze_message
mcpServer.tool(
  'analyze_message',
  'Analyze text for urgency, threats, brand impersonation, financial/credential requests, and social engineering',
  {
    content: z.string().describe('The message content to analyze')
  },
  async ({ content }) => {
    try {
      const result = analyzeMessageTool(content);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Error analyzing message: ${err.message}` }]
      };
    }
  }
);

// TOOL 4: search_evidence
mcpServer.tool(
  'search_evidence',
  'Find independent and official evidence regarding submitted claims without fabricating citations',
  {
    query: z.string().describe('Search query for evidence'),
    claim: z.string().optional().describe('Specific claim being verified'),
    domain: z.string().optional().describe('Associated domain name')
  },
  async ({ query, claim, domain }) => {
    try {
      const result = await searchEvidenceTool({ query, claim, domain });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Error searching evidence: ${err.message}` }]
      };
    }
  }
);

// TOOL 5: cross_reference
mcpServer.tool(
  'cross_reference',
  'Compare original claims against URL findings, message indicators, and external evidence to classify as supported, contradicted, or uncertain',
  {
    claims: z.array(z.object({ text: z.string(), type: ClaimTypeSchema })).describe('List of claims'),
    url_findings: z.any().optional().describe('Output of inspect_url'),
    message_indicators: z.array(z.any()).optional().describe('Output of analyze_message'),
    external_evidence: z.array(z.any()).optional().describe('Output of search_evidence')
  },
  async ({ claims, url_findings, message_indicators, external_evidence }) => {
    try {
      const result = crossReferenceTool({
        claims,
        url_findings,
        message_indicators,
        external_evidence
      });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Error cross referencing: ${err.message}` }]
      };
    }
  }
);

// TOOL 6: calculate_risk
mcpServer.tool(
  'calculate_risk',
  'Calculate transparent risk score (0-100), confidence level, risk tier, and indicator breakdown',
  {
    claims: z.array(z.any()).optional().default([]),
    url_findings: z.any().optional(),
    message_indicators: z.array(z.any()).optional().default([]),
    cross_reference: z.any().optional(),
    evidence: z.array(z.any()).optional().default([])
  },
  async ({ claims, url_findings, message_indicators, cross_reference, evidence }) => {
    try {
      const result = calculateRiskTool({
        claims,
        url_findings,
        message_indicators,
        cross_reference,
        evidence
      });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Error calculating risk: ${err.message}` }]
      };
    }
  }
);

// TOOL 7: generate_investigation_report
mcpServer.tool(
  'generate_investigation_report',
  'Generate final structured investigation report with verdict, score, confidence, and recommendations',
  {
    verdict: InvestigationVerdictSchema,
    risk_score: z.number().min(0).max(100),
    confidence: z.enum(['low', 'medium', 'high']),
    summary: z.string(),
    evidence: z.array(z.string()),
    contradictions: z.array(z.string()).optional().default([]),
    uncertainties: z.array(z.string()).optional().default([]),
    recommendations: z.array(z.string()),
    sources: z.array(z.any()).optional().default([])
  },
  async (args) => {
    try {
      const result = generateReportTool(args as any);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Error generating report: ${err.message}` }]
      };
    }
  }
);

// Maintain active SSE transports for streamable HTTP transport
const transports = new Map<string, SSEServerTransport>();

// Streamable HTTP / Server-Sent Events Endpoint
const handleSseConnection = async (req: Request, res: Response) => {
  const transport = new SSEServerTransport('/messages', res);
  transports.set(transport.sessionId, transport);

  req.on('close', () => {
    transports.delete(transport.sessionId);
  });

  await mcpServer.connect(transport);
};

app.get('/sse', handleSseConnection);
app.get('/mcp', handleSseConnection);

// Message handling endpoint for SSE transport
const handleMessages = async (req: Request, res: Response) => {
  const sessionId = (req.query.sessionId as string) || (req.headers['x-session-id'] as string);
  const transport = sessionId ? transports.get(sessionId) : transports.values().next().value;

  if (!transport) {
    res.status(404).json({ error: 'MCP session not found' });
    return;
  }

  await transport.handlePostMessage(req, res, req.body);
};

app.post('/messages', handleMessages);
app.post('/mcp/messages', handleMessages);

// Health and Inspection API (for debugging & judges)
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'alexa-digital-detective-mcp',
    transport: 'streamable-http-sse',
    port: PORT,
    active_sessions: transports.size,
    tools: [
      'extract_claims',
      'inspect_url',
      'analyze_message',
      'search_evidence',
      'cross_reference',
      'calculate_risk',
      'generate_investigation_report'
    ]
  });
});

app.get('/tools', (req: Request, res: Response) => {
  res.json({
    count: 7,
    tools: [
      { name: 'extract_claims', description: 'Extract factual claims from submitted text' },
      { name: 'inspect_url', description: 'Analyze URL security, hostnames, and domain mismatch' },
      { name: 'analyze_message', description: 'Detect urgency, threats, and phishing language' },
      { name: 'search_evidence', description: 'Retrieve verified independent sources' },
      { name: 'cross_reference', description: 'Classify evidence as supported, contradicted, or uncertain' },
      { name: 'calculate_risk', description: 'Calculate transparent 0-100 risk score and breakdown' },
      { name: 'generate_investigation_report', description: 'Synthesize final structured investigation report' }
    ]
  });
});

app.listen(PORT, () => {
  console.log(`[MCP Server] Running on http://localhost:${PORT}`);
  console.log(`[MCP Server] Streamable HTTP SSE endpoint: http://localhost:${PORT}/sse (alias: /mcp)`);
});
