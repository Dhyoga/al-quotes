import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { requireApiKey } from '../lib/auth.js';
import { registerTools } from '../lib/mcp-tools.js';

const router = express.Router();
router.use(requireApiKey);

router.all('/', async (req, res, next) => {
  try {
    const server = new McpServer({ name: 'remindeen', version: '1.0.0' });
    registerTools(server, req.userId!);

    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

    res.on('close', () => {
      transport.close();
      server.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    next(error);
  }
});

export default router;
