import { Router, Request, Response } from 'express';
import { connectToMongoDB, UserModel } from '../utils/mongodb';
import { connect } from 'http2';

const router = Router();

// Endpoint to run database migrations
router.post('/run-migration', async (req: Request, res: Response) => {
  try {
    console.log('Starting database migration...');
    
    // Connect to MongoDB
    await connectToMongoDB();
    
    // Check for the isSuperAdmin field in all user documents
    // If it doesn't exist, add it and set it to false
    const updateResult = await UserModel.updateMany(
      { isSuperAdmin: { $exists: false } },
      { $set: { isSuperAdmin: false } }
    );
    
    console.log(`Updated ${updateResult.modifiedCount} user documents to add isSuperAdmin field`);
    
    // Set admin@example.com to have the isSuperAdmin flag
    const adminUpdateResult = await UserModel.updateOne(
      { email: 'admin@example.com' },
      { $set: { isSuperAdmin: true, isAdmin: true } }
    );
    
    console.log(`Updated admin user with superadmin privileges: ${adminUpdateResult.modifiedCount > 0 ? 'Success' : 'Already updated'}`);
    
    // Return success
    return res.json({ 
      success: true, 
      message: 'Database migration completed successfully', 
      results: {
        usersUpdated: updateResult.modifiedCount,
        adminUpdated: adminUpdateResult.modifiedCount
      } 
    });
  } catch (error) {
    console.error('Error running database migration:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Database migration failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;