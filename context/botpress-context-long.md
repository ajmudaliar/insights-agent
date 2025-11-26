# Botpress Domain Context (Comprehensive)

## Company Overview

Botpress is an AI-powered conversational platform that enables organizations to build, deploy, and manage intelligent chatbots and AI agents. Founded as an open-source project, Botpress has evolved into a complete enterprise platform with over 900,000 users who have built more than 1.5 million bots, processing billions of conversations.

**Notable Clients:** Kia, Electronic Arts, Husqvarna, Windstream, Shell

**Community:** 26,000+ member Discord community

**Compliance:** SOC 2 certified, GDPR compliant

---

## Platform Architecture

### Studio (Stratus)

The Studio is the primary development environment where bot builders design, test, and configure their conversational AI agents.

#### Core Features

**Visual Flow Editor**
- Drag-and-drop interface for designing conversation workflows
- Node-based architecture: each node represents a step in the conversation
- Support for branching logic, conditions, and loops
- Real-time preview of conversation paths

**Prompt Management**
- Configure and test LLM prompts directly in the interface
- Prompt templates with variable injection
- A/B testing capabilities for prompt optimization
- Version history for prompt iterations

**Knowledge Base Management**
- Upload documents (PDF, Word, text files)
- Index websites for knowledge retrieval
- Vector-based semantic search (RAG)
- Automatic chunking and embedding generation
- Source attribution in responses

**Dialog Manager**
- Handle complex multi-turn conversations
- Context persistence across conversation sessions
- Slot filling for structured data collection
- Disambiguation handling for unclear intents

**Code Editor**
- Write custom JavaScript/TypeScript logic
- Access to full bot context and state
- External API integrations
- Custom action definitions

**Emulator**
- Test conversations before deployment
- Debug conversation state in real-time
- Simulate different user inputs
- View LLM reasoning and decisions

**Multiplayer Collaboration**
- Real-time collaborative editing
- Multiple team members working simultaneously
- Presence indicators showing active editors
- Change synchronization without conflicts

**Agent Capabilities**
- Define specialized AI agents with specific roles
- Agent chaining for complex task handling
- Autonomous decision-making within defined boundaries

**Integration Hub**
- Browse and connect 64+ pre-built integrations
- Configure integration credentials
- Map integration actions to conversation flows

---

### Dashboard (Genisys)

The Dashboard provides management, analytics, and operational capabilities for deployed bots.

#### Features

**Bot Management**
- Create, clone, and delete bots
- Configure bot settings and behaviors
- Deploy bots to production environments
- Version management and rollback

**Workspace Administration**
- Multi-workspace organization structure
- Role-based access control (RBAC)
- Team member invitations and permissions
- SSO integration for enterprise

**Analytics & Insights**
- Conversation volume metrics
- User engagement statistics
- Intent recognition accuracy
- Sentiment analysis
- Custom event tracking
- Export capabilities for BI tools

**Human-In-The-Loop (HITL)**
- Agent handover queue for escalated conversations
- Real-time notification of pending handoffs
- Agent assignment and routing
- Conversation takeover interface
- Handoff history and metrics

**Webchat Configuration**
- Customize widget appearance (colors, fonts, positioning)
- Configure greeting messages
- Set business hours and away messages
- Embed code generation

---

### Webchat Widget

The embeddable chat interface for web integration.

**Features:**
- Responsive design for mobile and desktop
- Customizable theming to match brand
- Rich message types:
  - Text with markdown formatting
  - Images and file attachments
  - Buttons and quick replies
  - Carousels and cards
  - Forms and input fields
- Typing indicators
- Read receipts
- Conversation history persistence
- Offline message queuing

**Integration Options:**
- Script tag injection
- React component library
- iframe embedding
- Shareable standalone URLs

---

### Backend Infrastructure (Skynet)

The serverless backend that powers bot execution and conversation management.

**Core Services:**

**Conversation API**
- Public API for client-facing messaging
- Private API for administrative operations
- Webhook endpoint for integration callbacks

**Message Processing**
- Real-time message routing
- State persistence and recovery
- Queue processing for async operations
- Rate limiting and throttling

**File Management**
- Secure file uploads and storage
- PDF processing and text extraction
- Image handling and thumbnails
- Document indexing for knowledge base

**Tables API**
- Cloud database for bot data
- Schema-less document storage
- Query and filtering capabilities
- Row-level security

**Real-Time Updates (Vortex)**
- WebSocket-based live updates
- Presence management
- Event broadcasting
- Connection state synchronization

---

## AI Capabilities

### Large Language Model Integration

Botpress integrates with multiple LLM providers:

**Supported Models:**
- OpenAI (GPT-4, GPT-4 Turbo, GPT-3.5)
- Anthropic (Claude 3 Opus, Sonnet, Haiku)
- Google AI (Gemini Pro, Gemini Ultra)
- Groq (fast inference)
- Fireworks AI
- Cerebras

**LLMz Custom Inference Engine**
- Internal orchestration layer
- Model routing and fallback
- Cost optimization
- Response caching

### Autonomous Nodes

LLM-powered conversation nodes that don't require predefined paths:

- Natural language understanding without rigid flows
- Dynamic response generation
- Context-aware decision making
- Guardrails for safe operation

### AI Agents

Specialized agents that enhance bot capabilities:

| Agent | Purpose |
|-------|---------|
| Translator | Automatic message translation to user's language |
| Summarizer | Condensing long conversations or documents |
| Personality | Maintaining consistent tone and style |
| Knowledge | RAG-based document retrieval and answering |

### Intent Recognition

Traditional NLU capabilities:
- Intent classification
- Entity extraction
- Sentiment analysis
- Language detection

---

## Integrations Ecosystem

### Communication Channels (10+)

| Channel | Capabilities |
|---------|-------------|
| Web (Webchat) | Full-featured, customizable widget |
| Slack | Direct messages, channels, threads |
| Microsoft Teams | Personal and team chat |
| WhatsApp | Business API integration |
| Messenger | Facebook Messenger platform |
| Instagram | Direct messages |
| Telegram | Bot API integration |
| Twilio | SMS and voice |
| Vonage | SMS messaging |
| LINE | Popular in Asian markets |
| Viber | Rich messaging features |
| Intercom | Customer support platform |

### CRM & Sales

| Integration | Use Cases |
|-------------|-----------|
| Salesforce | Lead management, case creation, contact sync |
| HubSpot | Contact management, deal tracking |
| Attio | Modern CRM operations |
| Freshchat | Support ticketing |

### Project Management

| Integration | Use Cases |
|-------------|-----------|
| Linear | Issue tracking, project updates |
| Asana | Task creation, project queries |
| Monday | Board updates, item management |
| ClickUp | Task management |
| Trello | Card creation, board queries |
| Jira | Issue management, sprint queries |

### Knowledge & Documentation

| Integration | Use Cases |
|-------------|-----------|
| Notion | Database queries, page creation |
| Confluence | Documentation search |
| Google Drive | Document access and search |
| Docusign | Document signing workflows |

### Productivity

| Integration | Use Cases |
|-------------|-----------|
| Google Calendar | Meeting scheduling, availability |
| Gmail | Email sending, inbox queries |
| Google Sheets | Data read/write operations |
| Airtable | Base operations |
| Calendly | Appointment scheduling |

### Email Marketing

| Integration | Use Cases |
|-------------|-----------|
| SendGrid | Transactional email |
| Mailchimp | Campaign management |
| Resend | Email delivery |
| Loops | Email automation |

### Automation

| Integration | Use Cases |
|-------------|-----------|
| Zapier | Connect to 5000+ apps |
| Make (Integromat) | Complex automation flows |

### Other Services

| Integration | Use Cases |
|-------------|-----------|
| Stripe | Payment processing |
| Zendesk | Ticket management |
| GitHub | Repository operations |
| Shopify | E-commerce queries |
| BigCommerce | Store management |

---

## Core Plugins

Plugins extend bot functionality with pre-built capabilities:

### Knowledge Plugin
- Document upload and indexing
- RAG-based question answering
- Source citation in responses
- Confidence scoring
- Fallback handling when no match found

### HITL (Human-In-The-Loop) Plugin
- Conversation escalation triggers
- Agent queue management
- Handoff routing rules
- Agent takeover interface
- Return-to-bot functionality

### Analytics Plugin
- Conversation metrics collection
- User engagement tracking
- Custom event logging
- Dashboard visualization
- Export to external tools

### Conversation Insights Plugin
- AI-powered conversation analysis
- Pattern discovery
- Sentiment trends
- Topic clustering

### Personality Plugin
- Bot persona configuration
- Tone and style settings
- Response guidelines
- Language preferences

### Logger Plugin
- Comprehensive activity logging
- Debug information capture
- Error tracking
- Audit trail

### File Synchronizer Plugin
- External document source sync
- Automatic knowledge base updates
- Scheduled refresh

### Synchronizer Plugin
- Data synchronization with external systems
- Bidirectional sync capabilities

---

## Development Tools

### SDK (@botpress/sdk)

TypeScript SDK for building custom bots and integrations:

```typescript
import { Bot } from '@botpress/sdk'

const bot = new Bot({
  integrations: [slack, notion],
  configuration: { ... }
})

bot.on.message(async ({ message, client }) => {
  await client.sendMessage({
    conversationId: message.conversationId,
    content: { text: 'Hello!' }
  })
})
```

### CLI (@botpress/cli)

Command-line tool for development workflow:

```bash
# Initialize new bot
bp init my-bot

# Start development server
bp dev

# Deploy to production
bp deploy

# Bundle for distribution
bp bundle
```

### Client Library (@botpress/client)

API client for programmatic access:

```typescript
import { Client } from '@botpress/client'

const client = new Client({
  token: 'bp_pat_...',
  workspaceId: 'wkspace_...',
  botId: 'bot_...'
})

const conversations = await client.listConversations()
```

### ADK (Agent Development Kit)

Framework for building autonomous AI agents:

- Workflow definitions
- State management
- Table schemas
- Trigger configurations
- Action definitions

---

## User Personas

### Bot Developer

**Profile:**
- Technical background (JavaScript/TypeScript)
- Building custom integrations
- Deploying via CLI
- Accessing APIs programmatically

**Common Tasks:**
- Write custom bot logic
- Build integrations with internal systems
- Optimize bot performance
- Debug conversation flows

**Pain Points:**
- Complex integration requirements
- Performance optimization
- Error handling and recovery
- Testing and deployment workflows

### Business User / Bot Builder

**Profile:**
- Non-technical or low-code experience
- Using Studio visual interface
- Creating bots for specific use cases
- Monitoring bot performance

**Common Tasks:**
- Design conversation flows
- Configure knowledge bases
- Set up integrations via UI
- Review analytics

**Pain Points:**
- Learning curve for advanced features
- Limitations of visual builder
- Understanding AI behavior
- Managing content updates

### Enterprise Administrator

**Profile:**
- IT or operations background
- Managing multiple bots and teams
- Ensuring compliance and security
- Controlling costs and usage

**Common Tasks:**
- User and permission management
- Security configuration
- Usage monitoring and optimization
- Integration with enterprise systems

**Pain Points:**
- Governance and compliance
- Cost management
- Security requirements
- Integration with existing IT infrastructure

### Customer Support Manager

**Profile:**
- Support operations background
- Managing agent handoff queues
- Analyzing conversation quality
- Optimizing deflection rates

**Common Tasks:**
- Monitor HITL queue
- Review escalated conversations
- Analyze support metrics
- Train and improve bot responses

**Pain Points:**
- Balancing automation and human touch
- Quality control
- Agent training on bot capabilities
- Measuring success

---

## Common Use Cases

### Customer Support Automation
- Tier-1 support deflection
- FAQ handling
- Ticket creation and routing
- Status inquiries
- Password resets

### Sales & Lead Qualification
- Initial lead capture
- Qualification questions
- Product recommendations
- Meeting scheduling
- CRM integration

### E-commerce Assistance
- Product search and recommendations
- Order status tracking
- Return processing
- Size and fit guidance
- Inventory queries

### IT Helpdesk
- Password reset requests
- Software installation help
- Troubleshooting guides
- Ticket creation
- Knowledge base search

### Internal Knowledge Access
- HR policy queries
- Benefits information
- Onboarding assistance
- Training resources
- Company directory

### Appointment Scheduling
- Availability checking
- Booking confirmation
- Rescheduling
- Reminders
- Calendar integration

---

## Technical Terminology Glossary

| Term | Definition |
|------|------------|
| **Bot** | A conversational AI agent built on the Botpress platform |
| **Workflow** | A long-running conversation process with multiple steps and state |
| **Node** | A single step or action in a conversation flow |
| **Autonomous Node** | LLM-powered node that handles conversations dynamically without predefined paths |
| **Flow** | A sequence of connected nodes defining a conversation path |
| **Intent** | The user's goal or purpose detected from their message |
| **Entity** | A specific piece of information extracted from user input (name, date, etc.) |
| **Slot** | A variable that stores extracted entity values |
| **HITL** | Human-In-The-Loop: escalation to human agents |
| **Handoff** | Transfer of conversation from bot to human agent |
| **Takeover** | When a human agent takes control of a bot conversation |
| **Channel** | A communication platform (Slack, web, WhatsApp, etc.) |
| **Integration** | A connection to an external service |
| **Webhook** | HTTP callback for receiving external events |
| **Knowledge Base** | Document repository for RAG-based retrieval |
| **RAG** | Retrieval-Augmented Generation: enhancing LLM with document context |
| **Tables** | Cloud database for storing bot-specific data |
| **State** | Conversation context persisted across messages |
| **Session** | A single conversation between user and bot |
| **Turn** | One exchange (user message + bot response) |
| **Utterance** | A user's input message |
| **Response** | Bot's reply to user input |
| **Card** | Rich message format with image, title, and buttons |
| **Carousel** | Horizontally scrollable set of cards |
| **Quick Reply** | Suggested response button for users |
| **Persona** | Bot's personality and communication style |
| **Fallback** | Default response when intent is not recognized |
| **Confidence Score** | Certainty level of intent classification (0-1) |
| **Training Data** | Sample utterances used to train intent recognition |
| **Workspace** | Organizational container for bots and team members |
| **Deployment** | Publishing bot to production environment |
| **Emulator** | Testing interface within Studio |
| **PAT** | Personal Access Token for API authentication |

---

## Pricing Model

### Free Tier
- Limited monthly messages
- Basic features
- Community support
- Single workspace

### Pay-As-You-Go
- Per-message pricing
- LLM token consumption
- Integration usage
- Scale as needed

### Enterprise
- Custom pricing
- SLA guarantees
- Dedicated support
- Advanced security features
- Custom integrations

---

## Competitive Landscape

**Direct Competitors:**
- Voiceflow
- Landbot
- ManyChat
- Intercom Fin
- Drift

**Differentiation:**
- Open-source heritage
- Advanced LLM integration
- Extensive integration library
- Developer-friendly SDK
- Visual + code flexibility
