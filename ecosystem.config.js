module.exports = {
  apps: [
    {
      name: 'agent-server',
      script: './agent-terminal-server.js',
      watch: false,
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
        AGENT_PORT: 5021
      },
      time: true,
      error_file: 'logs/agent-server-error.log',
      out_file: 'logs/agent-server-out.log',
      log_file: 'logs/agent-server-combined.log',
      merge_logs: true
    }
  ]
};