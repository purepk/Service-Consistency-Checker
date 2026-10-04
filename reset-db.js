import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { mysqlPool } from './src/config/db.js';
import { CheckResult } from './src/models/CheckResult.js';

dotenv.config();

async function clearAllData() {
  try {
    console.log('[RESET] Clearing test data from databases...');

    // 1. Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (mongoUri) {
      await mongoose.connect(mongoUri);
      console.log('✓ Connected to MongoDB');
    } else {
      console.warn('⚠️ MONGO_URI missing in .env, skipping Mongo cleanup.');
    }

    // 2. Clear MySQL Tables
    await mysqlPool.execute('SET FOREIGN_KEY_CHECKS = 0;');
    await mysqlPool.execute('TRUNCATE TABLE incidents;');
    await mysqlPool.execute('TRUNCATE TABLE check_runs;');
    await mysqlPool.execute('TRUNCATE TABLE monitors;');
    await mysqlPool.execute('SET FOREIGN_KEY_CHECKS = 1;');
    console.log('✓ MySQL tables cleared (incidents, check_runs, monitors)');

    // 3. Clear MongoDB Check Results
    if (mongoose.connection.readyState === 1) {
      await CheckResult.deleteMany({});
      console.log('✓ MongoDB collection cleared (checkresults)');
    }

    console.log('[SUCCESS] All test data removed successfully.');
  } catch (err) {
    console.error('[ERROR] Failed to clear test data:', err.message);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    await mysqlPool.end();
    process.exit(0);
  }
}

clearAllData();