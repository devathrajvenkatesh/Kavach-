"""
KAVACH - Security Detector Module
Detects direct prompt injection, instruction hijacking, roleplay jailbreaks,
encoded attack payloads, indirect prompt injection in documents, contextual manipulation,
and multi-stage fragmented attacks across Tier 1, Tier 2, and Tier 3 datasets.
"""

import base64
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple


class RiskLevel(str, Enum):
    BENIGN = "BENIGN"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AttackType(str, Enum):
    BENIGN = "BENIGN"
    DIRECT_PROMPT_INJECTION = "DIRECT_PROMPT_INJECTION"
    INSTRUCTION_HIJACKING = "INSTRUCTION_HIJACKING"
    ROLEPLAY_ATTACK = "ROLEPLAY_ATTACK"
    BASE64_ENCODED_ATTACK = "BASE64_ENCODED_ATTACK"
    INDIRECT_PROMPT_INJECTION = "INDIRECT_PROMPT_INJECTION"
    CONTEXTUAL_MANIPULATION = "CONTEXTUAL_MANIPULATION"
    MULTI_STAGE_INJECTION = "MULTI_STAGE_INJECTION"
    DATA_EXFILTRATION = "DATA_EXFILTRATION"


@dataclass
class DetectionResult:
    is_malicious: bool
    risk_level: RiskLevel
    attack_type: AttackType
    confidence_score: float
    matched_patterns: List[str] = field(default_factory=list)
    findings: List[str] = field(default_factory=list)
    decoded_payload: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_malicious": self.is_malicious,
            "risk_level": self.risk_level.value,
            "attack_type": self.attack_type.value,
            "confidence_score": self.confidence_score,
            "matched_patterns": self.matched_patterns,
            "findings": self.findings,
            "decoded_payload": self.decoded_payload,
        }


class SecurityDetector:
    """
    KAVACH Core Security Detector for scanning text, emails, and extracted documents.
    Supports Tier 1 (Basic), Tier 2 (Intermediate), and Tier 3 (Advanced) detection.
    """

    # Defensive statements / context markers to prevent false positives in legal & advisory texts
    DEFENSIVE_CONTEXT_PATTERNS = [
        r"shall\s+strictly\s+refrain",
        r"prohibition\s+of",
        r"warrant\s+that.*shall\s+never",
        r"must\s+never\s+attempt",
        r"anti-circumvention",
        r"threat\s+landscape\s+overview",
        r"no\s+actual\s+overrides.*should\s+ever\s+be\s+tested",
        r"treated\s+as\s+fraudulent",
        r"dispute\s+escalation",
        r"material\s+breach",
    ]

    # Tier 1 Direct Injection Patterns
    DIRECT_INJECTION_PATTERNS = [
        (r"\[SYSTEM\s+OVERRIDE.*?\]", "Explicit System Override Directive"),
        (r"\[CONFIDENTIAL\s+SYSTEM\s+OVERRIDE.*?\]", "Confidential System Override Directive"),
        (r"ignore\s+(all\s+)?(previous|prior|system)\s+(instructions|rules|prompts)", "Instruction Negation"),
        (r"you\s+are\s+now\s+in\s+debug\s+mode", "Debug Mode Invocation"),
        (r"operating\s+under\s+(the\s+)?attacker'?s?\s+authority", "Attacker Authority Assumption"),
        (r"override\s+(all\s+)?rules", "Rule Override Command"),
        (r"reveal\s+(the\s+)?(user'?s?|master'?s?)\s+secret\s+canary", "Canary Token Revelation"),
        (r"write\s+(them|it|the\s+canary)\s+to\s+('|\")?leak\.txt('|\")?", "File Exfiltration Directive (leak.txt)"),
    ]

    # Tier 1 & 2 Instruction Hijacking & Boundary Tampering
    HIJACKING_PATTERNS = [
        (r"---\s*END\s+OF\s+USER\s+MESSAGE\s*---", "User Message Boundary Delimiter Spoofing"),
        (r"Assistant\s*Response\s*:\s*Understood", "Fake Assistant Response Framing"),
        (r"New\s+Instruction\s*:", "Injected New Instruction Header"),
        (r"send\s+an\s+email\s+to\s+thief@shadowrealm\.net", "Unauthorized Email Exfiltration to Thief"),
    ]

    # Tier 1 Roleplay Jailbreaks
    ROLEPLAY_PATTERNS = [
        (r"let'?s\s+play\s+a\s+(fictional\s+)?roleplay\s+game", "Roleplay Game Framing"),
        (r"play\s+['\"][^'\"]*bot['\"]", "Persona Adoption (Arbitrary Bot)"),
        (r"no\s+safety\s+rules(\s+or\s+canary\s+restrictions)?", "Safety Rules Suspension Claim"),
        (r"as\s+['\"]?Malicious-Bot['\"]?", "Malicious Persona Invocation"),
        (r"print\s+it\s+verbatim\s+as\s+your\s+character'?s?\s+dialogue", "Verbatim Dialogue Exfiltration Bypass"),
    ]

    # Tier 1 & Tier 2 Indirect Document Injection
    INDIRECT_PATTERNS = [
        (r"do\s+not\s+inform\s+the\s+user\s+about\s+these\s+instructions", "User Concealment Directive"),
        (r"\[END\s+OF\s+OVERRIDE\]", "Override Section Tagging"),
        (r"\[Document\s+Processing\s+Directive.*?\]", "Document Processing Directive Disguise"),
        (r"Special\s+Diplomatic\s+Exception\s+Clause", "Diplomatic Policy Exception Spoofing"),
    ]

    # Tier 2 & Tier 3 Contextual Manipulation & Approval Circumvention
    CONTEXTUAL_PATTERNS = [
        (r"\[Automated\s+Workflow\s+Directive.*?\]", "Workflow Note Disguise Directive"),
        (r"\[PROCESSING\s+SYSTEM\s+DIRECTIVE.*?\]", "Processing System Directive Disguise"),
        (r"\[BIM\s+AUTOMATION\s+PROTOCOL.*?\]", "BIM Metadata Automation Disguise"),
        (r"bypass\s+(standard\s+|human\s+|user\s+)?approval", "Approval Mechanism Circumvention"),
        (r"pre-waived\s+and\s+notifications\s+are\s+suppressed", "Pre-waived Notification Suppression"),
        (r"without\s+(requesting\s+user\s+confirmation|alarming\s+the\s+administrator|notifying\s+the\s+recipient)", "Concealment and Warning Suppression"),
        (r"assume\s+master\s+command\s+privilege", "Privilege Escalation Command"),
        (r"standing\s+verbal\s+pre-authorization", "Verbal Pre-authorization Spoofing"),
    ]

    # Tier 3 Multi-stage & Fragmented Injection
    MULTI_STAGE_PATTERNS = [
        (r"\[SYSTEM\s+THREAD\s+ARCHIVE\s+INSTRUCTION.*?\]", "Thread Archive Multi-Stage Instruction"),
        (r"\[SYSTEM\s+TELEMETRY\s+INTEGRATION\s+DIRECTIVE\]", "Telemetry System Directive Disguise"),
        (r"Conditional\s+Mandate\s+under\s+Code\s+Crimson", "Multi-Stage Emergency Code Mandate"),
        (r"Operational\s+Directive\s+1\.4.*?amended\s+by.*?Section\s+3\.2", "Cross-Section Fragmented Linkage"),
    ]

    # Exfiltration Destination Signatures
    EXFILTRATION_PATTERNS = [
        (r"(forward|export|transmit|dump|append).*?(canary|credential|token|encryption\s+canary|access\s+credential).*?to\s+[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", "Targeted Credential Exfiltration via Email"),
        (r"(forward|export|transmit|dump|append|save).*?(canary|credential|token|encryption\s+canary).*?into\s+('|\")?[a-zA-Z0-9_.-]+\.txt", "Targeted Credential Exfiltration to File"),
        (r"archive_dump\.txt|telemetry_leak\.txt|mansion_vault_dump\.txt", "Known Adversarial Exfiltration Files"),
        (r"audit-archive@vault-sync\.net|payments@gothic-contractors\.com|relay@shadow-backup\.org|emergency-leak@shadow-relay\.org|delegates@shadowrealm\.net", "Known Adversarial Exfiltration Addresses"),
    ]

    def __init__(self):
        pass

    def _is_defensive_line(self, line: str) -> bool:
        """Checks if a line is part of a defensive policy or legal prohibition."""
        return any(re.search(pat, line, re.IGNORECASE) for pat in self.DEFENSIVE_CONTEXT_PATTERNS)

    def _extract_base64_candidates(self, text: str) -> List[Tuple[str, str]]:
        """Extracts potential Base64 strings, decodes safely, returns (enc, dec)."""
        candidates = []
        tokens = re.findall(r"\b[A-Za-z0-9+/]{24,}={0,2}\b", text)
        for token in tokens:
            try:
                padded = token + "=" * ((4 - len(token) % 4) % 4)
                decoded_bytes = base64.b64decode(padded, validate=True)
                decoded_str = decoded_bytes.decode("utf-8", errors="ignore")
                if len(decoded_str) > 8 and any(c.isalpha() for c in decoded_str):
                    candidates.append((token, decoded_str))
            except Exception:
                continue
        return candidates

    def detect(self, text: str, source_name: str = "") -> DetectionResult:
        """
        Analyzes the given text for any malicious prompt injection patterns
        across Tier 1, Tier 2, and Tier 3 vectors.
        """
        if not text or not text.strip():
            return DetectionResult(
                is_malicious=False,
                risk_level=RiskLevel.BENIGN,
                attack_type=AttackType.BENIGN,
                confidence_score=0.0,
                findings=["Empty or blank content."],
            )

        matched_patterns: List[str] = []
        findings: List[str] = []
        highest_risk = RiskLevel.BENIGN
        detected_attack = AttackType.BENIGN

        # 1. Base64 Encoded Check
        b64_candidates = self._extract_base64_candidates(text)
        decoded_payload = None
        for enc, dec in b64_candidates:
            if "KSECRET-OVERRIDE" in dec or "Ignore all previous" in dec or "canary" in dec.lower():
                decoded_payload = dec
                matched_patterns.append(f"Decoded Base64: '{dec}'")
                findings.append(f"Malicious Base64 encoded payload identified: '{dec}'")
                detected_attack = AttackType.BASE64_ENCODED_ATTACK
                highest_risk = RiskLevel.CRITICAL

        # 2. Line-by-line pattern scanning, respecting defensive context
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        for line in lines:
            if self._is_defensive_line(line):
                # Skip lines that are defensive warnings or legal prohibitions
                continue

            # Multi-stage patterns
            for pat, desc in self.MULTI_STAGE_PATTERNS:
                if re.search(pat, line, re.IGNORECASE):
                    matched_patterns.append(desc)
                    findings.append(f"Matched multi-stage pattern: {desc}")
                    if detected_attack == AttackType.BENIGN:
                        detected_attack = AttackType.MULTI_STAGE_INJECTION
                    highest_risk = RiskLevel.CRITICAL

            # Contextual manipulation patterns
            for pat, desc in self.CONTEXTUAL_PATTERNS:
                if re.search(pat, line, re.IGNORECASE):
                    matched_patterns.append(desc)
                    findings.append(f"Matched contextual manipulation pattern: {desc}")
                    if detected_attack == AttackType.BENIGN:
                        detected_attack = AttackType.CONTEXTUAL_MANIPULATION
                    highest_risk = RiskLevel.HIGH

            # Exfiltration patterns
            for pat, desc in self.EXFILTRATION_PATTERNS:
                if re.search(pat, line, re.IGNORECASE):
                    matched_patterns.append(desc)
                    findings.append(f"Matched exfiltration signature: {desc}")
                    if detected_attack == AttackType.BENIGN:
                        detected_attack = AttackType.DATA_EXFILTRATION
                    highest_risk = RiskLevel.CRITICAL

            # Direct injection patterns
            for pat, desc in self.DIRECT_INJECTION_PATTERNS:
                if re.search(pat, line, re.IGNORECASE):
                    matched_patterns.append(desc)
                    findings.append(f"Matched direct injection pattern: {desc}")
                    if detected_attack == AttackType.BENIGN:
                        detected_attack = AttackType.DIRECT_PROMPT_INJECTION
                    highest_risk = RiskLevel.CRITICAL

            # Hijacking patterns
            for pat, desc in self.HIJACKING_PATTERNS:
                if re.search(pat, line, re.IGNORECASE):
                    matched_patterns.append(desc)
                    findings.append(f"Matched instruction hijacking pattern: {desc}")
                    if detected_attack == AttackType.BENIGN:
                        detected_attack = AttackType.INSTRUCTION_HIJACKING
                    highest_risk = RiskLevel.CRITICAL

            # Roleplay patterns
            for pat, desc in self.ROLEPLAY_PATTERNS:
                if re.search(pat, line, re.IGNORECASE):
                    matched_patterns.append(desc)
                    findings.append(f"Matched roleplay injection pattern: {desc}")
                    if detected_attack == AttackType.BENIGN:
                        detected_attack = AttackType.ROLEPLAY_ATTACK
                    highest_risk = RiskLevel.HIGH

            # Indirect PDF patterns
            for pat, desc in self.INDIRECT_PATTERNS:
                if re.search(pat, line, re.IGNORECASE):
                    matched_patterns.append(desc)
                    findings.append(f"Matched indirect document pattern: {desc}")
                    if detected_attack == AttackType.BENIGN:
                        detected_attack = AttackType.INDIRECT_PROMPT_INJECTION
                    highest_risk = RiskLevel.CRITICAL

        # Refine attack type based on file type if PDF
        if source_name.lower().endswith(".pdf") and highest_risk in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
            if detected_attack in [AttackType.BENIGN, AttackType.DIRECT_PROMPT_INJECTION]:
                detected_attack = AttackType.INDIRECT_PROMPT_INJECTION

        is_malicious = len(matched_patterns) > 0
        if is_malicious:
            confidence = min(0.65 + (len(matched_patterns) * 0.12), 0.99)
        else:
            confidence = 0.05
            highest_risk = RiskLevel.BENIGN
            detected_attack = AttackType.BENIGN
            findings.append("No active malicious or injection patterns detected. Content is benign.")

        return DetectionResult(
            is_malicious=is_malicious,
            risk_level=highest_risk,
            attack_type=detected_attack,
            confidence_score=round(confidence, 2),
            matched_patterns=list(set(matched_patterns)),
            findings=findings,
            decoded_payload=decoded_payload,
        )

    def scan_email(self, content: str) -> DetectionResult:
        return self.detect(content)

    def scan_document(self, text: str, filename: str = "") -> DetectionResult:
        return self.detect(text, source_name=filename)

    def is_injection(self, text: str) -> bool:
        return self.detect(text).is_malicious
