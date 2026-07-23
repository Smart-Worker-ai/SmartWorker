#!/usr/bin/env python3
"""Background worker for processing SMS queue jobs."""

import sys
import signal
import structlog
from rq import Worker
from redis import Redis

import config
from sms_queue import redis_conn, sms_queue

log = structlog.get_logger("sms_worker")


def setup_signal_handlers(worker):
    """Graceful shutdown on SIGTERM/SIGINT."""
    def handle_shutdown(signum, frame):
        log.info("shutdown_signal", signum=signum)
        worker.request_stop()
        sys.exit(0)

    signal.signal(signal.SIGTERM, handle_shutdown)
    signal.signal(signal.SIGINT, handle_shutdown)


if __name__ == "__main__":
    log.info("sms_worker_start")

    # Create worker and start processing queue
    worker = Worker([sms_queue], connection=redis_conn)
    setup_signal_handlers(worker)

    try:
        worker.work(
            with_scheduler=False,
            job_monitoring_interval=5,
            disable_default_exception_handler=False,
        )
    except Exception as e:
        log.error("worker_crash", error=str(e), exc_info=True)
        sys.exit(1)
