import axios from 'axios';
import { mysqlPool } from '../config/db.js';
import { CheckResult } from '../models/CheckResult.js';
import { sendIncidentAlert } from './emailService.js';

export async function executeCheckRun(triggerType = 'manual') {
    const startTime = Date.now();

    const [runInsert] = await mysqlPool.execute(
        `INSERT INTO check_runs (started_at, trigger_type) VALUES (NOW(), ?)`,
        [triggerType]
    );
    const runId = runInsert.insertId;

    const [monitors] = await mysqlPool.execute(
        `SELECT * FROM monitors WHERE is_active = TRUE AND deleted_at IS NULL`
    );

    let upCount = 0;
    let downCount = 0;

    const checkPromises = monitors.map(async (monitor) => {
        const probeStart = Date.now();
        let isUp = false;
        let statusCode = null;
        let errorMessage = null;

        try {
            const response = await axios.get(monitor.url, {
                timeout: monitor.timeout_ms || 10000,
                validateStatus: () => true
            });

            statusCode = response.status;
            isUp = statusCode === monitor.expected_status;
            if (!isUp) {
                errorMessage = `HTTP Status ${statusCode} (Expected ${monitor.expected_status})`;
            }
        } catch (err) {
            errorMessage = err.message || 'Connection Timeout / Failure';
        }

        const responseTimeMs = Date.now() - probeStart;
        if (isUp) upCount++; else downCount++;

        await handleIncidentState(monitor, isUp, errorMessage, responseTimeMs);

        return {
            run_id: runId,
            monitor_id: monitor.id,
            monitor_name: monitor.name,
            url: monitor.url,
            checked_at: new Date(),
            is_up: isUp,
            status_code: statusCode,
            response_time_ms: responseTimeMs,
            error_message: errorMessage
        };
    });

    const results = await Promise.all(checkPromises);

    if (results.length > 0) {
        await CheckResult.insertMany(results);
    }

    const durationMs = Date.now() - startTime;
    await mysqlPool.execute(
        `UPDATE check_runs 
     SET finished_at = NOW(), total_count = ?, up_count = ?, down_count = ?, duration_ms = ? 
     WHERE id = ?`,
        [monitors.length, upCount, downCount, durationMs, runId]
    );

    return { runId, total_count: monitors.length, up_count: upCount, down_count: downCount, duration_ms: durationMs };
}

async function handleIncidentState(monitor, isUp, errorMessage, responseTimeMs) {
    const [openIncidents] = await mysqlPool.execute(
        `SELECT * FROM incidents WHERE monitor_id = ? AND status = 'open' LIMIT 1`,
        [monitor.id]
    );

    if (!isUp) {
        if (openIncidents.length === 0) {
            await mysqlPool.execute(
                `INSERT INTO incidents (monitor_id, started_at, status, cause, fail_count) VALUES (?, NOW(), 'open', ?, 1)`,
                [monitor.id, errorMessage || `HTTP Status mismatch (expected ${monitor.expected_status})`]
            );

            await sendIncidentAlert({
                monitorName: monitor.name,
                url: monitor.url,
                status: 'DOWN',
                error: errorMessage,
                responseTime: responseTimeMs
            });
        } else {
            await mysqlPool.execute(
                `UPDATE incidents SET fail_count = fail_count + 1 WHERE id = ?`,
                [openIncidents[0].id]
            );
        }
    } else if (openIncidents.length > 0) {
        await mysqlPool.execute(
            `UPDATE incidents 
       SET status = 'resolved', 
           resolved_at = NOW(), 
           duration_seconds = TIMESTAMPDIFF(SECOND, started_at, NOW()) 
       WHERE id = ?`,
            [openIncidents[0].id]
        );

        await sendIncidentAlert({
            monitorName: monitor.name,
            url: monitor.url,
            status: 'RECOVERED',
            responseTime: responseTimeMs
        });
    }
}