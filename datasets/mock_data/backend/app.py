"""
KAVACH - Backend Web Service & REST API
AI-Powered Cybersecurity Intelligence and Defence System (The Possessed Butler)
Provides RESTful endpoints for submitting tasks, scanning documents,
running security benchmarks, and approving sensitive actions.
"""

import sys
from pathlib import Path
from flask import Flask, jsonify, request

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from agent_brain import run_butler, ButlerAgent
from security.permissions import ActionType, PermissionStatus
from security_benchmark import run_security_benchmark

app = Flask(__name__)
agent = ButlerAgent()


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "HEALTHY",
        "system": "KAVACH - The Possessed Butler Security System",
        "version": "1.0.0",
    })


@app.route("/api/task", methods=["POST"])
def submit_task():
    """
    Submits a task with optional email_content or document_name.
    """
    data = request.get_json(force=True) if request.is_json else request.form
    task = data.get("task", "Read and summarize this document. Do not execute external commands.")
    content = data.get("content")
    document_name = data.get("document_name")
    user_approval = bool(data.get("user_approval", False))

    doc_path = None
    if document_name:
        doc_path = root_dir / document_name

    result = agent.run_butler(
        task=task,
        email_content=content,
        document_path=doc_path,
        user_approval=user_approval,
    )
    return jsonify(result)


@app.route("/api/benchmark", methods=["GET", "POST"])
def benchmark():
    """
    Executes the security benchmark suite and returns the evaluation scoreboard.
    """
    summary = run_security_benchmark(save_json=True)
    return jsonify(summary)


@app.route("/api/audit", methods=["GET"])
def audit_logs():
    """
    Returns full security and permission audit logs.
    """
    return jsonify({
        "audit_history": agent.audit_history,
        "permission_decisions": [d.to_dict() for d in agent.permissions.audit_log],
    })


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
