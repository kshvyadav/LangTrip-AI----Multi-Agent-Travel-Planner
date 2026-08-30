# 🌍 LangTrip AI — Autonomous Multi-Agent Travel Planner

[![LangGraph](https://img.shields.io/badge/Orchestration-LangGraph%201.2-blue?style=for-the-badge&logo=python)](https://github.com/langchain-ai/langgraph)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![Model Context Protocol](https://img.shields.io/badge/Protocol-Model%20Context%20Protocol%20(MCP)-purple?style=for-the-badge)](https://modelcontextprotocol.io/)
[![PostgreSQL](https://img.shields.io/badge/State_Persistence-PostgreSQL-336791?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)

**LangTrip AI** is a state-of-the-art autonomous travel planning engine built on **LangGraph**, **Model Context Protocol (MCP)**, and **FastAPI**. It leverages a multi-agent cognitive architecture featuring a **Supervisor Router**, **Input Guardrails**, **Specialized Sub-Agents** (Flight, Hotel, Weather, Budget, Itinerary), **PostgreSQL State Persistence**, and **Human-in-the-Loop (HITL)** approval workflows.

---

## 🌟 Key Features

- 🛡️ **Intelligent Input Guardrail**: Evaluates traveler intent, filters out unrelated or unsafe prompts, and prevents hallucinated travel requests.
- 🧠 **Dynamic Supervisor Routing**: Analyzes user constraints (origin, destination, budget, duration, travel style) and activates only the specialized agents required for the trip.
- ✈️ **Flight Specialist**: Resolves city/country names into exact 3-letter IATA airport codes and retrieves live flight schedules, airlines, routes, and departure/arrival delays via **AviationStack**.
- 🏨 **Hotel & Neighborhood Scout**: Conducts live web research via **Tavily MCP** to identify top-rated accommodations, location advantages, and area safety.
- 🌦️ **Weather Forecaster (FastMCP)**: Connects to a custom **FastMCP Weather Server** exposing OpenWeather API tools for real-time temperatures and 5-day climate forecasts.
- 💰 **Budget & Feasibility Analyst**: Evaluates estimated flight + hotel + daily expenses against user constraints, highlights budget risks, and provides money-saving strategies.
- 📋 **Itinerary Architect**: Synthesizes specialist findings into a cohesive, structured day-by-day travel plan.
- ⏸️ **Human-in-the-Loop (HITL) Checkpoint**: Pauses graph execution at LangGraph's `interrupt()` node, allowing travelers to review preliminary drafts, suggest specific revisions, or approve the final plan.
- 💾 **PostgreSQL Session Memory**: Preserves thread state across pauses and resumes using `PostgresSaver`.


---

## 🏗️ Architecture & Agent Workflow

```mermaid
flowchart TD
    Start([User Request]) --> Guardrail[Input Guardrail]
    Guardrail -->|Invalid/Blocked| BlockedEnd([Return Guardrail Block Message])
    Guardrail -->|Valid Travel Request| Supervisor[Supervisor Agent]
    
    Supervisor -->|Dynamic Route| Specialists
    
    subgraph Specialists [Specialized AI Agents]
        direction TB
        FlightAgent[✈️ Flight Agent - AviationStack]
        HotelAgent[🏨 Hotel Scout - Tavily MCP]
        WeatherAgent[🌦️ Weather Forecaster - FastMCP]
        BudgetAgent[💰 Budget Analyst]
    end

    Specialists --> ItineraryAgent[📋 Itinerary Architect]
    ItineraryAgent --> HITL[⏸️ Human-in-the-Loop Interrupt]
    
    HITL -->|Draft Review| UserDecision{Traveler Decision}
    UserDecision -->|Approved| Polish[🌟 Final Polish & Formatting]
    UserDecision -->|Revision Requested + Feedback| Revise[✏️ Feedback-Guided Revision]
    
    Polish --> MasterPlan([Final Personalized Travel Plan])
    Revise --> MasterPlan
```

---

## 📂 Project Directory Structure

```
LangTrip-AI----Multi-Agent-Travel-Planner/
├── app.py                         # FastAPI web server & API route handlers
├── backend.py                     # LangGraph StateGraph, supervisor, agents & checkpointer
├── mcp_client.py                  # MultiServerMCPClient (Tavily, AviationStack, Weather)
├── custom_weather_mcp_server.py   # FastMCP OpenWeather stdio server
├── requirements.txt               # Project dependencies
├── .env                           # Environment configuration (API keys & DB URL)
├── tools/
│   ├── flight_tool.py             # AviationStack & IATA location resolver
│   └── tavily_tool.py             # Tavily web search integration
├── templates/
│   └── index.html                 # Glassmorphic frontend web application
└── static/
    ├── style.css                  # Modern responsive design system
    └── script.js                  # Frontend controller & tabbed UI state manager
```

---

## 🛠️ Technology Stack

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Agent Orchestration** | [LangGraph](https://github.com/langchain-ai/langgraph) | Cyclic graph workflows, conditional routing, state management |
| **Tool Protocol** | [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) | Standardized tool calling for live search, flights & weather |
| **Web Framework** | [FastAPI](https://fastapi.tiangolo.com/) | Asynchronous REST API and Jinja2 template rendering |
| **State Persistence** | [PostgreSQL Checkpointer](https://pypi.org/project/langgraph-checkpoint-postgres/) | Thread persistence across Human-in-the-Loop interrupts |
| **LLM Inference** | [Ollama (Llama 3.2)](https://ollama.com/) / [Groq](https://groq.com/) | Agent reasoning, guardrails, and plan generation |
| **Flight Intelligence** | [AviationStack API](https://aviationstack.com/) & `airportsdata` | Real-time routes, airline schedules, and IATA resolution |
| **Web Research** | [Tavily AI](https://tavily.com/) | Real-time hotel, attraction, and neighborhood research |
| **Weather Tools** | [FastMCP](https://github.com/jlowin/fastmcp) & [OpenWeatherMap](https://openweathermap.org/) | Live climate data & 5-day destination forecasts |
| **Frontend** | Vanilla HTML5 / CSS3 / JavaScript | Responsive luxury travel UI |

---

## ⚙️ Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/kshvyadav/LangTrip-AI----Multi-Agent-Travel-Planner.git
cd LangTrip-AI----Multi-Agent-Travel-Planner
```

### 2. Create and Activate a Virtual Environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux / macOS
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables
Create a `.env` file in the root directory:

```env
# AviationStack Flight API Key
AVIATIONSTACK_API_KEY="your_aviationstack_api_key"

# Tavily Search API Key
TAVILY_API_KEY="your_tavily_api_key"

# OpenWeatherMap API Key
OPENWEATHER_API_KEY="your_openweather_api_key"

# Default Departure IATA Code (e.g. DEL for Delhi, DAC for Dhaka, JFK for New York)
DEFAULT_ORIGIN_IATA="DEL"

# PostgreSQL Connection String (for thread persistence)
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"

# Optional: LangSmith Tracing
LANGCHAIN_TRACING="true"
LANGSMITH_PROJECT="LangTrip-AI"
LANGSMITH_ENDPOINT="https://api.smith.langchain.com"
LANGSMITH_API_KEY="your_langsmith_api_key"
```

---

## 🚀 Running the Application

### Start the FastAPI Server:
```bash
python app.py
```
Or with Uvicorn directly:
```bash
uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```

Open your browser and navigate to:
```
http://127.0.0.1:8000
```

---

## 📡 API Reference

### 1. `POST /api/travel`
Initiates a new travel planning run through the supervisor graph.

**Request Body:**
```json
{
  "message": "Plan a 7 days Japan trip from Delhi with budget hotels and sightseeing under 2.5 lakhs.",
  "thread_id": null
}
```

**Response:**
```json
{
  "success": true,
  "thread_id": "user_4a89fb12e3...",
  "answer": "Draft itinerary markdown...",
  "requires_approval": true,
  "approval_request": "Please review the generated draft itinerary...",
  "flight_results": "...",
  "hotel_results": "...",
  "weather_results": "...",
  "budget_results": "...",
  "itinerary": "...",
  "selected_agents": ["flight_agent", "hotel_agent", "weather_agent", "budget_agent", "itinerary_agent"],
  "guardrail_allowed": true
}
```

---

### 2. `POST /api/travel/approve`
Resumes a paused StateGraph execution with human approval or revision feedback.

**Request Body:**
```json
{
  "thread_id": "user_4a89fb12e3...",
  "approved": true,
  "feedback": "Please add more vegetarian food options in Kyoto."
}
```

---

### 3. `GET /health`
Returns system status and active multi-agent features.

---
