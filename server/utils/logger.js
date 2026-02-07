import pool from '../db/index.js';

// Log an activity (fire-and-forget, async internally)
export function logActivity(userId, action, entityType = null, entityId = null, details = null) {
    // Use standard UTC timestamp - Frontend handles conversion to IST
    const timestamp = new Date().toISOString();

    // Fire-and-forget: don't await, let it run in background
    pool.query(`
        INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6)
    `, [userId, action, entityType, entityId, details, timestamp])
        .catch(err => console.error('Failed to log activity:', err));
}

// Get recent activity logs
export async function getActivityLogs(limit = 50) {
    const result = await pool.query(`
        SELECT 
            al.*,
            u.username,
            u.display_name
        FROM activity_logs al
        JOIN users u ON al.user_id = u.id
        ORDER BY al.timestamp DESC
        LIMIT $1
    `, [limit]);
    return result.rows;
}
