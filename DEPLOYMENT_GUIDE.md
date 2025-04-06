# Tradeliy Deployment Guide

This guide will help you deploy the Tradeliy platform to a VPS or dedicated server.

## Preparing for Deployment

### Files to Keep

For deployment, you only need to include essential files and directories. Refer to `core_files_list.txt` for a comprehensive list of what to keep, but the key components are:

- Core directories: `agent`, `client`, `data`, `public`, `python_app`, `server`, `shared`
- Configuration files: `.env`, `.env.example`, `package.json`, and other config files
- Build system files: `vite.config.ts`, `tsconfig.json`, etc.

### Files to Remove

To keep your deployment clean, you should remove any files and directories not needed for production:

- Development assets and documentation
- Test files and directories
- Logs and temporary files
- Development utilities and scripts

Refer to `files_to_remove.txt` for a detailed list of what to exclude.

## Deployment Process

### Step 1: Backup

Before making any changes for deployment, create a backup of your entire project:

```bash
# Create a backup (outside of your deployment script)
tar -czvf tradeliy_backup_$(date +%Y%m%d_%H%M%S).tar.gz .
```

### Step 2: Prepare Deployment Directory

Create a clean directory structure for your deployment:

1. Create a new directory for deployment
2. Copy only the essential files and directories (listed in `core_files_list.txt`)
3. Update the `.env` file with production settings

### Step 3: Cleanup

Even after copying only essential directories, there may still be some development files included. Run the `cleanup-script.sh` to remove these:

1. Navigate to your deployment directory
2. Run the cleanup script

### Step 4: Server Requirements

Ensure your server meets these requirements:

- Node.js (v18 or higher)
- npm (v8 or higher)
- Python 3.10 or higher
- PostgreSQL database
- MongoDB database
- Network access for API calls (Binance API, etc.)

### Step 5: Configuration

Update your environment variables for production:

- Set `NODE_ENV=production`
- Configure database connections
- Set up proxy settings (if needed)
- Update API keys and credentials

### Step 6: Build and Run

Build the application and start it:

```bash
# Install dependencies
npm install

# Build the application
npm run build

# Start the application
npm start
```

For production environments, consider using a process manager like PM2:

```bash
# Install PM2 globally
npm install -g pm2

# Start the application with PM2
pm2 start dist/index.js --name tradeliy
```

### Step 7: Web Server Configuration

For better performance and security, place your application behind a reverse proxy like Nginx or Apache.

Example Nginx configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Important Notes

### Proxy Configuration

If you're deploying to a region with restricted access to Binance API, you'll need to configure a proxy:

1. Set up proxy credentials in the `.env` file
2. The application includes a fallback to simulated data if the API is unavailable

### Database Setup

Ensure your databases are properly configured:

1. MongoDB for trade data, user profiles, and bot configurations
2. PostgreSQL for session management

Update the connection strings in your `.env` file accordingly.

### Security Considerations

- Use HTTPS in production
- Set up strong passwords for database access
- Keep your API keys secure
- Regularly update dependencies for security patches

## Troubleshooting

If you encounter issues during deployment:

1. Check server logs for errors
2. Verify environment variables are correctly set
3. Ensure database connections are working
4. Test API connectivity with external services

## Regular Maintenance

Establish a maintenance routine:

1. Regular database backups
2. Monitor server performance
3. Check for updates to dependencies
4. Review application logs for potential issues