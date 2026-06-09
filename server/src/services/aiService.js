import env from '../config/env.js';
import Attendance from '../models/Attendance.js';
import Worker from '../models/Worker.js';
import WageRun from '../models/WageRun.js';
import Site from '../models/Site.js';

let claudeClient = null;

const getClaudeClient = async () => {
  if (claudeClient) return claudeClient;
  if (!env.CLAUDE_API_KEY) {
    console.warn('Claude API not configured. AI features will return mock results.');
    return null;
  }
  return { apiKey: env.CLAUDE_API_KEY };
};

const callClaude = async (systemPrompt, userMessage) => {
  const client = await getClaudeClient();
  if (!client) {
    return { mock: true, content: '[AI Mock] Claude API not configured. Enable CLAUDE_API_KEY for real responses.' };
  }
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': client.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Claude API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return { mock: false, content: data.content[0].text };
  } catch (error) {
    console.error('Claude API call failed:', error.message);
    return { mock: true, content: `[AI Error] ${error.message}` };
  }
};

export const resolveWageDispute = async (workerPhone, disputeText) => {
  const worker = await Worker.findOne({ phone: workerPhone }).lean();
  if (!worker) {
    return {
      found: false,
      message: 'Worker not found in the system. Please register the worker first.',
    };
  }

  const attendance = await Attendance.find({
    workerId: worker._id,
    date: { $gte: new Date(new Date().setDate(new Date().getDate() - 90)) },
  }).sort({ date: -1 }).lean();

  const wageRuns = await WageRun.find({
    siteId: worker.siteId,
    'workers.workerId': worker._id,
  }).sort({ year: -1, month: -1 }).limit(3).lean();

  const site = await Site.findById(worker.siteId).lean();

  const systemPrompt = `You are a wage dispute resolution assistant for SiteBook, an Indian construction labour management system.
Your role is to analyse wage disputes between construction workers and contractors.

You will be given:
1. Worker details (name, skill, agreed rate)
2. Attendance records for the last 90 days
3. Wage run records showing what was paid
4. The worker's complaint text

You must:
1. Identify the exact discrepancy between what was earned and what was paid
2. Calculate the precise amount owed (in ₹)
3. Generate TWO outputs:
   a) A worker-facing message in simple Hindi/English (mix is fine) explaining what is owed
   b) A contractor-facing message with the same evidence, structured for review

Be precise with numbers. If records are insufficient, say so. Do not make up data.`;

  const workerData = {
    name: worker.name,
    skill: worker.skill,
    agreedRate: worker.agreedRate,
    siteName: site?.name || 'Unknown',
  };

  const attendanceSummary = attendance.map(a => ({
    date: a.date,
    status: a.status,
    overtimeHours: a.overtimeHours,
  }));

  const wageSummary = wageRuns.map(w => ({
    month: w.month,
    year: w.year,
    status: w.status,
    entries: (w.workers || []).filter(ew => String(ew.workerId) === String(worker._id)),
  }));

  const userMessage = JSON.stringify({
    disputeText,
    worker: workerData,
    attendanceRecords: attendanceSummary,
    wageRecords: wageSummary,
  });

  const result = await callClaude(systemPrompt, userMessage);

  return {
    found: true,
    worker: workerData,
    analysis: result.mock ? null : result.content,
    mockResult: result.mock ? `Mock resolution for ${worker.name}'s dispute: Based on records, standard resolution would apply.` : null,
    rawData: { attendanceCount: attendance.length, wageRunCount: wageRuns.length },
  };
};

export const runAnomalyDetection = async (contractorId) => {
  const sites = await Site.find({ contractorId, status: 'active' }).lean();
  const anomalies = [];

  const sitePromises = sites.map(async (site) => {
    const siteAnomalies = [];

    // Check consecutive attendance for all workers at this site in parallel
    const workers = await Worker.find({ siteId: site._id, isActive: true }).lean();

    const workerPromises = workers.map(async (worker) => {
      const recentAttendance = await Attendance.find({
        workerId: worker._id,
        date: { $gte: new Date(Date.now() - 35 * 86400000) },
      }).sort({ date: -1 }).lean();

      const consecutivePresent = getConsecutiveCount(recentAttendance);
      if (consecutivePresent >= 30) {
        siteAnomalies.push({
          type: 'no_weekly_rest',
          severity: 'high',
          siteName: site.name,
          workerName: worker.name,
          detail: `${worker.name} marked present ${consecutivePresent} consecutive days — possible labour law violation under weekly rest provisions.`,
          date: new Date(),
        });
      }
    });
    await Promise.all(workerPromises);

    // Attendance drop detection: compare last 7 days vs the 7 days before that
    const now = Date.now();
    const recentWeek = await Attendance.find({
      siteId: site._id,
      date: { $gte: new Date(now - 7 * 86400000) },
    }).lean();

    const previousWeek = await Attendance.find({
      siteId: site._id,
      date: { $gte: new Date(now - 14 * 86400000), $lt: new Date(now - 7 * 86400000) },
    }).lean();

    const recentWorkers = new Set(recentWeek.map(a => String(a.workerId)));
    const prevWorkers = new Set(previousWeek.map(a => String(a.workerId)));

    if (prevWorkers.size > 0) {
      const dropRate = ((prevWorkers.size - recentWorkers.size) / prevWorkers.size) * 100;
      if (dropRate >= 40) {
        siteAnomalies.push({
          type: 'attendance_drop',
          severity: 'critical',
          siteName: site.name,
          detail: `Attendance dropped ${Math.round(dropRate)}% at ${site.name} in the last week — possible accident or labour dispute.`,
          date: new Date(),
        });
      }
    }

    return siteAnomalies;
  });

  const nested = await Promise.all(sitePromises);
  for (const arr of nested) anomalies.push(...arr);

  return anomalies;
};

const getConsecutiveCount = (records) => {
  if (!records.length) return 0;
  let count = 0;
  for (const r of records) {
    if (r.status === 'absent') break;
    count++;
  }
  return count;
};

export const getBudgetForecast = async (contractorId) => {
  const sites = await Site.find({ contractorId }).lean();
  const forecasts = [];

  for (const site of sites) {
    const wageRuns = await WageRun.find({ siteId: site._id })
      .sort({ year: -1, month: -1 })
      .limit(6)
      .lean();

    if (wageRuns.length < 3) {
      forecasts.push({
        siteName: site.name,
        siteId: site._id,
        forecast: 'Insufficient data for forecasting (need at least 3 months of wage runs).',
      });
      continue;
    }

    const avgMonthlyCost = wageRuns.reduce((s, w) => s + w.totalLabourCost, 0) / wageRuns.length;
    const budgetRemaining = site.budget - avgMonthlyCost;

    const systemPrompt = 'You are a budget forecasting assistant for SiteBook construction management. Analyse the data and provide a 1-paragraph forecast.';
    const data = {
      siteName: site.name,
      siteBudget: site.budget,
      monthsOfData: wageRuns.length,
      averageMonthly: Math.round(avgMonthlyCost),
      budgetRemaining: Math.round(budgetRemaining),
      recentRun: wageRuns[0] ? { month: wageRuns[0].month, year: wageRuns[0].year, total: wageRuns[0].totalLabourCost } : null,
    };

    const result = await callClaude(systemPrompt, JSON.stringify(data));
    forecasts.push({
      siteName: site.name,
      siteId: site._id,
      avgMonthlyCost: Math.round(avgMonthlyCost),
      budgetRemaining: Math.round(budgetRemaining),
      monthsOfData: wageRuns.length,
      forecast: result.content,
      mockResult: result.mock,
    });
  }

  return forecasts;
};
