# AquaAI - Detailed Setup & Deployment Guide

## 📋 Table of Contents
1. [Local Development Setup](#local-development-setup)
2. [AWS Configuration](#aws-configuration)
3. [Environment Variables](#environment-variables)
4. [Running the Application](#running-the-application)
5. [API Endpoints](#api-endpoints)
6. [Deployment Options](#deployment-options)
7. [Troubleshooting](#troubleshooting)

---

## 🔧 Local Development Setup

### System Requirements
- **OS**: Windows 10+, macOS 10.14+, or Ubuntu 18.04+
- **Python**: 3.11 or higher
- **Node.js**: 18 or higher
- **Git**: Latest version
- **RAM**: 4GB minimum (8GB recommended)
- **Disk**: 2GB free space

### Step 1: Clone and Extract Project

```bash
cd ~/Desktop
# If not already extracted, extract aquaAI folder
```

### Step 2: Set Up Python Virtual Environment

```bash
cd aquaAI

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows PowerShell
.\venv\Scripts\Activate.ps1

# Windows Command Prompt
venv\Scripts\activate.bat

# macOS/Linux
source venv/bin/activate
```

### Step 3: Install Backend Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 4: Set Up Frontend

```bash
cd frontend

# Install Node dependencies
npm install

cd ..
```

---

## ☁️ AWS Configuration

### Prerequisites
1. **AWS Account** - Created and verified
2. **Bedrock Access** - Anthropic/Nova models enabled
3. **AWS CLI Configured** - With credentials

### Step 1: Verify AWS Credentials

```bash
# Test AWS CLI access
aws sts get-caller-identity

# Output should show your account details:
# {
#     "UserId": "AIDAI...",
#     "Account": "123456789012",
#     "Arn": "arn:aws:iam::123456789012:user/your-user"
# }
```

### Step 2: Get Your Nova Inference Profile ARN

You already have: `arn:aws:bedrock:us-east-1:452031276818:application-inference-profile/8wimphg6jjvj`

To verify it works:
```bash
aws bedrock-runtime invoke-model \
  --model-id "arn:aws:bedrock:us-east-1:452031276818:application-inference-profile/8wimphg6jjvj" \
  --body '{"messages":[{"role":"user","content":[{"text":"Hello"}]}]}' \
  /tmp/response.json
```

### Step 3: Create S3 Bucket

```bash
# Create bucket
aws s3 mb s3://aquaai-images --region us-east-1

# Verify creation
aws s3 ls

# Enable versioning (recommended)
aws s3api put-bucket-versioning \
  --bucket aquaai-images \
  --versioning-configuration Status=Enabled

# Set bucket policy to allow presigned URLs
aws s3api put-bucket-policy \
  --bucket aquaai-images \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "AllowPresignedAccess",
        "Effect": "Allow",
        "Principal": "*",
        "Action": "s3:GetObject",
        "Resource": "arn:aws:s3:::aquaai-images/*"
      }
    ]
  }'
```

### Step 4: Configure IAM Permissions (if needed)

If using a specific IAM user, ensure these permissions:

```bash
# Attach inline policy to user
aws iam put-user-policy \
  --user-name your-username \
  --policy-name AquaAIBedrock \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": "bedrock:InvokeModel",
        "Resource": "arn:aws:bedrock:us-east-1:*:application-inference-profile/*"
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
  }'
```

---

## 🔐 Environment Variables

### Backend Configuration (.env)

```bash
# Copy example
cp .env.example .env

# Edit with your values
nano .env
```

**Required Variables**:
```env
# AWS Configuration
AWS_REGION=us-east-1
AWS_PROFILE_ARN=arn:aws:bedrock:us-east-1:452031276818:application-inference-profile/8wimphg6jjvj

# S3 Configuration
S3_BUCKET_NAME=aquaai-images

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Nova Configuration
NOVA_TEMPERATURE=0.3
NOVA_MAX_TOKENS=1024
```

**AWS Credentials** (if not using ~/.aws/credentials):
```env
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

### Frontend Configuration (.env.local)

```bash
# In frontend/ directory
cp .env.example .env.local

# Edit if needed
nano .env.local
```

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 🚀 Running the Application

### Terminal 1: Start Backend

```bash
# From aquaAI root directory (venv activated)
python main.py

# Expected output:
# [11:23:45] INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
# [11:23:45] INFO:     Application startup complete
```

**Test backend is running**:
```bash
curl http://localhost:8000/health
# Should return: {"status":"healthy","service":"AquaAI"}
```

### Terminal 2: Start Frontend

```bash
# From aquaAI/frontend directory
npm run dev

# Expected output:
# ▲ Next.js 14.0.0
# - Local:        http://localhost:3000
# - Environments: .env.local
# ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

### Terminal 3: Monitor Logs (Optional)

```bash
# Watch CloudWatch logs (requires AWS CLI)
aws logs tail /aws/bedrock --follow

# Or check local Python logs
tail -f aquaai.log
```

---

## 📡 API Endpoints

### Health Check
```bash
GET /health

Response:
{
  "status": "healthy",
  "service": "AquaAI"
}
```

### Analyze Fish Image
```bash
POST /analyze
Content-Type: multipart/form-data

File: aquarium_image.jpg

Response:
{
  "image_url": "https://aquaai-images.s3.amazonaws.com/...",
  "s3_key": "fish-images/abc12345.jpg",
  "visual_features": {
    "body_shape": "torpedo-shaped",
    "dominant_color": "yellow and black",
    "pattern": "vertical stripes",
    "distinctive_traits": ["dorsal fin spikes"]
  },
  "species": {
    "species_name": "Panda Corydoras",
    "confidence": 0.92,
    "description": "Small peaceful catfish...",
    "common_names": ["Panda Cory", "Panda Catfish"]
  },
  "care_guide": {
    "category": "freshwater",
    "tank_size_liters": 20,
    "tank_size_gallons": 5,
    "tank_dimensions_cm": "60 x 30 x 30",
    "temperature_celsius": "22-26°C",
    "temperature_fahrenheit": "72-79°F",
    "ph_range": "6.0-7.0",
    "general_hardness": "5-15 dGH",
    "feeding_schedule": "1-2 times daily",
    "feeding_types": ["pellets", "vegetables", "algae wafers"],
    "compatible_species": ["Neon Tetras", "Cardinal Tetras"],
    "incompatible_species": ["Piranhas", "Large Cichlids"],
    "breeding_difficulty": "moderate",
    "care_difficulty": "intermediate",
    "average_lifespan_years": 3,
    "interesting_facts": ["Bottom feeders", "Peaceful"]
  }
}
```

### Chat About Fish
```bash
POST /chat
Content-Type: application/json

Request:
{
  "species_name": "Panda Corydoras",
  "message": "What is the ideal water temperature for this fish?",
  "chat_history": [
    {"role": "user", "content": "Previous message"},
    {"role": "assistant", "content": "Previous response"}
  ]
}

Response:
{
  "reply": "The Panda Corydoras thrives in temperatures between 22-26°C (72-79°F)...",
  "species_context": "Tank: 20L (5G) - 60 x 30 x 30\nWater Type: freshwater\nTemperature: 22-26°C / 72-79°F\n..."
}
```

### Test with curl

```bash
# Test image upload
curl -X POST http://localhost:8000/analyze \
  -F "file=@fish_photo.jpg"

# Test chat
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "species_name": "Goldfish",
    "message": "How big of a tank does this fish need?",
    "chat_history": []
  }'
```

---

## 🌐 Deployment Options

### Option 1: AWS EC2 + ECS

**Coming soon**: Dockerized deployment guide

### Option 2: Google Cloud Run + Cloud Functions

**Coming soon**

### Option 3: Heroku

```bash
# Install Heroku CLI
# heroku login
# heroku create aquaai-app
# git push heroku main
```

### Option 4: Local Production Mode

```bash
# Backend
gunicorn -w 4 -b 0.0.0.0:8000 main:app

# Frontend  
npm run build
npm run start
```

---

## 🐛 Troubleshooting

### Issue: "ModuleNotFoundError: No module named 'boto3'"

**Solution**:
```bash
# Ensure venv is activated
source venv/bin/activate  # macOS/Linux
.\venv\Scripts\Activate.ps1  # Windows

# Reinstall requirements
pip install -r requirements.txt
```

### Issue: "Connection refused: localhost:8000"

**Solution**:
```bash
# Check if backend is running
curl http://localhost:8000/health

# Restart backend
# Ctrl+C to stop, then:
python main.py
```

### Issue: "Invalid S3 bucket name"

**Solution**:
```bash
# Verify bucket exists and is accessible
aws s3 ls aquaai-images

# If error, create bucket
aws s3 mb s3://aquaai-images --region us-east-1

# Update .env S3_BUCKET_NAME
```

### Issue: "AccessDenied when invoking model"

**Solution**:
1. Verify Bedrock is enabled in your AWS account
2. Check Nova models are available in us-east-1
3. Verify IAM user has bedrock:InvokeModel permission

```bash
# Test model access
aws bedrock list-foundation-models --region us-east-1
```

### Issue: "Frontend can't reach backend"

**Solution**:
1. Verify backend is running (`http://localhost:8000/health`)
2. Check frontend .env.local has correct API_URL
3. Check browser console for CORS errors
4. Ensure backend CORS allows `http://localhost:3000`

```bash
# Backend CORS is enabled by default, but verify main.py has:
# allow_origins=["http://localhost:3000", "*"]
```

### Issue: "Image upload fails"

**Solution**:
1. Check file size < 10MB
2. Check format is JPEG/PNG/GIF/WebP
3. Verify S3 bucket exists
4. Check AWS credentials in .env

```bash
# Test S3 upload manually
aws s3 cp test-image.jpg s3://aquaai-images/
```

---

## 📊 Testing

### Manual Testing Flow

1. **Backend Health**
   ```bash
   curl http://localhost:8000/health
   ```

2. **Frontend Load**
   - Open `http://localhost:3000`
   - Should show ocean gradient and fish emoji

3. **Image Upload**
   - Use drag-drop or click to upload
   - Wait for Nova analysis
   - Verify results load correctly

4. **Chat Integration**
   - Click "Chat about [Species]"
   - Ask a question
   - Verify response includes species context

### Automated Testing (Coming Soon)

```bash
# Backend tests
pytest tests/

# Frontend tests
npm run test
```

---

## 📈 Performance Tips

1. **Cache care guides** in production (Redis/DynamoDB)
2. **Batch chat messages** for better context
3. **Use session management** for multi-user scenarios
4. **Enable image compression** for large uploads
5. **Monitor Bedrock costs** with CloudWatch

---

## 🔄 Updating

```bash
# Update backend dependencies
pip install --upgrade -r requirements.txt

# Update frontend dependencies
cd frontend
npm update
```

---

## 📞 Support

For issues or questions:
1. Check troubleshooting section above
2. Check AWS Bedrock status page
3. Review API logs: `http://localhost:8000/docs`
4. Check browser console for frontend errors

---

**Happy Aquarium Building! 🐠🌊**
