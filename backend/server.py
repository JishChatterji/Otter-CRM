from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
from emergentintegrations.llm.chat import LlmChat, UserMessage


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get('ACCESS_TOKEN_EXPIRE_MINUTES', 43200))

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# ===== MODELS =====

# Auth Models
class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: EmailStr
    full_name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

# Contact Models
class ContactCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    company: Optional[str] = None
    position: Optional[str] = None
    status: str = "lead"  # lead, prospect, customer
    notes: Optional[str] = None

class Contact(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    email: EmailStr
    phone: Optional[str] = None
    company: Optional[str] = None
    position: Optional[str] = None
    status: str = "lead"
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Deal Models
class DealCreate(BaseModel):
    title: str
    contact_id: str
    value: float
    stage: str = "qualification"  # qualification, proposal, negotiation, closed
    probability: int = 25
    expected_close_date: Optional[str] = None
    notes: Optional[str] = None

class Deal(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    contact_id: str
    contact_name: Optional[str] = None
    value: float
    stage: str = "qualification"
    probability: int = 25
    expected_close_date: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Task Models
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    related_to: Optional[str] = None  # contact_id or deal_id
    related_type: Optional[str] = None  # "contact" or "deal"
    due_date: Optional[str] = None
    priority: str = "medium"  # low, medium, high
    status: str = "pending"  # pending, in_progress, completed

class Task(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    description: Optional[str] = None
    related_to: Optional[str] = None
    related_type: Optional[str] = None
    due_date: Optional[str] = None
    priority: str = "medium"
    status: str = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# AI Models
class AIContactInsightRequest(BaseModel):
    contact_id: str

class AIEmailDraftRequest(BaseModel):
    contact_id: str
    purpose: str  # meeting, follow_up, proposal

class AIDealAnalysisRequest(BaseModel):
    deal_id: str

class AIResponse(BaseModel):
    content: str


# ===== HELPER FUNCTIONS =====

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user)


# ===== ROUTES =====

# Auth Routes
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserRegister):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = User(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name
    )
    
    user_doc = user.model_dump()
    user_doc['created_at'] = user_doc['created_at'].isoformat()
    user_doc['password'] = get_password_hash(user_data.password)
    
    await db.users.insert_one(user_doc)
    
    # Create token
    access_token = create_access_token(data={"sub": user.id})
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    user_doc = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if not user_doc or not verify_password(user_data.password, user_doc['password']):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    # Remove password from response
    del user_doc['password']
    if isinstance(user_doc['created_at'], str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    user = User(**user_doc)
    access_token = create_access_token(data={"sub": user.id})
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# Contact Routes
@api_router.post("/contacts", response_model=Contact)
async def create_contact(contact_data: ContactCreate, current_user: User = Depends(get_current_user)):
    contact = Contact(user_id=current_user.id, **contact_data.model_dump())
    doc = contact.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.contacts.insert_one(doc)
    return contact

@api_router.get("/contacts", response_model=List[Contact])
async def get_contacts(current_user: User = Depends(get_current_user)):
    contacts = await db.contacts.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)
    for contact in contacts:
        if isinstance(contact['created_at'], str):
            contact['created_at'] = datetime.fromisoformat(contact['created_at'])
        if isinstance(contact['updated_at'], str):
            contact['updated_at'] = datetime.fromisoformat(contact['updated_at'])
    return contacts

@api_router.get("/contacts/{contact_id}", response_model=Contact)
async def get_contact(contact_id: str, current_user: User = Depends(get_current_user)):
    contact = await db.contacts.find_one({"id": contact_id, "user_id": current_user.id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    if isinstance(contact['created_at'], str):
        contact['created_at'] = datetime.fromisoformat(contact['created_at'])
    if isinstance(contact['updated_at'], str):
        contact['updated_at'] = datetime.fromisoformat(contact['updated_at'])
    return Contact(**contact)

@api_router.put("/contacts/{contact_id}", response_model=Contact)
async def update_contact(contact_id: str, contact_data: ContactCreate, current_user: User = Depends(get_current_user)):
    existing_contact = await db.contacts.find_one({"id": contact_id, "user_id": current_user.id}, {"_id": 0})
    if not existing_contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    update_data = contact_data.model_dump()
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.contacts.update_one({"id": contact_id}, {"$set": update_data})
    
    updated_contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    if isinstance(updated_contact['created_at'], str):
        updated_contact['created_at'] = datetime.fromisoformat(updated_contact['created_at'])
    if isinstance(updated_contact['updated_at'], str):
        updated_contact['updated_at'] = datetime.fromisoformat(updated_contact['updated_at'])
    return Contact(**updated_contact)

@api_router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str, current_user: User = Depends(get_current_user)):
    result = await db.contacts.delete_one({"id": contact_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"message": "Contact deleted successfully"}


# Deal Routes
@api_router.post("/deals", response_model=Deal)
async def create_deal(deal_data: DealCreate, current_user: User = Depends(get_current_user)):
    # Get contact name
    contact = await db.contacts.find_one({"id": deal_data.contact_id}, {"_id": 0})
    contact_name = contact['name'] if contact else None
    
    deal = Deal(user_id=current_user.id, contact_name=contact_name, **deal_data.model_dump())
    doc = deal.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.deals.insert_one(doc)
    return deal

@api_router.get("/deals", response_model=List[Deal])
async def get_deals(current_user: User = Depends(get_current_user)):
    deals = await db.deals.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)
    for deal in deals:
        if isinstance(deal['created_at'], str):
            deal['created_at'] = datetime.fromisoformat(deal['created_at'])
        if isinstance(deal['updated_at'], str):
            deal['updated_at'] = datetime.fromisoformat(deal['updated_at'])
    return deals

@api_router.get("/deals/{deal_id}", response_model=Deal)
async def get_deal(deal_id: str, current_user: User = Depends(get_current_user)):
    deal = await db.deals.find_one({"id": deal_id, "user_id": current_user.id}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    if isinstance(deal['created_at'], str):
        deal['created_at'] = datetime.fromisoformat(deal['created_at'])
    if isinstance(deal['updated_at'], str):
        deal['updated_at'] = datetime.fromisoformat(deal['updated_at'])
    return Deal(**deal)

@api_router.put("/deals/{deal_id}", response_model=Deal)
async def update_deal(deal_id: str, deal_data: DealCreate, current_user: User = Depends(get_current_user)):
    existing_deal = await db.deals.find_one({"id": deal_id, "user_id": current_user.id}, {"_id": 0})
    if not existing_deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    # Get contact name
    contact = await db.contacts.find_one({"id": deal_data.contact_id}, {"_id": 0})
    contact_name = contact['name'] if contact else None
    
    update_data = deal_data.model_dump()
    update_data['contact_name'] = contact_name
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.deals.update_one({"id": deal_id}, {"$set": update_data})
    
    updated_deal = await db.deals.find_one({"id": deal_id}, {"_id": 0})
    if isinstance(updated_deal['created_at'], str):
        updated_deal['created_at'] = datetime.fromisoformat(updated_deal['created_at'])
    if isinstance(updated_deal['updated_at'], str):
        updated_deal['updated_at'] = datetime.fromisoformat(updated_deal['updated_at'])
    return Deal(**updated_deal)

@api_router.delete("/deals/{deal_id}")
async def delete_deal(deal_id: str, current_user: User = Depends(get_current_user)):
    result = await db.deals.delete_one({"id": deal_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Deal not found")
    return {"message": "Deal deleted successfully"}


# Task Routes
@api_router.post("/tasks", response_model=Task)
async def create_task(task_data: TaskCreate, current_user: User = Depends(get_current_user)):
    task = Task(user_id=current_user.id, **task_data.model_dump())
    doc = task.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.tasks.insert_one(doc)
    return task

@api_router.get("/tasks", response_model=List[Task])
async def get_tasks(current_user: User = Depends(get_current_user)):
    tasks = await db.tasks.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)
    for task in tasks:
        if isinstance(task['created_at'], str):
            task['created_at'] = datetime.fromisoformat(task['created_at'])
        if isinstance(task['updated_at'], str):
            task['updated_at'] = datetime.fromisoformat(task['updated_at'])
    return tasks

@api_router.put("/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, task_data: TaskCreate, current_user: User = Depends(get_current_user)):
    existing_task = await db.tasks.find_one({"id": task_id, "user_id": current_user.id}, {"_id": 0})
    if not existing_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = task_data.model_dump()
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.tasks.update_one({"id": task_id}, {"$set": update_data})
    
    updated_task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if isinstance(updated_task['created_at'], str):
        updated_task['created_at'] = datetime.fromisoformat(updated_task['created_at'])
    if isinstance(updated_task['updated_at'], str):
        updated_task['updated_at'] = datetime.fromisoformat(updated_task['updated_at'])
    return Task(**updated_task)

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, current_user: User = Depends(get_current_user)):
    result = await db.tasks.delete_one({"id": task_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted successfully"}


# Analytics Routes
@api_router.get("/analytics/dashboard")
async def get_dashboard_analytics(current_user: User = Depends(get_current_user)):
    # Get counts
    total_contacts = await db.contacts.count_documents({"user_id": current_user.id})
    total_deals = await db.deals.count_documents({"user_id": current_user.id})
    total_tasks = await db.tasks.count_documents({"user_id": current_user.id})
    
    # Get deal value by stage
    deals = await db.deals.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)
    total_pipeline_value = sum(deal['value'] for deal in deals)
    
    deals_by_stage = {
        "qualification": {"count": 0, "value": 0},
        "proposal": {"count": 0, "value": 0},
        "negotiation": {"count": 0, "value": 0},
        "closed": {"count": 0, "value": 0}
    }
    
    for deal in deals:
        stage = deal['stage']
        if stage in deals_by_stage:
            deals_by_stage[stage]['count'] += 1
            deals_by_stage[stage]['value'] += deal['value']
    
    # Get contact status breakdown
    contacts = await db.contacts.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)
    contacts_by_status = {
        "lead": 0,
        "prospect": 0,
        "customer": 0
    }
    
    for contact in contacts:
        status = contact['status']
        if status in contacts_by_status:
            contacts_by_status[status] += 1
    
    # Get task status breakdown
    tasks = await db.tasks.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)
    tasks_by_status = {
        "pending": 0,
        "in_progress": 0,
        "completed": 0
    }
    
    for task in tasks:
        status = task['status']
        if status in tasks_by_status:
            tasks_by_status[status] += 1
    
    return {
        "total_contacts": total_contacts,
        "total_deals": total_deals,
        "total_tasks": total_tasks,
        "total_pipeline_value": total_pipeline_value,
        "deals_by_stage": deals_by_stage,
        "contacts_by_status": contacts_by_status,
        "tasks_by_status": tasks_by_status
    }


# AI Routes
@api_router.post("/ai/contact-insights", response_model=AIResponse)
async def get_contact_insights(request: AIContactInsightRequest, current_user: User = Depends(get_current_user)):
    openai_key = os.environ.get('OPENAI_API_KEY')
    if not openai_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    
    # Get contact
    contact = await db.contacts.find_one({"id": request.contact_id, "user_id": current_user.id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    # Get related deals and tasks
    deals = await db.deals.find({"contact_id": request.contact_id, "user_id": current_user.id}, {"_id": 0}).to_list(100)
    tasks = await db.tasks.find({"related_to": request.contact_id, "user_id": current_user.id}, {"_id": 0}).to_list(100)
    
    # Build context
    context = f"""Contact Information:
Name: {contact['name']}
Email: {contact['email']}
Company: {contact.get('company', 'N/A')}
Position: {contact.get('position', 'N/A')}
Status: {contact['status']}
Notes: {contact.get('notes', 'None')}

Related Deals: {len(deals)}
Related Tasks: {len(tasks)}
"""
    
    # Call GPT-4o
    chat = LlmChat(
        api_key=openai_key,
        session_id=f"contact-insight-{request.contact_id}",
        system_message="You are a CRM AI assistant helping with contact insights and analysis."
    ).with_model("openai", "gpt-4o")
    
    message = UserMessage(
        text=f"Analyze this contact and provide key insights, engagement recommendations, and next steps:\n\n{context}"
    )
    
    response = await chat.send_message(message)
    return AIResponse(content=response)

@api_router.post("/ai/email-draft", response_model=AIResponse)
async def generate_email_draft(request: AIEmailDraftRequest, current_user: User = Depends(get_current_user)):
    openai_key = os.environ.get('OPENAI_API_KEY')
    if not openai_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    
    # Get contact
    contact = await db.contacts.find_one({"id": request.contact_id, "user_id": current_user.id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    # Build context
    context = f"""Contact: {contact['name']}
Company: {contact.get('company', 'N/A')}
Position: {contact.get('position', 'N/A')}
Email Purpose: {request.purpose}
"""
    
    # Call GPT-4o
    chat = LlmChat(
        api_key=openai_key,
        session_id=f"email-draft-{request.contact_id}",
        system_message="You are a professional business email writer. Write clear, concise, and professional emails."
    ).with_model("openai", "gpt-4o")
    
    message = UserMessage(
        text=f"Write a professional email for this purpose: {request.purpose}\n\n{context}"
    )
    
    response = await chat.send_message(message)
    return AIResponse(content=response)

@api_router.post("/ai/deal-analysis", response_model=AIResponse)
async def analyze_deal(request: AIDealAnalysisRequest, current_user: User = Depends(get_current_user)):
    openai_key = os.environ.get('OPENAI_API_KEY')
    if not openai_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    
    # Get deal
    deal = await db.deals.find_one({"id": request.deal_id, "user_id": current_user.id}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    # Get contact
    contact = await db.contacts.find_one({"id": deal['contact_id']}, {"_id": 0})
    
    # Build context
    context = f"""Deal Information:
Title: {deal['title']}
Contact: {deal.get('contact_name', 'N/A')}
Value: ${deal['value']}
Stage: {deal['stage']}
Probability: {deal['probability']}%
Expected Close Date: {deal.get('expected_close_date', 'N/A')}
Notes: {deal.get('notes', 'None')}
"""
    
    if contact:
        context += f"\nContact Company: {contact.get('company', 'N/A')}\nContact Position: {contact.get('position', 'N/A')}"
    
    # Call GPT-4o
    chat = LlmChat(
        api_key=openai_key,
        session_id=f"deal-analysis-{request.deal_id}",
        system_message="You are a sales analytics expert helping with deal analysis and recommendations."
    ).with_model("openai", "gpt-4o")
    
    message = UserMessage(
        text=f"Analyze this deal and provide insights, risk assessment, and recommendations to close it:\n\n{context}"
    )
    
    response = await chat.send_message(message)
    return AIResponse(content=response)


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()