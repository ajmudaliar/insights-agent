# Botpress Domain Context (Medium)

## Overview

Botpress is an enterprise-grade AI agent platform that enables organizations to build, deploy, and manage conversational AI assistants. The platform combines visual development tools with powerful LLM capabilities, allowing both technical and non-technical users to create sophisticated chatbots.

## Platform Architecture

### Studio (Bot Builder)
The visual development environment where bots are created and configured:
- **Flow Editor**: Drag-and-drop interface for designing conversation workflows
- **Prompt Management**: Configure and test LLM prompts
- **Knowledge Base**: Upload documents and websites to enable RAG-based responses
- **Dialog Manager**: Handle complex multi-turn conversations
- **Code Editor**: Custom JavaScript/TypeScript logic
- **Emulator**: Test bots before deployment
- **Multiplayer**: Real-time collaborative editing

### Dashboard
The management interface for bot operations:
- Bot creation, configuration, and deployment
- Workspace and user management
- Analytics and conversation insights
- Human-in-the-loop (HITL) agent handover queue
- Billing and usage tracking

### Webchat
Embeddable chat widget for web integration:
- Customizable appearance
- Real-time messaging
- File uploads
- Rich message types (cards, carousels, buttons)

### Backend (Skynet)
Serverless infrastructure handling:
- Conversation state management
- Message routing and persistence
- Integration webhook processing
- File and table storage APIs
- Real-time updates

## Key Capabilities

### AI Features
- **Autonomous Nodes**: LLM-guided conversation without rigid flows
- **AI Agents**: Specialized agents (Translator, Summarizer, etc.)
- **Knowledge Base**: Vector-based document retrieval (RAG)
- **Intent Recognition**: NLU-based user intent classification
- **Entity Extraction**: Extract structured data from messages

### Integrations (64+)
- **Communication**: Slack, Teams, WhatsApp, Messenger, Instagram, Telegram, Twilio
- **CRM**: Salesforce, HubSpot, Freshchat
- **Project Management**: Linear, Asana, Jira, Trello, Monday
- **Knowledge**: Notion, Confluence, Google Drive
- **Email**: Gmail, SendGrid, Mailchimp
- **AI Models**: OpenAI, Anthropic, Google AI, Groq

### Core Plugins
- **Knowledge**: Document-based Q&A
- **HITL**: Human agent escalation
- **Analytics**: Conversation metrics
- **Personality**: Bot tone/style configuration
- **Logger**: Comprehensive logging

## User Segments

### Developers
- Build custom integrations using SDK
- Deploy via CLI (`bp deploy`)
- Access full API programmatically

### Business Users
- Create bots visually in Studio
- Configure without code
- Monitor via Dashboard analytics

### Enterprise Teams
- Multi-workspace management
- SSO and role-based access
- Compliance features (SOC 2, GDPR)

## Common Use Cases
- Customer support automation
- Lead qualification and sales assistance
- IT helpdesk and ticket deflection
- E-commerce shopping assistants
- Internal knowledge base access
- Appointment scheduling

## Technical Terminology

| Term | Description |
|------|-------------|
| Workflow | Long-running conversation process with multiple steps |
| Node | Single step in a conversation flow |
| Autonomous Node | LLM-powered node without predefined paths |
| HITL | Human-In-The-Loop agent handover |
| Tables | Botpress cloud database for bot data |
| Knowledge Base | Document storage for RAG retrieval |
| Channel | Communication platform (Slack, web, etc.) |
| Integration | Third-party service connector |
| Plugin | Reusable bot capability module |

## Pricing Model
- Free tier with limited usage
- Pay-as-you-go based on messages and AI tokens
- Enterprise plans for high-volume usage
