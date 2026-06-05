import { getProfile, getEarnings, getHistory } from '../services/worker.service.js';

async function fetchProfile(request, response) {
  try {
    const user = await getProfile(request.user.userId);
    response.json({ user });
  } catch (err) {
    response.status(err.statusCode ?? 500).json({ message: err.message });
  }
}

async function fetchEarnings(request, response) {
  try {
    const earnings = await getEarnings(request.user.userId);
    response.json(earnings);
  } catch (err) {
    response.status(err.statusCode ?? 500).json({ message: err.message });
  }
}

async function fetchHistory(request, response) {
  try {
    const history = getHistory(request.user.userId);
    response.json({ history });
  } catch (err) {
    response.status(err.statusCode ?? 500).json({ message: err.message });
  }
}

export { fetchProfile, fetchEarnings, fetchHistory };
