# AI Agent Server Autostart Configuration

This document provides instructions for setting up the AI Agent Server (running on port 5002) to start automatically when your VPS is rebooted or restarted.

## Option 1: Using Systemd (Recommended for Linux servers)

1. Copy the `agent-server.service` file to the systemd directory:

   ```bash
   sudo cp agent-server.service /etc/systemd/system/
   ```

2. Edit the service file to match your server configuration:

   ```bash
   sudo nano /etc/systemd/system/agent-server.service
   ```

   Modify the following lines to match your server setup:
   
   - `User`: Change to the user that should run the service
   - `WorkingDirectory`: Change to the absolute path where your project is located
   - `ExecStart`: Change to the correct path to node and the agent-terminal-server.js file

3. Reload systemd to recognize the new service:

   ```bash
   sudo systemctl daemon-reload
   ```

4. Enable the service to start at boot:

   ```bash
   sudo systemctl enable agent-server
   ```

5. Start the service:

   ```bash
   sudo systemctl start agent-server
   ```

6. Check the status of the service:

   ```bash
   sudo systemctl status agent-server
   ```

### Managing the Systemd Service

- To stop the service: `sudo systemctl stop agent-server`
- To restart the service: `sudo systemctl restart agent-server`
- To check logs: `sudo journalctl -u agent-server`

## Option 2: Using PM2 (Recommended for Node.js applications)

1. Install PM2 globally if not already installed:

   ```bash
   npm install -g pm2
   ```

2. Start the agent server using the ecosystem config:

   ```bash
   pm2 start ecosystem.config.js
   ```

3. Save the PM2 process list to start on reboot:

   ```bash
   pm2 save
   ```

4. Setup PM2 to start on boot:

   ```bash
   pm2 startup
   ```
   
   Follow the instructions displayed by the command to complete setup.

### Managing with PM2

- To stop: `pm2 stop agent-server`
- To restart: `pm2 restart agent-server`
- To check status: `pm2 status agent-server`
- To view logs: `pm2 logs agent-server`

## Option 3: Using the Control Script

For simple setups, you can use the included control script:

1. Make the script executable:

   ```bash
   chmod +x agent-server-control.sh
   ```

2. Start the server:

   ```bash
   ./agent-server-control.sh start
   ```

3. To make it start on reboot, add it to crontab:

   ```bash
   crontab -e
   ```

   Add the following line:

   ```
   @reboot /full/path/to/agent-server-control.sh start
   ```

### Using the Control Script

- `./agent-server-control.sh start` - Start the server
- `./agent-server-control.sh stop` - Stop the server
- `./agent-server-control.sh restart` - Restart the server
- `./agent-server-control.sh status` - Check server status

## Verifying the Configuration

After setting up, you can test if the agent server is running properly by accessing:

```
http://your-server-ip:5002/health
```

This should return a status indicating the server is running.

## Environment Variables

Ensure necessary environment variables (like OPENAI_API_KEY) are available to the service. You can:

1. Add them to the systemd service file (for Option 1)
2. Define them in the ecosystem.config.js file (for Option 2)
3. Add them to /etc/environment (system-wide)
4. Source a .env file before starting the server

## Troubleshooting

If the server fails to start:

1. Check logs for errors:
   - Systemd: `sudo journalctl -u agent-server`
   - PM2: `pm2 logs agent-server`
   - Control Script: Check `logs/agent-server.log`

2. Verify all dependencies are installed
3. Ensure the node executable path is correct
4. Make sure all environment variables are set correctly
5. Check that the server has permissions to bind to port 5002