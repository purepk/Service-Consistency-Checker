const API = '/api/v1';
let latestProbes = {};
const CRON_INTERVAL_MS = 1 * 60 * 1000; // 5-minute interval matching cron schedule

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    refreshAll();
    startCountdownTimer();
    setInterval(refreshAll, 10000); // Poll dashboard data every 10 seconds
});

function setupEventListeners() {
    document.getElementById('runBtn').addEventListener('click', triggerRun);
    document.getElementById('openModalBtn').addEventListener('click', openModal);
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    document.getElementById('addForm').addEventListener('submit', saveMonitor);

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    window.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'r' && document.activeElement.tagName !== 'INPUT') {
            e.preventDefault();
            triggerRun();
        }
    });
}

// 1. Cron-Aligned Countdown Timer Function
function startCountdownTimer() {
    function updateTimer() {
        const now = Date.now();
        // Calculate next 5-minute boundary aligned with clock (00, 05, 10, 15...)
        const nextInterval = Math.ceil(now / CRON_INTERVAL_MS) * CRON_INTERVAL_MS;
        let remainingMs = nextInterval - now;

        if (remainingMs <= 0) {
            remainingMs = CRON_INTERVAL_MS;
            refreshAll(); // Auto refresh when interval resets
        }

        const totalSeconds = Math.floor(remainingMs / 1000);
        const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
        const seconds = String(totalSeconds % 60).padStart(2, '0');

        const timerEl = document.getElementById('nextCheckTimer');
        if (timerEl) {
            timerEl.innerText = `${minutes}:${seconds}`;
        }
    }

    updateTimer();
    setInterval(updateTimer, 1000);
}

async function refreshAll() {
    await Promise.all([
        loadSummary(),
        loadLatestProbes(),
        loadMonitors(),
        loadRuns(),
        loadIncidents()
    ]);
}

async function loadSummary() {
    try {
        const res = await fetch(`${API}/summary`);
        const data = await res.json();

        const incEl = document.getElementById('kpiIncidents');
        incEl.innerText = data.open_incidents;
        incEl.className = `text-2xl font-mono font-semibold ${data.open_incidents > 0 ? 'text-red-400' : 'text-zinc-100'}`;

        document.getElementById('kpiUptime').innerText = `${data.uptime_24h_percent}%`;
    } catch (err) {
        console.error('Summary fetch error:', err);
    }
}

async function loadLatestProbes() {
    try {
        const res = await fetch(`${API}/checks/latest`);
        const list = await res.json();
        latestProbes = {};
        list.forEach(p => latestProbes[p.monitor_id] = p);
    } catch (err) {
        console.error('Latest probes error:', err);
    }
}

async function loadMonitors() {
    try {
        const res = await fetch(`${API}/monitors`);
        const monitors = await res.json();
        const tbody = document.getElementById('monitorsTable');

        // 2. Count Active vs Disabled Monitors for KPI
        const activeCount = monitors.filter(m => m.is_active).length;
        const disabledCount = monitors.length - activeCount;

        document.getElementById('kpiActiveMonitors').innerText = activeCount;
        document.getElementById('kpiDisabledMonitors').innerText = disabledCount;

        if (monitors.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-zinc-500">No monitors registered yet. Click "+ ADD MONITOR".</td></tr>';
            return;
        }

        tbody.innerHTML = monitors.map(m => {
            const probe = latestProbes[m.id];
            const isUp = probe ? probe.is_up : null;

            // Enable/Disable State Badge
            const stateBadge = m.is_active
                ? '<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950/80 border border-emerald-800 text-emerald-400">ENABLED</span>'
                : '<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-900 border border-zinc-700 text-zinc-400">DISABLED</span>';

            // Health Status Badge
            let statusBadge = '<span class="text-zinc-500">PENDING</span>';
            if (!m.is_active) {
                statusBadge = '<span class="text-zinc-600">PAUSED</span>';
            } else if (isUp === true) {
                statusBadge = '<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-400"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> UP</span>';
            } else if (isUp === false) {
                statusBadge = '<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-950 border border-red-800 text-red-400"><span class="w-1.5 h-1.5 rounded-full bg-red-400"></span> DOWN</span>';
            }

            const latency = probe && m.is_active ? `${probe.response_time_ms}ms` : '--';

            // Dim row styling if monitor is disabled
            const rowClass = m.is_active
                ? 'hover:bg-zinc-900/40'
                : 'opacity-50 bg-zinc-950/40 hover:bg-zinc-900/20';

            return `
        <tr class="${rowClass} transition-opacity">
          <td class="p-3">${stateBadge}</td>
          <td class="p-3">${statusBadge}</td>
          <td class="p-3 font-semibold ${m.is_active ? 'text-zinc-100' : 'text-zinc-400'}">${m.name}</td>
          <td class="p-3 text-zinc-400">${m.url}</td>
          <td class="p-3 text-zinc-400">${m.expected_status}</td>
          <td class="p-3 font-semibold text-zinc-200">${latency}</td>
          <td class="p-3 text-right space-x-2">
            <button onclick="toggleActive(${m.id}, ${!m.is_active})" class="text-zinc-400 hover:text-zinc-100 font-semibold">
              ${m.is_active ? '[PAUSE]' : '[ENABLE]'}
            </button>
            <button onclick="deleteMonitor(${m.id})" class="text-red-400 hover:text-red-300">[DELETE]</button>
          </td>
        </tr>
      `;
        }).join('');
    } catch (err) {
        console.error('Monitors fetch error:', err);
    }
}

async function loadRuns() {
    try {
        const res = await fetch(`${API}/checks/runs?limit=10`);
        const runs = await res.json();
        const tbody = document.getElementById('runsTable');

        tbody.innerHTML = runs.map(r => `
      <tr class="hover:bg-zinc-900/40">
        <td class="p-3 text-zinc-400">#${r.id}</td>
        <td class="p-3"><span class="uppercase px-1.5 py-0.5 rounded border border-zinc-800 bg-zinc-900 text-zinc-300">${r.trigger_type}</span></td>
        <td class="p-3 text-zinc-400">${new Date(r.started_at).toLocaleString()}</td>
        <td class="p-3">${r.duration_ms ? r.duration_ms + 'ms' : '--'}</td>
        <td class="p-3"><span class="text-emerald-400">${r.up_count} UP</span> / <span class="${r.down_count > 0 ? 'text-red-400' : 'text-zinc-500'}">${r.down_count} DOWN</span></td>
      </tr>
    `).join('');
    } catch (err) {
        console.error('Runs fetch error:', err);
    }
}

async function loadIncidents() {
    try {
        const res = await fetch(`${API}/incidents`);
        const incidents = await res.json();
        const tbody = document.getElementById('incidentsTable');

        if (incidents.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-zinc-500">No incident logs found. System healthy.</td></tr>';
            return;
        }

        tbody.innerHTML = incidents.map(i => `
      <tr class="hover:bg-zinc-900/40">
        <td class="p-3 text-zinc-400">#${i.id}</td>
        <td class="p-3 text-zinc-300">Monitor #${i.monitor_id}</td>
        <td class="p-3">${i.status === 'open'
                ? '<span class="text-red-400 font-bold">[OPEN]</span>'
                : '<span class="text-emerald-400">[RESOLVED]</span>'}</td>
        <td class="p-3 text-zinc-400">${i.cause || 'Timeout'}</td>
        <td class="p-3 text-zinc-400">${new Date(i.started_at).toLocaleString()}</td>
        <td class="p-3 text-zinc-300">${i.fail_count}</td>
      </tr>
    `).join('');
    } catch (err) {
        console.error('Incidents fetch error:', err);
    }
}

async function triggerRun() {
    const btn = document.getElementById('runBtn');
    const log = document.getElementById('terminalOutput');
    btn.disabled = true;
    btn.innerText = 'EXECUTING...';
    log.innerText = '[EXEC] Dispatching parallel HTTP checks to monitors...';

    try {
        const res = await fetch(`${API}/checks/run`, { method: 'POST' });
        const data = await res.json();
        log.innerText = `[SUCCESS] Run #${data.runId} completed in ${data.duration_ms}ms. (${data.up_count} UP / ${data.down_count} DOWN)`;
        await refreshAll();
    } catch (err) {
        log.innerText = `[ERROR] Execution failed: ${err.message}`;
    } finally {
        btn.disabled = false;
        btn.innerText = 'RUN AUDIT';
    }
}

async function saveMonitor(e) {
    e.preventDefault();
    const body = {
        name: document.getElementById('mName').value,
        url: document.getElementById('mUrl').value,
        expected_status: Number(document.getElementById('mStatus').value),
        timeout_ms: Number(document.getElementById('mTimeout').value)
    };

    await fetch(`${API}/monitors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    closeModal();
    document.getElementById('addForm').reset();
    await refreshAll();
}

async function toggleActive(id, is_active) {
    await fetch(`${API}/monitors/${id}/active`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active })
    });
    await refreshAll();
}

async function deleteMonitor(id) {
    if (!confirm('Are you sure you want to remove this monitor?')) return;
    await fetch(`${API}/monitors/${id}`, { method: 'DELETE' });
    await refreshAll();
}

function switchTab(tab) {
    ['monitors', 'runs', 'incidents'].forEach(t => {
        document.getElementById(`view-${t}`).classList.add('hidden');
        const btn = document.getElementById(`tab-${t}`);
        btn.className = 'tab-btn pb-2 border-b-2 border-transparent text-zinc-400 hover:text-zinc-200';
    });
    document.getElementById(`view-${tab}`).classList.remove('hidden');
    document.getElementById(`tab-${tab}`).className = 'tab-btn pb-2 border-b-2 border-emerald-500 text-zinc-100 font-semibold';
}

function openModal() { document.getElementById('monitorModal').classList.replace('hidden', 'flex'); }
function closeModal() { document.getElementById('monitorModal').classList.replace('flex', 'hidden'); }