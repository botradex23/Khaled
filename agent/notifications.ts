/**
 * Notification Service
 * 
 * Handles sending notifications when issues are detected.
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { Notification } from './types';
import { logger } from './logger';

// Track sent notifications to avoid duplicates
const sentNotifications = new Set<string>();

/**
 * Send a notification
 */
export async function sendNotification(notification: Notification): Promise<boolean> {
  try {
    // Create a unique key for this notification
    const notificationKey = `${notification.level}:${notification.title}`;
    
    // Check if we've sent this notification recently to avoid spam
    if (sentNotifications.has(notificationKey)) {
      logger.debug('Skipping duplicate notification', { notification });
      return true;
    }
    
    // Log the notification
    logger.info('Sending notification', { notification });
    
    // Add to recent notifications (will prevent duplicates for 30 minutes)
    sentNotifications.add(notificationKey);
    setTimeout(() => {
      sentNotifications.delete(notificationKey);
    }, 30 * 60 * 1000); // 30 minutes
    
    // Write notification to log file
    const logDir = 'logs';
    
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const notificationLog = path.join(logDir, 'notifications.log');
    
    fs.appendFileSync(
      notificationLog,
      `[${new Date().toISOString()}] ${notification.level.toUpperCase()}: ${notification.title}\n` +
      `${notification.message}\n` +
      `${JSON.stringify(notification.details, null, 2)}\n\n`
    );
    
    // Check if telegram notifications are configured
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ADMIN_CHAT_ID) {
      await sendTelegramNotification(notification);
    }
    
    return true;
  } catch (error) {
    logger.error('Failed to send notification', { error, notification });
    return false;
  }
}

/**
 * Send a notification via Telegram
 */
async function sendTelegramNotification(notification: Notification): Promise<boolean> {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
    
    if (!botToken || !chatId) {
      logger.warn('Telegram notification failed: Missing bot token or chat ID');
      return false;
    }
    
    // Create message text
    const emoji = getNotificationEmoji(notification.level);
    const message = `${emoji} *${notification.title}*\n\n${notification.message}`;
    
    // Send telegram message
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    const response = await axios.post(url, {
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown'
    });
    
    if (response.status === 200) {
      logger.info('Telegram notification sent successfully');
      
      // If there are detailed details, send them as a second message
      if (notification.details) {
        const detailsStr = JSON.stringify(notification.details, null, 2);
        
        if (detailsStr.length > 0) {
          await axios.post(url, {
            chat_id: chatId,
            text: '```\n' + detailsStr + '\n```',
            parse_mode: 'Markdown'
          });
        }
      }
      
      return true;
    } else {
      logger.error('Telegram notification failed', { response });
      return false;
    }
  } catch (error) {
    logger.error('Failed to send Telegram notification', { error });
    return false;
  }
}

/**
 * Get emoji for notification level
 */
function getNotificationEmoji(level: string): string {
  switch (level) {
    case 'info':
      return 'ℹ️';
    case 'warning':
      return '⚠️';
    case 'error':
      return '❌';
    case 'critical':
      return '🚨';
    default:
      return '🔔';
  }
}