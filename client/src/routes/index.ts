/**
 * Routes Module Index
 * 
 * This file exports all route components.
 */

import integratedAgentRoutes from './integrated-agent-routes';

// Re-export all route components
export { integratedAgentRoutes };

// Default export for convenience
export default {
  agent: integratedAgentRoutes
};