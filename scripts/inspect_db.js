import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT * FROM courses');
    console.log('Courses in DB:', JSON.stringify(res.rows, null, 2));
    
    const countRes = await client.query('SELECT COUNT(*) FROM videos');
    console.log('Total videos count:', countRes.rows[0]);

    const videoCats = await client.query('SELECT DISTINCT category FROM videos');
    console.log('Video categories:', videoCats.rows);

    const curriculums = await client.query('SELECT * FROM curriculums');
    console.log('Curriculums count:', curriculums.rows.length);

    client.release();
  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    await pool.end();
  }
}

main();
