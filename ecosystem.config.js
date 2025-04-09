module.exports = {
  apps: [{
    name: "ml-api",
    script: "./python_app/run_flask_service.py",
    interpreter: "python",
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: "1G",
    env: {
      PORT: 5001,
      FLASK_ENV: "production",
      PYTHONUNBUFFERED: "1",
      USE_PROXY: "false",
      FALLBACK_TO_DIRECT: "true"
    },
    log_date_format: "YYYY-MM-DD HH:mm:ss",
    error_file: "./logs/ml-api-error.log",
    out_file: "./logs/ml-api-output.log"
  },
  {
    name: "direct-agent-server",
    script: "./direct-agent-server.js",
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: "1G",
    env: {
      PORT: 3021,
      NODE_ENV: "production"
    },
    log_date_format: "YYYY-MM-DD HH:mm:ss",
    error_file: "./logs/direct-agent-server-error.log",
    out_file: "./logs/direct-agent-server-output.log"
  }]
};