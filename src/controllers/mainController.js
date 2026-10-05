import { mysqlPool } from '../config/db.js';
import { CheckResult } from '../models/CheckResult.js';
import { executeCheckRun } from '../services/checkerService.js';

export const getMonitors = async (req, res) => {
    const { is_active } = req.query;
    let query = 'SELECT * FROM monitors WHERE deleted_at IS NULL';
    const params = [];
    if (is_active !== undefined) {
        query += ' AND is_active = ?';
        params.push(is_active === 'true');
    }
    const [monitors] = await mysqlPool.execute(query, params);
    res.json(monitors);
};

export const createMonitor = async (req, res) => {
    const { name, url, expected_status = 200, timeout_ms = 10000 } = req.body;
    const [result] = await mysqlPool.execute(
        'INSERT INTO monitors (name, url, expected_status, timeout_ms) VALUES (?, ?, ?, ?)',
        [name, url, expected_status, timeout_ms]
    );
    res.status(201).json({ id: result.insertId, name, url, expected_status, timeout_ms, is_active: true });
};

export const updateMonitor = async (req, res) => {
    const { id } = req.params;
    const { name, url, expected_status, timeout_ms } = req.body;
    await mysqlPool.execute(
        'UPDATE monitors SET name = ?, url = ?, expected_status = ?, timeout_ms = ? WHERE id = ? AND deleted_at IS NULL',
        [name, url, expected_status, timeout_ms, id]
    );
    res.json({ message: 'Monitor updated successfully' });
};

export const toggleMonitorActive = async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;
    await mysqlPool.execute('UPDATE monitors SET is_active = ? WHERE id = ?', [is_active, id]);
    res.json({ message: `Monitor set to ${is_active}` });
};

export const deleteMonitor = async (req, res) => {
    const { id } = req.params;
    await mysqlPool.execute('UPDATE monitors SET deleted_at = NOW() WHERE id = ?', [id]);
    res.status(204).send();
};

export const runCheck = async (req, res) => {
    const result = await executeCheckRun('manual');
    res.status(201).json(result);
};

export const getLatestResults = async (req, res) => {
    const [monitors] = await mysqlPool.execute('SELECT id FROM monitors WHERE is_active = TRUE AND deleted_at IS NULL');
    const monitorIds = monitors.map(m => m.id);
    const results = await CheckResult.aggregate([
        { $match: { monitor_id: { $in: monitorIds } } },
        { $sort: { checked_at: -1 } },
        { $group: { _id: "$monitor_id", latest: { $first: "$$ROOT" } } }
    ]);
    res.json(results.map(r => r.latest));
};

export const getCheckRuns = async (req, res) => {
    const limit = Number(req.query.limit) || 20;
    const [runs] = await mysqlPool.execute('SELECT * FROM check_runs ORDER BY started_at DESC LIMIT ?', [limit]);
    res.json(runs);
};

export const getIncidents = async (req, res) => {
    const { status } = req.query;
    let query = 'SELECT * FROM incidents';
    const params = [];
    if (status) {
        query += ' WHERE status = ?';
        params.push(status);
    }
    query += ' ORDER BY started_at DESC';
    const [incidents] = await mysqlPool.execute(query, params);
    res.json(incidents);
};

export const getSummary = async (req, res) => {
    const [totalMonitors] = await mysqlPool.execute('SELECT COUNT(*) as count FROM monitors WHERE deleted_at IS NULL');
    const [openIncidents] = await mysqlPool.execute('SELECT COUNT(*) as count FROM incidents WHERE status = "open"');

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const stats = await CheckResult.aggregate([
        { $match: { checked_at: { $gte: twentyFourHoursAgo } } },
        { $group: { _id: null, total: { $sum: 1 }, up: { $sum: { $cond: ["$is_up", 1, 0] } } } }
    ]);

    const uptime24h = stats.length > 0 ? ((stats[0].up / stats[0].total) * 100).toFixed(2) : 100;
    res.json({
        total_monitors: totalMonitors[0].count,
        open_incidents: openIncidents[0].count,
        uptime_24h_percent: Number(uptime24h)
    });
};