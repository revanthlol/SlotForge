import uuid
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.schemas.room import Room, RoomCreate, RoomUpdate
from app.core.db_memory import db

router = APIRouter()

@router.post("/", response_model=Room, status_code=201)
def create_room(payload: RoomCreate):
    with db.lock:
        if payload.organization_id not in db.organizations:
            raise HTTPException(status_code=400, detail="Invalid organization_id")
        
        room_id = str(uuid.uuid4())
        room_data = {
            "id": room_id,
            "organization_id": payload.organization_id,
            "name": payload.name,
            "capacity": payload.capacity,
            "room_type": payload.room_type
        }
        db.rooms[room_id] = room_data
    return room_data

@router.get("/", response_model=list[Room])
def list_rooms(organization_id: Optional[str] = Query(None)):
    with db.lock:
        rooms = list(db.rooms.values())
    if organization_id:
        rooms = [r for r in rooms if r["organization_id"] == organization_id]
    return rooms

@router.get("/{room_id}", response_model=Room)
def get_room(room_id: str):
    with db.lock:
        room = db.rooms.get(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room

@router.put("/{room_id}", response_model=Room)
def update_room(room_id: str, payload: RoomUpdate):
    with db.lock:
        room = db.rooms.get(room_id)
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        
        if payload.name is not None:
            room["name"] = payload.name
        if payload.capacity is not None:
            room["capacity"] = payload.capacity
        if payload.room_type is not None:
            room["room_type"] = payload.room_type
    return room

@router.delete("/{room_id}", status_code=204)
def delete_room(room_id: str):
    with db.lock:
        if room_id not in db.rooms:
            raise HTTPException(status_code=404, detail="Room not found")
        del db.rooms[room_id]
    return
