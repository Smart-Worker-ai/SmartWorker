import {
  getDashboardStats,
  getAllCustomers, setCustomerBlocked, deleteCustomer,
  getAllWorkers, setWorkerBlocked, setWorkerVerified, createWorker, deleteWorker,
  getAllBookings,
  getAllGrievances, resolveGrievance,
} from '../services/admin.service.js';

function getStats(request, response) {
  try {
    response.json(getDashboardStats());
  } catch (err) {
    response.status(500).json({ error: err.message });
  }
}

function listCustomers(request, response) {
  response.json({ customers: getAllCustomers() });
}

function blockCustomer(request, response) {
  try {
    const customer = setCustomerBlocked(request.params.id, true);
    response.json({ customer });
  } catch (err) {
    response.status(err.statusCode ?? 500).json({ error: err.message });
  }
}

function unblockCustomer(request, response) {
  try {
    const customer = setCustomerBlocked(request.params.id, false);
    response.json({ customer });
  } catch (err) {
    response.status(err.statusCode ?? 500).json({ error: err.message });
  }
}

function listWorkers(request, response) {
  response.json({ workers: getAllWorkers() });
}

function removeWorker(request, response) {
  try {
    response.json(deleteWorker(request.params.id));
  } catch (err) {
    response.status(err.statusCode ?? 500).json({ error: err.message });
  }
}

function removeCustomer(request, response) {
  try {
    response.json(deleteCustomer(request.params.id));
  } catch (err) {
    response.status(err.statusCode ?? 500).json({ error: err.message });
  }
}

function addWorker(request, response) {
  try {
    const worker = createWorker(request.body);
    response.status(201).json({ worker });
  } catch (err) {
    response.status(err.statusCode ?? 500).json({ error: err.message });
  }
}

function blockWorker(request, response) {
  try {
    const worker = setWorkerBlocked(request.params.id, true);
    response.json({ worker });
  } catch (err) {
    response.status(err.statusCode ?? 500).json({ error: err.message });
  }
}

function unblockWorker(request, response) {
  try {
    const worker = setWorkerBlocked(request.params.id, false);
    response.json({ worker });
  } catch (err) {
    response.status(err.statusCode ?? 500).json({ error: err.message });
  }
}

function verifyWorker(request, response) {
  try {
    const worker = setWorkerVerified(request.params.id, true);
    response.json({ worker });
  } catch (err) {
    response.status(err.statusCode ?? 500).json({ error: err.message });
  }
}

function listBookings(request, response) {
  const { status } = request.query;
  response.json({ bookings: getAllBookings({ status }) });
}

function listGrievances(request, response) {
  const { status } = request.query;
  response.json({ grievances: getAllGrievances({ status }) });
}

function patchGrievance(request, response) {
  const { status, adminNote } = request.body;
  if (!status) return response.status(400).json({ error: 'status is required.' });
  try {
    const grievance = resolveGrievance(request.params.id, { status, adminNote });
    response.json({ grievance });
  } catch (err) {
    response.status(err.statusCode ?? 500).json({ error: err.message });
  }
}

export {
  getStats,
  listCustomers, blockCustomer, unblockCustomer, removeCustomer,
  listWorkers, addWorker, blockWorker, unblockWorker, verifyWorker, removeWorker,
  listBookings,
  listGrievances, patchGrievance,
};
