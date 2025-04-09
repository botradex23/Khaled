/**
 * Agent Module Index
 * 
 * This is the main entry point for the Agent module.
 * It exports all the agent functionality in a single interface.
 */

import agentController from './agent-controller';
import fileService from './file-service';
import openaiService from './openai-service';

export {
  agentController,
  fileService,
  openaiService
};

// Default export is the controller for convenience
export default agentController;