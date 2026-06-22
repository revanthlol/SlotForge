from pydantic import BaseModel

class ExportResponse(BaseModel):
    url: str
