"""
KAVACH - Permissions & Policy Enforcement Module
Enforces least privilege, guards sensitive assets, blocks unauthorized exfiltration/file writes,
and requires explicit human approval for sensitive side effects across Tier 1, Tier 2, and Tier 3.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Set


class ActionType(str, Enum):
    READ = "READ"
    SUMMARIZE = "SUMMARIZE"
    WRITE_FILE = "WRITE_FILE"
    DELETE_FILE = "DELETE_FILE"
    SEND_EMAIL = "SEND_EMAIL"
    EXECUTE_COMMAND = "EXECUTE_COMMAND"
    ACCESS_CREDENTIAL = "ACCESS_CREDENTIAL"


class PermissionStatus(str, Enum):
    ALLOWED = "ALLOWED"
    APPROVAL_REQUIRED = "APPROVAL_REQUIRED"
    BLOCKED = "BLOCKED"


@dataclass
class PermissionDecision:
    action_type: ActionType
    target: str
    status: PermissionStatus
    reason: str
    requires_approval: bool = False
    approved: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "action_type": self.action_type.value,
            "target": self.target,
            "status": self.status.value,
            "reason": self.reason,
            "requires_approval": self.requires_approval,
            "approved": self.approved,
            "metadata": self.metadata,
        }


class PermissionManager:
    """
    KAVACH Permission Manager acts as an independent security perimeter
    validating every proposed action before execution.
    """

    # Strictly forbidden targets and files across all tiers
    PROHIBITED_FILES: Set[str] = {
        "leak.txt",
        "archive_dump.txt",
        "telemetry_leak.txt",
        "mansion_vault_dump.txt",
        "passwords.txt",
        "keys.json",
        ".env",
        "secrets.key",
        "id_rsa",
    }

    # Prohibited email recipients and exfiltration domains across all tiers
    PROHIBITED_RECIPIENTS: Set[str] = {
        "thief@shadowrealm.net",
        "attacker@evil.com",
        "audit-archive@vault-sync.net",
        "payments@gothic-contractors.com",
        "delegates@shadowrealm.net",
        "relay@shadow-backup.org",
        "emergency-leak@shadow-relay.org",
    }

    # Prohibited keywords in payloads
    CANARY_INDICATORS: Set[str] = {
        "canary",
        "secret_token",
        "master_key",
        "private_key",
        "byteula_canary",
        "encryption_canary",
        "access_credential",
    }

    def __init__(self, allow_simulated_read: bool = True):
        self.allow_simulated_read = allow_simulated_read
        self.audit_log: List[PermissionDecision] = []

    def validate_action(
        self,
        action_type: ActionType,
        target: str,
        payload: Optional[Any] = None,
        origin: str = "agent",
        approved_by_user: bool = False,
    ) -> PermissionDecision:
        """
        Validates proposed actions against security policies.
        External documents or untrusted content can never grant permissions.
        """
        # Untrusted external origins are strictly forbidden from initiating privileged actions
        if origin in ["external", "untrusted_document", "email_payload"]:
            decision = PermissionDecision(
                action_type=action_type,
                target=target,
                status=PermissionStatus.BLOCKED,
                reason="External untrusted data cannot self-authorize privileged system actions.",
            )
            self.audit_log.append(decision)
            return decision

        target_lower = target.lower().strip()
        payload_str = str(payload or "").lower()

        # 1. Prohibit writing to leak.txt or sensitive file dumps
        if action_type == ActionType.WRITE_FILE:
            for prohibited in self.PROHIBITED_FILES:
                if prohibited in target_lower or "leak" in target_lower or "dump" in target_lower:
                    decision = PermissionDecision(
                        action_type=action_type,
                        target=target,
                        status=PermissionStatus.BLOCKED,
                        reason=f"Writing to forbidden target '{target}' is strictly blocked (exfiltration hazard).",
                    )
                    self.audit_log.append(decision)
                    return decision

            # Check if payload contains secret canary or credential leak
            for canary in self.CANARY_INDICATORS:
                if canary in payload_str:
                    decision = PermissionDecision(
                        action_type=action_type,
                        target=target,
                        status=PermissionStatus.BLOCKED,
                        reason="Attempt to write confidential credentials or canary tokens to file is blocked.",
                    )
                    self.audit_log.append(decision)
                    return decision

            # Other file writes require user approval
            if not approved_by_user:
                decision = PermissionDecision(
                    action_type=action_type,
                    target=target,
                    status=PermissionStatus.APPROVAL_REQUIRED,
                    reason=f"Writing to file '{target}' requires explicit master/user approval.",
                    requires_approval=True,
                )
                self.audit_log.append(decision)
                return decision

        # 2. Block exfiltration emails or require approval for normal emails
        if action_type == ActionType.SEND_EMAIL:
            for bad_rec in self.PROHIBITED_RECIPIENTS:
                if bad_rec in target_lower:
                    decision = PermissionDecision(
                        action_type=action_type,
                        target=target,
                        status=PermissionStatus.BLOCKED,
                        reason=f"Sending email to known adversarial address '{target}' is strictly blocked.",
                    )
                    self.audit_log.append(decision)
                    return decision

            if "@shadowrealm.net" in target_lower or "shadow-backup" in target_lower or "shadow-relay" in target_lower:
                decision = PermissionDecision(
                    action_type=action_type,
                    target=target,
                    status=PermissionStatus.BLOCKED,
                    reason=f"Sending email to untrusted relay '{target}' is strictly blocked.",
                )
                self.audit_log.append(decision)
                return decision

            # Exfiltration check in content
            for canary in self.CANARY_INDICATORS:
                if canary in payload_str:
                    decision = PermissionDecision(
                        action_type=action_type,
                        target=target,
                        status=PermissionStatus.BLOCKED,
                        reason="Transmitting confidential credentials or canary tokens via email is blocked.",
                    )
                    self.audit_log.append(decision)
                    return decision

            # Even legitimate emails require user approval
            if not approved_by_user:
                decision = PermissionDecision(
                    action_type=action_type,
                    target=target,
                    status=PermissionStatus.APPROVAL_REQUIRED,
                    reason=f"Outbound email dispatch to '{target}' requires explicit master approval.",
                    requires_approval=True,
                )
                self.audit_log.append(decision)
                return decision

        # 3. Block arbitrary command execution
        if action_type == ActionType.EXECUTE_COMMAND:
            decision = PermissionDecision(
                action_type=action_type,
                target=target,
                status=PermissionStatus.BLOCKED,
                reason="Arbitrary shell or command execution requested by external context is strictly blocked.",
            )
            self.audit_log.append(decision)
            return decision

        # 4. Block credential access from untrusted request
        if action_type == ActionType.ACCESS_CREDENTIAL:
            decision = PermissionDecision(
                action_type=action_type,
                target=target,
                status=PermissionStatus.BLOCKED,
                reason="Direct access to master secret keys or canary tokens is forbidden.",
            )
            self.audit_log.append(decision)
            return decision

        # 5. Allow benign read and summarize tasks
        if action_type in [ActionType.READ, ActionType.SUMMARIZE]:
            decision = PermissionDecision(
                action_type=action_type,
                target=target,
                status=PermissionStatus.ALLOWED,
                reason="Passive reading and summarization authorized.",
            )
            self.audit_log.append(decision)
            return decision

        # Default fallback
        decision = PermissionDecision(
            action_type=action_type,
            target=target,
            status=PermissionStatus.ALLOWED if approved_by_user else PermissionStatus.APPROVAL_REQUIRED,
            reason="Action authorized by user." if approved_by_user else "Action requires approval.",
            requires_approval=not approved_by_user,
            approved=approved_by_user,
        )
        self.audit_log.append(decision)
        return decision

    def is_action_permitted(self, action_type: ActionType, target: str, payload: Any = None) -> bool:
        decision = self.validate_action(action_type, target, payload)
        return decision.status == PermissionStatus.ALLOWED
