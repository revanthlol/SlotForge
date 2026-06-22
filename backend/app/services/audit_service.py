import uuid
from typing import Optional, Any
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog

class AuditService:
    @staticmethod
    def log_action(
        db: Session,
        org_id: uuid.UUID,
        actor_id: Optional[uuid.UUID],
        action: str,
        target_table: Optional[str] = None,
        target_id: Optional[uuid.UUID] = None,
        diff: Optional[dict] = None
    ) -> AuditLog:
        """
        Creates and persists an audit log entry.
        """
        log = AuditLog(
            organization_id=org_id,
            actor_id=actor_id,
            action=action,
            target_table=target_table,
            target_id=target_id,
            diff=diff
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        return log
