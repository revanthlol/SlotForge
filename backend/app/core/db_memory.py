import threading
from typing import Dict, Any

class MemoryDatabase:
    def __init__(self):
        self.lock = threading.Lock()
        self.organizations: Dict[str, dict] = {}
        self.teachers: Dict[str, dict] = {}
        self.rooms: Dict[str, dict] = {}
        self.subjects: Dict[str, dict] = {}
        self.sections: Dict[str, dict] = {}
        self.constraints: Dict[str, dict] = {}
        self.timetables: Dict[str, dict] = {}

db = MemoryDatabase()
