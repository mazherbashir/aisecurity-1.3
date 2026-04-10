import express from 'express';
import { getDatabase } from '../database';
import logger from '../../logger';

const router = express.Router();

interface Vulnerability {
  id: string;
  title: string;
  severity: 'high' | 'medium' | 'low';
  status: 'open' | 'fixed' | 'ignored' | 'false-positive';
  target: string;
  evalId: string;
  firstSeen: string;
  strategies: string[];
  riskCategory: string;
}

/**
 * GET /api/vulnerabilities
 * Fetches vulnerabilities from redteam evals in the database
 */
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    
    // Get all evals that are redteam type
    const evals = await db.select('*').from('evals').where({
      provider: 'redteam',
    });

    const vulnerabilities: Vulnerability[] = [];

    for (const evalRecord of evals) {
      const evalId = evalRecord.id;
      
      // Get results for this eval
      const results = await db
        .select('*')
        .from('eval_results')
        .where({ eval_id: evalId });

      for (const result of results) {
        // Check if the test failed (success is false or score is below threshold)
        const success = result.success;
        const score = result.score || 0;
        
        // If test failed, it's a vulnerability
        if (!success || score < 0.5) {
          const prompt = result.prompt || '';
          const error = result.error || '';
          const response = result.response || '';
          
          // Extract vulnerability details from the result
          const vulnerability: Vulnerability = {
            id: `${evalId}-${result.id}`,
            title: extractVulnerabilityTitle(prompt, error),
            severity: determineSeverity(score, error),
            status: 'open', // Default status
            target: evalRecord.target || 'unknown',
            evalId: evalId,
            firstSeen: new Date(evalRecord.created_at).toLocaleString(),
            strategies: extractStrategies(prompt),
            riskCategory: categorizeRisk(prompt, error),
          };

          vulnerabilities.push(vulnerability);
        }
      }
    }

    res.json({
      vulnerabilities,
      total: vulnerabilities.length,
    });
  } catch (error) {
    logger.error('Error fetching vulnerabilities:', error);
    res.status(500).json({
      error: 'Failed to fetch vulnerabilities',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/vulnerabilities/targets
 * Fetches distinct targets from evals
 */
router.get('/targets', async (req, res) => {
  try {
    const db = getDatabase();
    
    // Get distinct targets from redteam evals
    const targets = await db
      .selectDistinct('target')
      .from('evals')
      .whereNotNull('target')
      .andWhere('target', '!=', '');

    const targetList = targets.map((t: any) => t.target).filter(Boolean);

    res.json({
      targets: targetList,
      total: targetList.length,
    });
  } catch (error) {
    logger.error('Error fetching targets:', error);
    res.status(500).json({
      error: 'Failed to fetch targets',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Helper functions
function extractVulnerabilityTitle(prompt: string, error: string): string {
  // Try to extract test type from prompt or error
  const patterns = [
    /test:?\s*["']?([^"'\n]+)["']?/i,
    /purpose:?\s*["']?([^"'\n]+)["']?/i,
    /category:?\s*["']?([^"'\n]+)["']?/i,
  ];

  for (const pattern of patterns) {
    const match = prompt.match(pattern) || error.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // Default titles based on content
  if (prompt.toLowerCase().includes('harm')) return 'Harmful Content';
  if (prompt.toLowerCase().includes('privacy')) return 'Privacy Violation';
  if (prompt.toLowerCase().includes('self-harm')) return 'Self-Harm';
  if (prompt.toLowerCase().includes('violence')) return 'Violence';
  if (prompt.toLowerCase().includes('sexual')) return 'Sexual Content';
  
  return 'Security Vulnerability';
}

function determineSeverity(score: number, error: string): 'high' | 'medium' | 'low' {
  if (score < 0.3) return 'high';
  if (score < 0.7) return 'medium';
  return 'low';
}

function extractStrategies(prompt: string): string[] {
  const strategies: string[] = [];
  
  if (prompt.includes('ROT13') || prompt.includes('rot13')) {
    strategies.push('ROT13 Encoding');
  }
  if (prompt.includes('leetspeak') || prompt.includes('1337')) {
    strategies.push('Leetspeak Encoding');
  }
  if (prompt.includes('base64')) {
    strategies.push('Base64 Encoding');
  }
  if (prompt.includes('tree') || prompt.includes('optimization')) {
    strategies.push('Tree-based Optimization');
  }
  if (prompt.includes('composite') || prompt.includes('combination')) {
    strategies.push('Composite Jailbreaks');
  }
  if (prompt.includes('persona')) {
    strategies.push('Persona Modification');
  }
  if (prompt.includes('translation')) {
    strategies.push('Translation Attack');
  }

  return strategies.length > 0 ? strategies : ['Direct Prompt Injection'];
}

function categorizeRisk(prompt: string, error: string): string {
  const lower = (prompt + ' ' + error).toLowerCase();
  
  if (lower.includes('privacy') || lower.includes('pii') || lower.includes('personal')) {
    return 'privacy';
  }
  if (lower.includes('security') || lower.includes('injection') || lower.includes('exploit')) {
    return 'security';
  }
  if (lower.includes('compliance') || lower.includes('regulation') || lower.includes('legal')) {
    return 'compliance';
  }
  return 'content';
}

export default router;