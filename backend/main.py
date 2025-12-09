from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Optional
import uvicorn
from datetime import datetime
import json
import os

# Initialize FastAPI app
app = FastAPI(
    title="CanHav Research API",
    description="Backend API for CanHav Research website",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class ContactForm(BaseModel):
    name: str
    email: EmailStr
    company: Optional[str] = None
    message: str

class ContactResponse(BaseModel):
    success: bool
    message: str
    timestamp: datetime

# In-memory storage for demo (in production, use a database)
contacts_db = []

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "CanHav Research API",
        "version": "1.0.0",
        "status": "active"
    }

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now(),
        "service": "CanHav Research API"
    }

@app.post("/api/contact", response_model=ContactResponse)
async def submit_contact_form(contact: ContactForm):
    """Handle contact form submissions"""
    try:
        # Create contact entry
        contact_entry = {
            "id": len(contacts_db) + 1,
            "name": contact.name,
            "email": contact.email,
            "company": contact.company,
            "message": contact.message,
            "timestamp": datetime.now(),
            "status": "new"
        }
        
        # Store in database (in production, use proper database)
        contacts_db.append(contact_entry)
        
        # Log the contact (in production, use proper logging)
        print(f"New contact form submission from {contact.name} ({contact.email})")
        
        # Save to file for persistence (in production, use proper database)
        save_contact_to_file(contact_entry)
        
        return ContactResponse(
            success=True,
            message="Thank you for your message! We'll get back to you within 24 hours.",
            timestamp=datetime.now()
        )
        
    except Exception as e:
        print(f"Error processing contact form: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred while processing your request. Please try again."
        )

@app.get("/api/contacts")
async def get_contacts():
    """Get all contact form submissions (admin endpoint)"""
    return {
        "contacts": contacts_db,
        "total": len(contacts_db)
    }

@app.get("/api/research/stats")
async def get_research_stats():
    """Get research statistics for the homepage"""
    return {
        "reports": 500,
        "clients": 50,
        "data_points": 1000000,
        "last_updated": datetime.now()
    }

@app.get("/api/market-map")
async def get_market_map():
    """Get market map data"""
    return {
        "categories": [
            {
                "name": "DeFi Protocols",
                "count": 150,
                "growth": "+25%"
            },
            {
                "name": "NFT Marketplaces", 
                "count": 75,
                "growth": "+15%"
            },
            {
                "name": "Layer 2 Solutions",
                "count": 25,
                "growth": "+40%"
            },
            {
                "name": "Infrastructure",
                "count": 200,
                "growth": "+30%"
            }
        ],
        "total_projects": 450,
        "last_updated": datetime.now()
    }

def save_contact_to_file(contact_entry):
    """Save contact to JSON file for persistence"""
    try:
        # Create data directory if it doesn't exist
        os.makedirs("data", exist_ok=True)
        
        # Load existing contacts
        contacts_file = "data/contacts.json"
        if os.path.exists(contacts_file):
            with open(contacts_file, "r") as f:
                existing_contacts = json.load(f)
        else:
            existing_contacts = []
        
        # Convert datetime to string for JSON serialization
        contact_entry_serializable = contact_entry.copy()
        contact_entry_serializable["timestamp"] = contact_entry["timestamp"].isoformat()
        
        # Add new contact
        existing_contacts.append(contact_entry_serializable)
        
        # Save back to file
        with open(contacts_file, "w") as f:
            json.dump(existing_contacts, f, indent=2)
            
    except Exception as e:
        print(f"Error saving contact to file: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
