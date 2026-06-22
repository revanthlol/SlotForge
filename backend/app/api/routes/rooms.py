import uuid
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.schemas.room import Room as RoomSchema, RoomCreate, RoomUpdate
from app.models.room import Room as RoomModel
from app.core.db import get_db
from app.core.auth import get_current_user_profile, require_org_admin
from app.models.profile import Profile
from app.services.audit_service import AuditService

router = APIRouter()

@router.post("/", response_model=RoomSchema, status_code=201)
def create_room(
    payload: RoomCreate,
    current_user: Profile = Depends(require_org_admin),
    db: Session = Depends(get_db)
):
    room = RoomModel(
        organization_id=current_user.organization_id,
        name=payload.name,
        capacity=payload.capacity,
        room_type=payload.room_type
    )
    db.add(room)
    db.commit()
    db.refresh(room)
    
    AuditService.log_action(
        db=db,
        org_id=current_user.organization_id,
        actor_id=current_user.id,
        action="room.create",
        target_table="rooms",
        target_id=room.id,
        diff={"new_values": {"name": room.name, "capacity": room.capacity, "room_type": room.room_type}}
    )
    
    return RoomSchema(
        id=str(room.id),
        organization_id=str(room.organization_id),
        name=room.name,
        capacity=room.capacity,
        type=room.room_type
    )

@router.get("/", response_model=list[RoomSchema])
def list_rooms(
    current_user: Profile = Depends(get_current_user_profile),
    db: Session = Depends(get_db)
):
    rooms = db.query(RoomModel).filter(
        RoomModel.organization_id == current_user.organization_id
    ).all()
    return [
        RoomSchema(
            id=str(r.id),
            organization_id=str(r.organization_id),
            name=r.name,
            capacity=r.capacity,
            type=r.room_type
        ) for r in rooms
    ]

@router.get("/{room_id}", response_model=RoomSchema)
def get_room(
    room_id: str,
    current_user: Profile = Depends(get_current_user_profile),
    db: Session = Depends(get_db)
):
    try:
        r_uuid = uuid.UUID(room_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Room not found")
        
    room = db.query(RoomModel).filter(
        RoomModel.id == r_uuid,
        RoomModel.organization_id == current_user.organization_id
    ).first()
    
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
        
    return RoomSchema(
        id=str(room.id),
        organization_id=str(room.organization_id),
        name=room.name,
        capacity=room.capacity,
        type=room.room_type
    )

@router.put("/{room_id}", response_model=RoomSchema)
def update_room(
    room_id: str,
    payload: RoomUpdate,
    current_user: Profile = Depends(require_org_admin),
    db: Session = Depends(get_db)
):
    try:
        r_uuid = uuid.UUID(room_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Room not found")
        
    room = db.query(RoomModel).filter(
        RoomModel.id == r_uuid,
        RoomModel.organization_id == current_user.organization_id
    ).first()
    
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
        
    old_values = {
        "name": room.name,
        "capacity": room.capacity,
        "room_type": room.room_type
    }
    
    mutated = False
    if payload.name is not None:
        room.name = payload.name
        mutated = True
    if payload.capacity is not None:
        room.capacity = payload.capacity
        mutated = True
    if payload.room_type is not None:
        room.room_type = payload.room_type
        mutated = True
        
    if mutated:
        db.commit()
        db.refresh(room)
        
        AuditService.log_action(
            db=db,
            org_id=current_user.organization_id,
            actor_id=current_user.id,
            action="room.update",
            target_table="rooms",
            target_id=room.id,
            diff={
                "old_values": old_values,
                "new_values": {
                    "name": room.name,
                    "capacity": room.capacity,
                    "room_type": room.room_type
                }
            }
        )
    
    return RoomSchema(
        id=str(room.id),
        organization_id=str(room.organization_id),
        name=room.name,
        capacity=room.capacity,
        type=room.room_type
    )

@router.delete("/{room_id}", status_code=204)
def delete_room(
    room_id: str,
    current_user: Profile = Depends(require_org_admin),
    db: Session = Depends(get_db)
):
    try:
        r_uuid = uuid.UUID(room_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Room not found")
        
    room = db.query(RoomModel).filter(
        RoomModel.id == r_uuid,
        RoomModel.organization_id == current_user.organization_id
    ).first()
    
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
        
    old_values = {
        "name": room.name,
        "capacity": room.capacity,
        "room_type": room.room_type
    }
    room_id_val = room.id
    
    db.delete(room)
    db.commit()
    
    AuditService.log_action(
        db=db,
        org_id=current_user.organization_id,
        actor_id=current_user.id,
        action="room.delete",
        target_table="rooms",
        target_id=room_id_val,
        diff={"old_values": old_values}
    )
    return

