# app/models/user.py
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import List, Union, Optional

class UserOut(BaseModel):
    id: str
    username: str
    full_name: str
    department: List[str]        # <-- ahora lista
    position: str
    role: str
    created_at: datetime

class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    department: Union[str, List[str]]   # acepta string o lista (se normaliza en el servidor)
    position: str
    role: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    full_name: Optional[str] = None
    department: Optional[Union[str, List[str]]] = None
    position: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None 

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    password: Optional[str] = None

