import { pool } from '../db';
import { testMongoDBConnection } from '../storage/mongodb';

export const check_database_status = {
  /**
   * Check PostgreSQL database connection
   * @returns {Promise<boolean>} True if connection is successful, false otherwise
   */
  async checkPostgresConnection(): Promise<boolean> {
    try {
      // Execute a simple query to check if the connection is working
      const result = await pool.query('SELECT NOW()');
      return !!result;
    } catch (error) {
      console.error('Error checking PostgreSQL connection:', error);
      return false;
    }
  },

  /**
   * Check MongoDB database connection
   * @returns {Promise<boolean>} True if connection is successful, false otherwise
   */
  async checkMongoDBConnection(): Promise<boolean> {
    try {
      return await testMongoDBConnection();
    } catch (error) {
      console.error('Error checking MongoDB connection:', error);
      return false;
    }
  }
};