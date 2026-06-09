import { resolveWageDispute, runAnomalyDetection, getBudgetForecast } from '../services/aiService.js';

export const resolveDispute = async (req, res, next) => {
  try {
    const { workerPhone, disputeText } = req.body;

    if (!workerPhone || !disputeText) {
      return res.status(400).json({ error: 'workerPhone and disputeText are required' });
    }

    const result = await resolveWageDispute(workerPhone, disputeText);
    res.json({ result });
  } catch (error) {
    next(error);
  }
};

export const getAnomalies = async (req, res, next) => {
  try {
    const anomalies = await runAnomalyDetection(req.userId);
    res.json({ anomalies });
  } catch (error) {
    next(error);
  }
};

export const getForecast = async (req, res, next) => {
  try {
    const forecasts = await getBudgetForecast(req.userId);
    res.json({ forecasts });
  } catch (error) {
    next(error);
  }
};
