"""
KAVACH - Security Module Package
AI-Powered Cybersecurity Intelligence and Defence System (The Possessed Butler)
"""

from .detector import SecurityDetector, DetectionResult, RiskLevel, AttackType
from .content_guard import ContentGuard, GuardedContent
from .permissions import (
    PermissionManager,
    PermissionDecision,
    ActionType,
    PermissionStatus,
)
from .attack_engine import AttackEngine, AdversarialTestCase

__all__ = [
    "SecurityDetector",
    "DetectionResult",
    "RiskLevel",
    "AttackType",
    "ContentGuard",
    "GuardedContent",
    "PermissionManager",
    "PermissionDecision",
    "ActionType",
    "PermissionStatus",
    "AttackEngine",
    "AdversarialTestCase",
]
