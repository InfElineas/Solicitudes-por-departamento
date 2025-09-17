from fastapi import (
    FastAPI, APIRouter, HTTPException, Depends,
    Body, Form, Query, Request as FastAPIRequest
)
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, logging, uuid
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict, Any
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext

# Rate limiting (SlowAPI)
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ---- MongoDB connection ----
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# ---- Security & JWT ----
SECRET_KEY = os.environ.get("SECRET_KEY", "change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# ---- Security params from ENV ----
LOGIN_RATE_LIMIT = os.environ.get("LOGIN_RATE_LIMIT", "5/minute")
LOGIN_LOCK_THRESHOLD = int(os.environ.get("LOGIN_LOCK_THRESHOLD", "8"))
LOGIN_LOCK_WINDOW_MIN = int(os.environ.get("LOGIN_LOCK_WINDOW_MIN", "15"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# ---- App ----
app = FastAPI(title="Sistema de Gestión de Solicitudes de Automatización")
api_router = APIRouter(prefix="/api")

# ---- SlowAPI limiter ----
limiter = Limiter(key_func=get_remote_address, enabled=True)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ============================
#            Models
# ============================
RequestType = Literal["Soporte", "Mejora", "Desarrollo", "Capacitación"]
RequestChannel = Literal["WhatsApp", "Correo", "Sistema"]
RequestStatus = Literal["Pendiente", "En progreso", "En revisión", "Finalizada", "Rechazada"]

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    full_name: str
    department: str
    position: str  # "Jefe de departamento" | "Especialista"
    role: str      # "admin" | "support" | "employee"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    department: str
    position: str
    role: str

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class Department(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StateEvent(BaseModel):
    from_status: Optional[RequestStatus] = None
    to_status: RequestStatus
    at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    by_user_id: str
    by_user_name: str

class Feedback(BaseModel):
    rating: Literal["up", "down"]
    comment: Optional[str] = None
    at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    by_user_id: str
    by_user_name: str

class Request(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    priority: Literal["Alta", "Media", "Baja"]
    type: RequestType
    channel: RequestChannel
    level: Optional[int] = None            # 1|2|3
    status: RequestStatus = "Pendiente"
    requester_id: str
    requester_name: str
    department: str
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    estimated_hours: Optional[float] = None
    estimated_due: Optional[datetime] = None
    requested_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completion_date: Optional[datetime] = None
    state_history: List[StateEvent] = Field(default_factory=list)
    feedback: Optional[Feedback] = None

class RequestCreate(BaseModel):
    title: str
    description: str
    priority: Literal["Alta", "Media", "Baja"]
    type: RequestType
    channel: RequestChannel = "Sistema"
    requested_at: Optional[datetime] = None

class RequestUpdate(BaseModel):
    status: Optional[RequestStatus] = None
    assigned_to: Optional[str] = None
    estimated_hours: Optional[float] = None
    estimated_due: Optional[datetime] = None

class ClassifyPayload(BaseModel):
    level: int = Field(ge=1, le=3)
    priority: Literal["Alta", "Media", "Baja"]

class AssignPayload(BaseModel):
    assigned_to: Optional[str] = None
    estimated_hours: Optional[float] = None
    estimated_due: Optional[datetime] = None

class TransitionPayload(BaseModel):
    to_status: RequestStatus

class FeedbackPayload(BaseModel):
    rating: Literal["up", "down"]
    comment: Optional[str] = None

class PaginatedRequests(BaseModel):
    items: List[Request]
    page: int
    page_size: int
    total: int
    total_pages: int
    has_prev: bool
    has_next: bool

# ============================
#       Helper functions
# ============================
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

    user = await db.users.find_one({"username": username})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user)

def require_role(required_roles: List[str]):
    async def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in required_roles:
            raise HTTPException(status_code=403, detail="Not authorized")
        return current_user
    return role_checker

ALLOWED_TRANSITIONS: Dict[RequestStatus, set] = {
    "Pendiente": {"En progreso", "Rechazada"},
    "En progreso": {"En revisión"},
    "En revisión": {"Finalizada", "En progreso"},
    "Finalizada": set(),
    "Rechazada": set(),
}

def ensure_transition(old: RequestStatus, new: RequestStatus):
    if new not in ALLOWED_TRANSITIONS[old]:
        raise HTTPException(status_code=400, detail=f"Transición no permitida: {old} → {new}")

# === Anti-brute force with Mongo TTL ===
async def ensure_security_indexes():
    try:
        await db.failed_logins.create_index("key")
        await db.failed_logins.create_index("expireAt", expireAfterSeconds=0)
    except Exception:
        pass

# ---- Core indexes ----
async def ensure_core_indexes():
    try:
        await db.requests.create_index([("created_at", -1)])
        await db.requests.create_index([("requested_at", -1)])
        await db.requests.create_index([("department", 1)])
        await db.requests.create_index([("status", 1)])
        await db.requests.create_index([("requester_id", 1)])
        await db.requests.create_index([("assigned_to", 1)])
        await db.requests.create_index([("type", 1)])
        await db.requests.create_index([("level", 1)])
        await db.requests.create_index([("channel", 1)])
        await db.requests.create_index([("title", "text"), ("description", "text")])
        await db.users.create_index([("username", 1)], unique=True)
        await db.departments.create_index([("name", 1)], unique=True)
    except Exception:
        pass

async def record_failed_login(username: str, ip: str, window_min: int):
    now = datetime.utcnow()
    await db.failed_logins.insert_one({
        "key": f"{username}|{ip}",
        "createdAt": now,
        "expireAt": now + timedelta(minutes=window_min),
    })

async def is_locked(username: str, ip: str, threshold: int, window_min: int) -> bool:
    since = datetime.utcnow() - timedelta(minutes=window_min)
    key = f"{username}|{ip}"
    count = await db.failed_logins.count_documents({"key": key, "createdAt": {"$gte": since}})
    return count >= threshold

# ============================
#      Seed sample data
# ============================
async def init_data():
    existing_user = await db.users.find_one({"role": "admin"})
    if existing_user:
        return

    # Departments
    departments_data = [
        {"name": "Facturación", "description": "Gestión de facturación y cobros"},
        {"name": "Inventario", "description": "Control y gestión de inventarios"},
        {"name": "Inteligencia comercial", "description": "Análisis y estrategias comerciales"},
        {"name": "Comerciales", "description": "Equipo de ventas y comercial"},
        {"name": "Recursos Humanos", "description": "Gestión del personal"},
        {"name": "Directivos", "description": "Dirección y gerencia"},
        {"name": "Atención al Cliente", "description": "Servicio y soporte al cliente"},
        {"name": "Creación de Anuncios", "description": "Marketing y publicidad"},
    ]
    for d in departments_data:
        await db.departments.insert_one(Department(**d).dict())

    # Users
    users_data = [
        {"username": "admin", "password": "admin123", "full_name": "Administrador Sistema",
         "department": "Directivos", "position": "Jefe de departamento", "role": "admin"},
        {"username": "soporte1", "password": "soporte123", "full_name": "Juan Pérez",
         "department": "Directivos", "position": "Especialista", "role": "support"},
        {"username": "soporte2", "password": "soporte123", "full_name": "María González",
         "department": "Directivos", "position": "Especialista", "role": "support"},
        {"username": "facturacion1", "password": "user123", "full_name": "Carlos López",
         "department": "Facturación", "position": "Jefe de departamento", "role": "employee"},
        {"username": "inventario1", "password": "user123", "full_name": "Ana Martínez",
         "department": "Inventario", "position": "Especialista", "role": "employee"},
        {"username": "comercial1", "password": "user123", "full_name": "Pedro Sánchez",
         "department": "Comerciales", "position": "Especialista", "role": "employee"},
        {"username": "rrhh1", "password": "user123", "full_name": "Laura Torres",
         "department": "Recursos Humanos", "position": "Jefe de departamento", "role": "employee"},
    ]
    username_to_doc: Dict[str, dict] = {}
    for u in users_data:
        hashed = get_password_hash(u["password"])
        user_doc = User(**{k: v for k, v in u.items() if k != "password"}).dict()
        user_doc["password_hash"] = hashed
        await db.users.insert_one(user_doc)
        username_to_doc[u["username"]] = user_doc

    admin_id = username_to_doc["admin"]["id"]

    # Requests de ejemplo (con IDs reales)
    sample_reqs = [
        {"title": "Automatizar facturación mensual",
         "description": "Generar facturas recurrentes para contratos mensuales",
         "priority": "Alta", "status": "Pendiente",
         "type": "Desarrollo", "channel": "Sistema", "level": 3,
         "requester_id": username_to_doc["facturacion1"]["id"], "requester_name": "Carlos López", "department": "Facturación"},
        {"title": "Alertas de stock bajo",
         "description": "Notificaciones cuando el inventario esté por debajo del mínimo",
         "priority": "Media", "status": "En progreso",
         "type": "Mejora", "channel": "Sistema", "level": 2,
         "requester_id": username_to_doc["inventario1"]["id"], "requester_name": "Ana Martínez", "department": "Inventario",
         "assigned_to": username_to_doc["soporte1"]["id"], "assigned_to_name": "Juan Pérez"},
        {"title": "Reporte de ventas diarias",
         "description": "Enviar reporte automático diario por email",
         "priority": "Media", "status": "Finalizada",
         "type": "Mejora", "channel": "Correo", "level": 2,
         "requester_id": username_to_doc["comercial1"]["id"], "requester_name": "Pedro Sánchez", "department": "Comerciales",
         "assigned_to": username_to_doc["soporte2"]["id"], "assigned_to_name": "María González",
         "completion_date": datetime.now(timezone.utc) - timedelta(days=5)},
    ]
    for rd in sample_reqs:
        req = Request(**rd)
        req.state_history.append(StateEvent(
            from_status=None, to_status=req.status,
            by_user_id=admin_id, by_user_name="Administrador Sistema"
        ))
        await db.requests.insert_one(req.dict())

# ============================
#          Endpoints
# ============================
@api_router.post("/auth/login", response_model=Token)
@limiter.limit(LOGIN_RATE_LIMIT)
async def login(
    request: FastAPIRequest,
    user_login: Optional[UserLogin] = Body(default=None),
    username: Optional[str] = Form(default=None),
    password: Optional[str] = Form(default=None),
):
    if user_login is None:
        if username and password:
            user_login = UserLogin(username=username, password=password)
        else:
            try:
                raw = await request.json()
                if isinstance(raw, dict) and "username" in raw and "password" in raw:
                    user_login = UserLogin(username=raw["username"], password=raw["password"])
            except Exception:
                pass

    if user_login is None:
        raise HTTPException(status_code=422, detail="username/password required")

    ip = get_remote_address(request)
    if await is_locked(user_login.username, ip, LOGIN_LOCK_THRESHOLD, LOGIN_LOCK_WINDOW_MIN):
        raise HTTPException(status_code=429, detail="Demasiados intentos fallidos. Inténtalo más tarde.")

    user_doc = await db.users.find_one({"username": user_login.username})
    if not user_doc or not verify_password(user_login.password, user_doc["password_hash"]):
        await record_failed_login(user_login.username, ip, LOGIN_LOCK_WINDOW_MIN)
        raise HTTPException(status_code=401, detail="Incorrect username or password")

    access_token = create_access_token(data={"sub": user_doc["username"]})
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.get("/auth/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

# ---- Users ----
@api_router.post("/users", response_model=User)
async def create_user(user: UserCreate, current_user: User = Depends(require_role(["admin"]))):
    existing_user = await db.users.find_one({"username": user.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    user_dict = user.dict()
    password_hash = get_password_hash(user_dict.pop("password"))
    new_user = User(**user_dict)
    user_doc = new_user.dict()
    user_doc["password_hash"] = password_hash
    await db.users.insert_one(user_doc)
    return new_user

@api_router.get("/users", response_model=List[User])
async def get_users(current_user: User = Depends(require_role(["admin"]))):
    users = await db.users.find().to_list(1000)
    return [User(**user) for user in users]

# ---- Departments ----
@api_router.get("/departments", response_model=List[Department])
async def get_departments(current_user: User = Depends(get_current_user)):
    departments = await db.departments.find().to_list(1000)
    return [Department(**dept) for dept in departments]

# ---- Requests ----
@api_router.post("/requests", response_model=Request)
async def create_request(payload: RequestCreate, current_user: User = Depends(get_current_user)):
    data = payload.dict(exclude_unset=True)
    if not data.get("requested_at"):
        data["requested_at"] = datetime.now(timezone.utc)
    new_request = Request(
        **data,
        requester_id=current_user.id,
        requester_name=current_user.full_name,
        department=current_user.department,
    )
    new_request.state_history.append(StateEvent(
        from_status=None, to_status=new_request.status,
        by_user_id=current_user.id, by_user_name=current_user.full_name
    ))
    await db.requests.insert_one(new_request.dict())
    return new_request

@api_router.get("/requests", response_model=PaginatedRequests)
async def get_requests(
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=int(os.environ.get("MAX_PAGE_SIZE", "50"))),
    status: Optional[RequestStatus] = Query(None),
    department: Optional[str] = Query(None),
    q: Optional[str] = Query(None, description="Texto en título/descripción"),
    sort: Optional[str] = Query("-created_at"),
    request_type: Optional[RequestType] = Query(None, alias="type"),
    level: Optional[int] = Query(None, ge=1, le=3),
    assigned_to: Optional[str] = Query(None),
    channel: Optional[RequestChannel] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
):
    filt: Dict[str, Any] = {}
    if current_user.role == "employee":
        filt["requester_id"] = current_user.id
    if status: filt["status"] = status
    if department: filt["department"] = department
    if request_type: filt["type"] = request_type
    if level: filt["level"] = level
    if assigned_to: filt["assigned_to"] = assigned_to
    if channel: filt["channel"] = channel
    if date_from or date_to:
        dr: Dict[str, Any] = {}
        if date_from: dr["$gte"] = date_from
        if date_to: dr["$lte"] = date_to
        filt["requested_at"] = dr
    if q: filt["$text"] = {"$search": q}

    sort_field = "created_at"; sort_dir = -1
    if sort:
        if sort.startswith("-"):
            sort_field = sort[1:]; sort_dir = -1
        else:
            sort_field = sort; sort_dir = 1
    if sort_field not in {"created_at", "status", "department", "requested_at", "priority", "level"}:
        sort_field = "created_at"

    total = await db.requests.count_documents(filt)
    total_pages = max((total + page_size - 1) // page_size, 1)
    page = min(page, total_pages)

    cursor = (
        db.requests.find(filt)
        .sort(sort_field, sort_dir)
        .skip((page - 1) * page_size)
        .limit(page_size)
    )
    docs = await cursor.to_list(length=page_size)
    items = [Request(**d) for d in docs]

    return PaginatedRequests(
        items=items,
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
        has_prev=page > 1,
        has_next=page < total_pages,
    )

@api_router.post("/requests/{request_id}/classify", response_model=Request)
async def classify_request(
    request_id: str,
    payload: ClassifyPayload,
    current_user: User = Depends(require_role(["admin"]))
):
    doc = await db.requests.find_one({"id": request_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Request not found")
    update = {
        "level": payload.level,
        "priority": payload.priority,
        "updated_at": datetime.now(timezone.utc),
    }
    await db.requests.update_one({"id": request_id}, {"$set": update})
    doc = await db.requests.find_one({"id": request_id})
    return Request(**doc)

@api_router.post("/requests/{request_id}/assign", response_model=Request)
async def assign_request(
    request_id: str,
    payload: AssignPayload,
    current_user: User = Depends(require_role(["admin"]))
):
    doc = await db.requests.find_one({"id": request_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Request not found")

    target_user_id = payload.assigned_to or current_user.id
    target_user = await db.users.find_one({"id": target_user_id})
    if not target_user:
        raise HTTPException(status_code=400, detail="Usuario destino no encontrado")

    update = {
        "assigned_to": target_user["id"],
        "assigned_to_name": target_user["full_name"],
        "estimated_hours": payload.estimated_hours,
        "estimated_due": payload.estimated_due,
        "updated_at": datetime.now(timezone.utc),
    }
    await db.requests.update_one({"id": request_id}, {"$set": update})
    doc = await db.requests.find_one({"id": request_id})
    return Request(**doc)

@api_router.post("/requests/{request_id}/transition", response_model=Request)
async def transition_request(
    request_id: str,
    payload: TransitionPayload,
    current_user: User = Depends(require_role(["support", "admin"]))):
    doc = await db.requests.find_one({"id": request_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Request not found")

    current = Request(**doc)
    ensure_transition(current.status, payload.to_status)

    set_ops: Dict[str, Any] = {
        "status": payload.to_status,
        "updated_at": datetime.now(timezone.utc),
    }
    if payload.to_status in {"Finalizada", "Rechazada"}:
        set_ops["completion_date"] = datetime.now(timezone.utc)

    history_event = StateEvent(
        from_status=current.status,
        to_status=payload.to_status,
        by_user_id=current_user.id,
        by_user_name=current_user.full_name,
    ).dict()

    await db.requests.update_one(
        {"id": request_id},
        {"$set": set_ops, "$push": {"state_history": history_event}}
    )

    doc = await db.requests.find_one({"id": request_id})
    return Request(**doc)

@api_router.post("/requests/{request_id}/feedback", response_model=Request)
async def submit_feedback(
    request_id: str,
    payload: FeedbackPayload,
    current_user: User = Depends(require_role(["employee", "admin", "support"]))):
    doc = await db.requests.find_one({"id": request_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Request not found")
    req = Request(**doc)

    if current_user.role != "admin" and req.requester_id != current_user.id:
        raise HTTPException(status_code=403, detail="Solo el solicitante puede enviar feedback")
    if req.status != "Finalizada":
        raise HTTPException(status_code=400, detail="La solicitud no está finalizada")
    if req.feedback is not None:
        raise HTTPException(status_code=400, detail="El feedback ya fue registrado")

    fb = Feedback(
        rating=payload.rating,
        comment=payload.comment,
        by_user_id=current_user.id,
        by_user_name=current_user.full_name
    ).dict()

    await db.requests.update_one({"id": request_id}, {"$set": {"feedback": fb}})
    doc = await db.requests.find_one({"id": request_id})
    return Request(**doc)

# ---- Update genérico con trazabilidad (compat) ----
@api_router.put("/requests/{request_id}", response_model=Request)
async def update_request_generic(
    request_id: str,
    request_update: RequestUpdate,
    current_user: User = Depends(require_role(["support", "admin"]))
):
    doc = await db.requests.find_one({"id": request_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Request not found")

    current = Request(**doc)
    update_data = request_update.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc)

    ops: Dict[str, Any] = {"$set": update_data}
    if "status" in update_data and update_data["status"] and update_data["status"] != current.status:
        ensure_transition(current.status, update_data["status"])
        if update_data["status"] in {"Finalizada", "Rechazada"}:
            ops["$set"]["completion_date"] = datetime.now(timezone.utc)
        ops["$push"] = {"state_history": StateEvent(
            from_status=current.status,
            to_status=update_data["status"],
            by_user_id=current_user.id,
            by_user_name=current_user.full_name
        ).dict()}

    if "assigned_to" in update_data and update_data["assigned_to"]:
        assigned_user = await db.users.find_one({"id": update_data["assigned_to"]})
        if assigned_user:
            ops["$set"]["assigned_to_name"] = assigned_user["full_name"]

    await db.requests.update_one({"id": request_id}, ops)
    doc = await db.requests.find_one({"id": request_id})
    return Request(**doc)

# ---- Reportes / Analytics helpers ----
def _range_for_period(period: Literal["daily", "weekly", "monthly"], ref: Optional[datetime] = None):
    now = ref or datetime.now(timezone.utc)
    if period == "daily":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "weekly":
        start = (now - timedelta(days=(now.isoweekday() - 1))).replace(hour=0, minute=0, second=0, microsecond=0)
    else:
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return start, now

async def _summary_payload(period: Literal["daily", "weekly", "monthly"]):
    start, end = _range_for_period(period)

    new_count = await db.requests.count_documents({"requested_at": {"$gte": start, "$lte": end}})
    finished_q = {"status": "Finalizada", "completion_date": {"$gte": start, "$lte": end}}
    finished_count = await db.requests.count_documents(finished_q)
    pending_now = await db.requests.count_documents({"status": {"$in": ["Pendiente","En progreso","En revisión"]}})

    pipeline = [
        {"$match": finished_q},
        {"$group": {"_id": "$assigned_to_name", "finalizados": {"$sum": 1}}},
        {"$sort": {"finalizados": -1}}
    ]
    prod = await db.requests.aggregate(pipeline).to_list(length=1000)

    finals = await db.requests.find(finished_q).to_list(2000)
    avg_hours = 0.0
    if finals:
        total_hours = sum([(r["completion_date"] - r["created_at"]).total_seconds() / 3600 for r in finals])
        avg_hours = round(total_hours / len(finals), 1)

    return {
        "period": period,
        "from": start,
        "to": end,
        "new": new_count,
        "finished": finished_count,
        "pending_now": pending_now,
        "avg_cycle_hours": avg_hours,
        "productivity_by_tech": prod,
    }

# ---- Reportes ----
@api_router.get("/reports/summary")
async def reports_summary(
    period: Literal["daily", "weekly", "monthly"] = Query("daily"),
    current_user: User = Depends(require_role(["support", "admin"]))
):
    return await _summary_payload(period)

@api_router.get("/analytics/dashboard")
async def analytics_dashboard(
    period: Literal["day", "week", "month"] = Query("month"),
    current_user: User = Depends(require_role(["support", "admin"]))
):
    map_period = {"day":"daily","week":"weekly","month":"monthly"}[period]
    return await _summary_payload(map_period)

# ============================
#        App lifecycle
# ============================
@app.on_event("startup")
async def startup_event():
    await ensure_security_indexes()
    await ensure_core_indexes()
    await init_data()

app.include_router(api_router)

# ---- CORS (robusto para dev) ----
allow_origins_list = list(filter(None, [
    *(o.strip() for o in os.environ.get("CORS_ORIGINS","").split(",") if o.strip()),
    "http://localhost:3000", "http://127.0.0.1:3000",
    "http://localhost:5173", "http://127.0.0.1:5173",
]))
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=allow_origins_list or ["http://localhost:3000"],
    allow_methods=["GET","POST","PUT","DELETE","OPTIONS"],
    allow_headers=["Authorization","Content-Type"],
    expose_headers=["*"],
    max_age=600,
)

# ---- Logging ----
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
