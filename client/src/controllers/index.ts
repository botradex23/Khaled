/**
 * Controllers Module Index
 * 
 * This file exports all controller components.
 */

import agentController, * as agentNamedExports from './agent-controller';

// Re-export controllers
export { agentController };

// Re-export all named exports from individual controller files
export const agent = {
  ...agentNamedExports,
  default: agentController
};

// Export a combined controllers object as default
export default {
  agent: agentController
};