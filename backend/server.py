from fastapi import (
    FastAPI, APIRouter, HTTPException, Depends, status,
    Body, Form, Request as FastAPIRequest, Query
)
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext

# === Rate limiting (SlowAPI) ===
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
SECRET_KEY = os.environ.get("SECRET_KEY", "your-secret-key-change-in-production")
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

# Nota: mantenemos el nombre "Request" para tu modelo de solicitud,
# pero usamos FastAPIRequest (alias) para el objeto Request de FastAPI.
class Request(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    priority: str          # "Alta", "Media", "Baja"
    process_type: str
    status: str = "Pendiente"  # "Pendiente", "En progreso", "Completada", "Rechazada"
    requester_id: str
    requester_name: str
    department: str
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completion_date: Optional[datetime] = None

class RequestCreate(BaseModel):
    title: str
    description: str
    priority: str
    process_type: str

class RequestUpdate(BaseModel):
    status: str
    assigned_to: Optional[str] = None

# ---- Respuesta paginada ----
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
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
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

# === Anti-brute force with Mongo TTL ===
async def ensure_security_indexes():
    try:
        await db.failed_logins.create_index("key")
        await db.failed_logins.create_index("expireAt", expireAfterSeconds=0)
    except Exception:
        pass

# ---- Índices núcleo para rendimiento/búsqueda ----
async def ensure_core_indexes():
    try:
        await db.requests.create_index([("created_at", -1)])
        await db.requests.create_index([("department", 1)])
        await db.requests.create_index([("status", 1)])
        await db.requests.create_index([("requester_id", 1)])
        await db.requests.create_index([("assigned_to", 1)])
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
#      Initialize sample data
# ============================
async def init_data():
    # Avoid reseeding
    existing_user = await db.users.find_one({"role": "admin"})
    if existing_user:
        return

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
    for dept_data in departments_data:
        dept = Department(**dept_data)
        await db.departments.insert_one(dept.dict())

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
    for user_data in users_data:
        user_dict = user_data.copy()
        user_dict["password"] = get_password_hash(user_data["password"])
        user = User(**{k: v for k, v in user_dict.items() if k != "password"})
        user_doc = user.dict()
        user_doc["password_hash"] = user_dict["password"]
        await db.users.insert_one(user_doc)

    requests_data = [
        {"title": "Automatizar proceso de facturación mensual",
         "description": "Necesitamos automatizar la generación de facturas recurrentes para clientes con contratos mensuales",
         "priority": "Alta", "process_type": "Facturación", "status": "Pendiente",
         "requester_id": "facturacion1", "requester_name": "Carlos López", "department": "Facturación"},
        {"title": "Sistema de alertas de stock bajo",
         "description": "Implementar notificaciones automáticas cuando el inventario de productos esté por debajo del mínimo",
         "priority": "Media", "process_type": "Inventario", "status": "En progreso",
         "requester_id": "inventario1", "requester_name": "Ana Martínez", "department": "Inventario",
         "assigned_to": "soporte1", "assigned_to_name": "Juan Pérez"},
        {"title": "Reporte automático de ventas diarias",
         "description": "Generar reportes automáticos de ventas que se envíen por email todos los días",
         "priority": "Media", "process_type": "Reportes", "status": "Completada",
         "requester_id": "comercial1", "requester_name": "Pedro Sánchez", "department": "Comerciales",
         "assigned_to": "soporte2", "assigned_to_name": "María González",
         "completion_date": datetime.now(timezone.utc) - timedelta(days=5)},
    ]
    for req_data in requests_data:
        req = Request(**req_data)
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
    # 1) Aceptar JSON (UserLogin) o FormData/x-www-form-urlencoded
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

    # 2) Anti fuerza-bruta
    ip = get_remote_address(request)
    if await is_locked(user_login.username, ip, LOGIN_LOCK_THRESHOLD, LOGIN_LOCK_WINDOW_MIN):
        raise HTTPException(status_code=429, detail="Demasiados intentos fallidos. Inténtalo más tarde.")

    # 3) Autenticar
    user_doc = await db.users.find_one({"username": user_login.username})
    if not user_doc or not verify_password(user_login.password, user_doc["password_hash"]):
        await record_failed_login(user_login.username, ip, LOGIN_LOCK_WINDOW_MIN)
        raise HTTPException(status_code=401, detail="Incorrect username or password")

    # 4) Token
    access_token = create_access_token(
        data={"sub": user_doc["username"]},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
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
async def create_request(request: RequestCreate, current_user: User = Depends(get_current_user)):
    new_request = Request(
        **request.dict(),
        requester_id=current_user.id,
        requester_name=current_user.full_name,
        department=current_user.department,
    )
    await db.requests.insert_one(new_request.dict())
    return new_request

# Nuevo: GET /requests paginado + filtros + orden
@api_router.get("/requests", response_model=PaginatedRequests)
async def get_requests(
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=int(os.environ.get("MAX_PAGE_SIZE", "50"))),
    status: Optional[str] = Query(None, description="Pendiente|En progreso|Completada|Rechazada"),
    department: Optional[str] = Query(None),
    q: Optional[str] = Query(None, description="Texto a buscar en título/descripción"),
    sort: Optional[str] = Query("-created_at", description="Campo a ordenar, ej: -created_at o created_at"),
):
    # ----- Filtros -----
    filt: dict = {}
    if current_user.role == "employee":
        filt["requester_id"] = current_user.id
    if status:
        filt["status"] = status
    if department:
        filt["department"] = department
    if q:
        filt["$text"] = {"$search": q}

    # ----- Orden -----
    sort_field = "created_at"
    sort_dir = -1  # desc
    if sort:
        if sort.startswith("-"):
            sort_field = sort[1:]
            sort_dir = -1
        else:
            sort_field = sort
            sort_dir = 1
    if sort_field not in {"created_at", "status", "department"}:
        sort_field = "created_at"

    # ----- Conteo + página -----
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

@api_router.put("/requests/{request_id}", response_model=Request)
async def update_request(
    request_id: str,
    request_update: RequestUpdate,
    current_user: User = Depends(require_role(["support", "admin"]))
):
    request_doc = await db.requests.find_one({"id": request_id})
    if not request_doc:
        raise HTTPException(status_code=404, detail="Request not found")

    update_data = request_update.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc)

    if "assigned_to" in update_data and update_data["assigned_to"] is not None:
        assigned_user = await db.users.find_one({"id": update_data["assigned_to"]})
        if assigned_user:
            update_data["assigned_to_name"] = assigned_user["full_name"]

    if update_data.get("status") in ["Completada", "Rechazada"]:
        update_data["completion_date"] = datetime.now(timezone.utc)

    await db.requests.update_one({"id": request_id}, {"$set": update_data})
    updated_request = await db.requests.find_one({"id": request_id})
    return Request(**updated_request)

# ---- Analytics ----
@api_router.get("/analytics/dashboard")
async def get_dashboard_analytics(
    period: str = "month",
    current_user: User = Depends(require_role(["support", "admin"]))
):
    now = datetime.now(timezone.utc)
    if period == "day":
        start_date = now - timedelta(days=1)
    elif period == "week":
        start_date = now - timedelta(weeks=1)
    else:
        start_date = now - timedelta(days=30)

    requests = await db.requests.find({"created_at": {"$gte": start_date}}).to_list(1000)

    total_requests = len(requests)
    completed_requests = len([r for r in requests if r["status"] == "Completada"])
    rejected_requests = len([r for r in requests if r["status"] == "Rechazada"])
    in_progress_requests = len([r for r in requests if r["status"] == "En progreso"])
    pending_requests = len([r for r in requests if r["status"] == "Pendiente"])

    dept_stats = {}
    for r in requests:
        dept = r["department"]
        dept_stats[dept] = dept_stats.get(dept, 0) + 1

    completed_with_dates = [
        r for r in requests if r["status"] == "Completada" and r.get("completion_date")
    ]
    avg_resolution_hours = 0
    if completed_with_dates:
        total_hours = sum(
            (r["completion_date"] - r["created_at"]).total_seconds() / 3600
            for r in completed_with_dates
        )
        avg_resolution_hours = round(total_hours / len(completed_with_dates), 1)

    return {
        "period": period,
        "total_requests": total_requests,
        "completed_requests": completed_requests,
        "rejected_requests": rejected_requests,
        "in_progress_requests": in_progress_requests,
        "pending_requests": pending_requests,
        "requests_by_department": dept_stats,
        "avg_resolution_hours": avg_resolution_hours,
        "completion_rate": round((completed_requests / total_requests * 100) if total_requests > 0 else 0, 1),
    }

# ============================
#        App lifecycle
# ============================
@app.on_event("startup")
async def startup_event():
    await ensure_security_indexes()
    await ensure_core_indexes()  # <- índices de rendimiento/búsqueda
    await init_data()

# Routers
app.include_router(api_router)

# ---- CORS ----
_raw_origins = os.environ.get("CORS_ORIGINS", "")
if _raw_origins.strip():
    allow_origins_list = [o.strip() for o in _raw_origins.split(",") if o.strip()]
else:
    allow_origins_list = ["http://localhost:3000", "http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=allow_origins_list,
    allow_methods=["*"],
    allow_headers=["*"],
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
