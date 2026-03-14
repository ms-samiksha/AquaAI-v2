# AquaAI - Agentic Marine Intelligence

**AI-powered fish identification and aquarium care assistant powered by Amazon Nova 2 Lite and AWS Bedrock.**

🐠 Hackathon Project | 🤖 Amazon Nova | ☁️ AWS Bedrock | 🔗 FastAPI | ⚛️ Next.js

## 🌊 Project Overview

AquaAI is a full-stack application that uses computer vision and LLMs to:
1. **Identify fish species** from photos using Amazon Nova
2. **Extract visual features** (color, pattern, body shape)
3. **Generate care guides** with tank requirements, feeding schedules, compatibility
4. **Answer follow-up questions** with persistent species context via chat

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   FRONTEND (Next.js)                    │
│  ┌──────────────────┬──────────────────────────────┐   │
│  │  Upload Page     │  Results Page + Chat Sidebar │   │
│  │  - Drag & Drop   │  - Species Profile           │   │
│  │  - Preview       │  - Care Guide                │   │
│  │  - Analysis      │  - Compatibility Matrix      │   │
│  └──────────────────┴──────────────────────────────┘   │
└──────────────────────┬────────────────────────────────┘
                       │ HTTP REST API
                       ↓
┌──────────────────────────────────────────────────────────────┐
│            BACKEND (FastAPI @ localhost:8000)                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  POST /analyze        POST /chat        GET /health  │   │
│  │  ├─ Validate Image    ├─ Species Name   └─ Status   │   │
│  │  ├─ Upload to S3      ├─ User Message               │   │
│  │  ├─ Extract Features  ├─ Chat History              │   │
│  │  ├─ Identify Species  └─ Context Injection         │   │
│  │  └─ Generate Care                                   │   │
│  └──────────────────────────────────────────────────────┘   │
│         ↓                ↓                 ↓                 │
│  ┌────────────┐  ┌────────────┐  ┌────────────────┐         │
│  │  S3 Utils  │  │Vision Agent│  │ Species Agent  │         │
│  │ - Upload   │  │ - Extract  │  │ - Identify     │         │
│  │ - Presign  │  │ - Features │  │ - Confidence   │         │
│  └────────────┘  └────────────┘  └────────────────┘         │
│         │                                      │             │
│  ┌────────────────────────────────────────────────────┐     │
│  │         Nova Client (Bedrock)                      │     │
│  │  ├─ Vision: Feature extraction from image          │     │
│  │  ├─ Species: ID fish from features                 │     │
│  │  ├─ Care: Tank size, temp, feeding, etc            │     │
│  │  └─ Chat: Context-aware Q&A with species info      │     │
│  └────────────────────────────────────────────────────┘     │
└───────────────┬────────────────────────────────┬────────────┘
                │                                │
                ↓                                ↓
        ┌────────────────┐          ┌─────────────────────┐
        │ AWS Bedrock    │          │  Amazon S3          │
        │ Nova 2 Lite    │          │  (aquaai-images)    │
        │ Inference      │          │  - Store images     │
        │ Profile        │          │  - Presigned URLs   │
        └────────────────┘          └─────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- **AWS Account** with Bedrock enabled
- **Nova 2 Lite** inference profile ARN
- **Python 3.11+** and **Node.js 18+**
- **Git** and **pip**

### Backend Setup

1. **Clone and navigate**
   ```bash
   cd aquaAI
   python -m venv venv
   # Windows
   venv\Scripts\Activate.ps1
   # macOS/Linux
   source venv/bin/activate
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your AWS credentials and S3 bucket
   ```

4. **Start backend** (runs on `http://localhost:8000`)
   ```bash
   python main.py
   ```

   **API Documentation**: Visit `http://localhost:8000/docs` for Swagger UI

### Frontend Setup

1. **Navigate to frontend**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Update NEXT_PUBLIC_API_URL if needed (default: http://localhost:8000)
   ```

4. **Start frontend** (runs on `http://localhost:3000`)
   ```bash
   npm run dev
   ```

5. **Open browser**: `http://localhost:3000`

## 📋 Use Cases & Flows

### Flow 1: Fish Identification

1. User uploads fish image
2. Backend uploads image to S3 (presigned URL)
3. **Vision Agent** extracts features (color, pattern, shape)
4. **Species Agent** identifies species from features
5. **Care Agent** generates comprehensive care guide
6. Results displayed in beautiful card layout

### Flow 2: Care Guide Chat

1. User clicks "Chat about [Species]"
2. Chat panel opens with species context pre-loaded
3. User asks aquarium care questions
4. **Chat Agent** uses:
   - Identified species info
   - Care guide details (tank size, temp, pH, feeding)
   - System prompt preventing hallucinations
5. Context-aware responses delivered

## 🤖 Amazon Nova Integration

### Vision Agent
**Purpose**: Extract structured features from image description
```python
Input:  Fish image → describe appearance
Output: 
{
  "body_shape": "torpedo-shaped",
  "dominant_color": "yellow and black",
  "pattern": "vertical stripes",
  "distinctive_traits": ["dorsal fin spikes", "whisker-like barbels"]
}
```

### Species Agent
**Purpose**: Identify species from visual features
```python
Input:  Visual features dict
Output:
{
  "species_name": "Panda Corydoras (Corydoras panda)",
  "confidence": 0.85,
  "description": "Small catfish with distinctive black patches...",
  "common_names": ["Panda Cory", "Panda Catfish"]
}
```

### Care Agent
**Purpose**: Generate aquarium care guide
```python
Input:  Species name
Output:
{
  "category": "freshwater",
  "tank_size_liters": 20,
  "temperature_celsius": "22-26°C",
  "ph_range": "6.0-7.0",
  "feeding_schedule": "1-2 times daily",
  "compatible_species": ["Neon Tetras", "Cardinal Tetras", ...],
  "interesting_facts": ["Bottom feeders", "Peaceful community fish", ...]
}
```

### Chat Agent
**Purpose**: Answer species-specific questions with context
- System prompt includes: species name, description, care guide
- Prevents hallucinations: scope to aquarium care only
- Temperature: 0.3 (deterministic, accuracy-focused)
- Max tokens: 1024 for detailed answers

## 📂 Project Structure

```
aquaAI/
├── backend/
│   ├── main.py                 # FastAPI app with /analyze, /chat endpoints
│   ├── nova_client.py          # Bedrock client for all Nova calls
│   ├── vision_agent.py         # Feature extraction (uses nova_client)
│   ├── species_agent.py        # Species identification agent
│   ├── care_agent.py           # Care guide generation agent
│   ├── chat_agent.py           # Context-aware chatbot agent
│   ├── aquaai_pipeline.py      # Orchestrates all agents
│   ├── s3_utils.py             # S3 upload, presigned URL, download
│   ├── schemas.py              # Pydantic models for validation
│   ├── requirements.txt         # Python dependencies
│   └── .env.example            # Environment template
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx            # Upload page (home)
│   │   ├── results/
│   │   │   └── page.tsx        # Results + chat sidebar
│   │   ├── layout.tsx          # Root layout with ocean gradient
│   │   └── globals.css         # Tailwind + custom animations
│   ├── components/
│   │   ├── UploadCard.tsx      # Drag-drop upload with preview
│   │   ├── ResultCard.tsx      # Species + care guide display
│   │   └── ChatPanel.tsx       # Chat sidebar component
│   ├── package.json            # Node dependencies
│   ├── next.config.js          # Next.js config
│   ├── tailwind.config.ts      # Tailwind theme customization
│   ├── tsconfig.json           # TypeScript config
│   └── .env.example            # Frontend env template
│
├── README.md                   # This file
└── SETUP.md                    # Detailed deployment guide
```

## 🔑 Key Features

### Backend Highlights
✅ **Modular Agent Architecture** - Each task is a separate agent for reusability  
✅ **Bedrock Integration** - Full Nova 2 Lite support with inference profiles  
✅ **S3 Integration** - Automatic image upload, presigned URL generation  
✅ **Error Handling** - Comprehensive validation and error messages  
✅ **CORS Enabled** - Ready for frontend communication  
✅ **JSON Schema Enforcement** - Pydantic validation for data integrity  

### Frontend Highlights
⚛️ **Next.js 14** - Modern React framework with TypeScript  
🎨 **Glassmorphism UI** - Ocean-themed design with Tailwind CSS  
📱 **Responsive Layout** - Works on desktop, tablet, mobile  
🖼️ **Image Preview** - Drag-drop with immediate preview  
💬 **Live Chat** - Session context management in React state  
🌊 **Ocean Animations** - Floating blobs, pulse effects, smooth transitions  

## 🔒 AWS Configuration

### Required Permissions (IAM)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": "arn:aws:bedrock:*:*:inference-profile/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::aquaai-images",
        "arn:aws:s3:::aquaai-images/*"
      ]
    }
  ]
}
```

### S3 Bucket Setup
```bash
# Create bucket
aws s3 mb s3://aquaai-images --region us-east-1

# Enable CORS (optional, for direct uploads)
aws s3api put-bucket-cors --bucket aquaai-images --cors-configuration file://cors.json
```

## 📈 Performance & Costs

| Component | Inference Time | Cost (per call) |
|-----------|----------------|-----------------|
| Vision Feature Extraction | ~2-3s | ~$0.0004 |
| Species Identification | ~2-3s | ~$0.0004 |
| Care Guide Generation | ~3-4s | ~$0.0004 |
| Chat Response | ~2-3s | ~$0.0004 |
| **Full Pipeline** | **~9-13s** | **~$0.0016** |
| **S3 Operations** | <100ms | ~$0.000005 |

*Costs based on Nova 2 Lite pricing (~$0.00005 per input token, ~$0.0002 per output token)*

## 🎯 Hackathon Highlights

✨ **Enterprise Architecture**
- Clean separation of concerns
- Modular agent system
- Reusable components
- Production-ready error handling

🚀 **AWS Best Practices**
- Inference profiles for cost optimization
- Presigned URLs for secure S3 access
- IAM least-privilege permissions
- Async operations where applicable

🎨 **User Experience**
- Intuitive drag-drop upload
- Real-time analysis with loading states
- Beautiful ocean-themed UI
- Context-aware chat panel

🔧 **Developer Experience**
- Type-safe TypeScript + Python
- Comprehensive API docs (Swagger)
- Example .env files
- Clear project structure

## 🐛 Troubleshooting

**"No JSON found in response"**
- Nova may return non-JSON output
- Check Nova model output in CloudWatch logs
- Adjust prompts for stricter formatting

**"S3 bucket not found"**
- Verify bucket name in .env
- Check AWS credentials and region
- Run `aws s3 ls` to list buckets

**"CORS error from frontend"**
- Ensure backend CORS is enabled (it is by default)
- Check if frontend URL is in allowed origins
- Verify backend is running on :8000

**"Token limit exceeded"**
- Reduce chat history length (keep last 6 messages)
- Use shorter species descriptions
- Increase max_tokens in nova_client.py if needed

## 📚 Additional Resources

- [Amazon Bedrock Docs](https://docs.aws.amazon.com/bedrock/)
- [Nova Model Cards](https://aws.amazon.com/bedrock/nova/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)

## 📝 License

Built for the 2026 Hackathon - Feel free to modify and extend!

---

**🌟 Happy Aquarium Keeping!** 🐠

*AquaAI: Where AI meets Aquatics*
