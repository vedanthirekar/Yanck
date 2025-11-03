# RAG Chatbot Platform

A Flask-based web application that enables users to create custom chatbots trained on their own documents using RAG (Retrieval-Augmented Generation).

## Features

- **Simple 4-Step Workflow**: Create chatbots in minutes
  1. Basic Settings - Configure name and system prompt
  2. Data Upload - Upload training documents (PDF, TXT, DOCX)
  3. Preview & Test - Test your chatbot before deployment
  4. Deploy - Make your chatbot live

- **Local Embedding Generation**: Uses Sentence Transformers for privacy-preserving document embeddings
- **Powered by Google Gemini**: Leverages Gemini API for intelligent responses
- **Multiple Document Support**: Upload up to 10 documents per chatbot (50MB each)
- **RAG Pipeline**: Retrieves relevant context from your documents for accurate answers

## Technology Stack

- **Backend**: Flask, LangChain, Sentence Transformers, FAISS
- **LLM**: Google Gemini API
- **Database**: SQLite
- **Frontend**: HTML, CSS, JavaScript

## Prerequisites

- Python 3.9 or higher
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))
- 2GB+ RAM (for embedding model)

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd rag-chatbot-platform
```

### 2. Create Virtual Environment

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Copy the example environment file and configure it:

```bash
# Windows
copy .env.example .env

# macOS/Linux
cp .env.example .env
```

Edit `.env` and set your configuration:

```bash
# Flask Configuration
FLASK_ENV=development
FLASK_SECRET_KEY=your-secret-key-here  # Change this!

# Gemini API (REQUIRED)
GEMINI_API_KEY=your-gemini-api-key-here

# Model Configuration (Optional - defaults provided)
EMBEDDING_MODEL=all-MiniLM-L6-v2
CHUNK_SIZE=500
CHUNK_OVERLAP=50

# File Upload (Optional - defaults provided)
MAX_FILE_SIZE_MB=50
MAX_FILES_PER_CHATBOT=10
UPLOAD_FOLDER=./data/uploads

# Vector Store (Optional - defaults provided)
VECTOR_STORE_PATH=./data/vector_stores

# Database (Optional - defaults provided)
DATABASE_PATH=./data/chatbots.db
```

**Important**: You must set `GEMINI_API_KEY` for the application to work.

### 5. Initialize Database

```bash
python init_db.py
```

### 6. Verify Setup (Optional)

Run the verification script to check if everything is configured correctly:

```bash
python verify_setup.py
```

This will check:
- Python version
- Environment variables
- Required packages
- Application initialization

## Running the Application

### Quick Start (Recommended)

Use the provided startup scripts:

```bash
# Windows
start.bat

# macOS/Linux
chmod +x start.sh
./start.sh
```

These scripts will:
- Check for virtual environment
- Check for .env file
- Activate the environment
- Start the application

### Development Server

```bash
python run.py
```

The application will be available at `http://localhost:5000`

### Alternative: Direct Flask Run

```bash
python app.py
```

### Custom Host/Port

Set environment variables before running:

```bash
# Windows
set FLASK_HOST=127.0.0.1
set FLASK_PORT=8000
python run.py

# macOS/Linux
export FLASK_HOST=127.0.0.1
export FLASK_PORT=8000
python run.py
```

## Usage

### Creating a Chatbot

1. Navigate to `http://localhost:5000`
2. Click "Create New Chatbot"
3. Follow the 4-step wizard:
   - **Step 1**: Enter chatbot name and system prompt
   - **Step 2**: Upload your documents (PDF, TXT, or DOCX)
   - **Step 3**: Test your chatbot with sample queries
   - **Step 4**: Deploy and get your chatbot URL

### Chatting with Your Chatbot

1. After deployment, you'll receive a unique chatbot URL
2. Navigate to the URL (e.g., `http://localhost:5000/chat/<chatbot-id>`)
3. Start asking questions based on your uploaded documents

## Project Structure

```
rag-chatbot-platform/
├── app.py                  # Flask application factory
├── run.py                  # Application entry point
├── init_db.py             # Database initialization script
├── requirements.txt       # Python dependencies
├── .env.example          # Example environment configuration
├── .env                  # Your environment configuration (not in git)
│
├── models/               # Data models and managers
│   ├── database.py       # Database utilities
│   ├── embedding_manager.py
│   └── vector_store_manager.py
│
├── services/             # Business logic
│   ├── chatbot_service.py
│   ├── document_service.py
│   └── query_service.py
│
├── routes/               # API and web routes
│   ├── api_routes.py     # REST API endpoints
│   └── web_routes.py     # Web page routes
│
├── templates/            # HTML templates
│   ├── base.html
│   ├── index.html
│   ├── create_step1.html
│   ├── create_step2.html
│   ├── create_step3.html
│   ├── create_step4.html
│   └── chat.html
│
├── static/               # Static assets
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── wizard.js
│       └── chat.js
│
└── data/                 # Application data (created on first run)
    ├── chatbots.db       # SQLite database
    ├── uploads/          # Uploaded documents
    └── vector_stores/    # FAISS vector indices
```

## API Endpoints

### Chatbot Management

- `POST /api/chatbot` - Create new chatbot
- `GET /api/chatbot/<id>/status` - Get chatbot status
- `DELETE /api/chatbot/<id>` - Delete chatbot

### Document Management

- `POST /api/chatbot/<id>/documents` - Upload documents

### Query

- `POST /api/chatbot/<id>/query` - Submit query to chatbot

## Configuration Options

### Embedding Models

You can change the embedding model in `.env`:

```bash
# Faster, smaller (384 dimensions) - Default
EMBEDDING_MODEL=all-MiniLM-L6-v2

# Higher quality, larger (768 dimensions)
EMBEDDING_MODEL=all-mpnet-base-v2
```

### Text Chunking

Adjust how documents are split:

```bash
CHUNK_SIZE=500        # Characters per chunk
CHUNK_OVERLAP=50      # Overlap between chunks
```

### File Upload Limits

```bash
MAX_FILE_SIZE_MB=50           # Max size per file
MAX_FILES_PER_CHATBOT=10      # Max files per chatbot
```

## Troubleshooting

### "GEMINI_API_KEY not set" Error

Make sure you've set your Gemini API key in the `.env` file:

```bash
GEMINI_API_KEY=your-actual-api-key-here
```

### "Failed to load embedding model" Error

This usually means insufficient memory. Try:
- Closing other applications
- Using a smaller model: `EMBEDDING_MODEL=all-MiniLM-L6-v2`

### "File too large" Error

Reduce file size or increase the limit in `.env`:

```bash
MAX_FILE_SIZE_MB=100
```

### Port Already in Use

Change the port in `.env` or via environment variable:

```bash
FLASK_PORT=8000
```

## Testing

Run the test suite:

```bash
# Run all tests
python -m pytest

# Run specific test file
python -m pytest test_chatbot_service.py

# Run with verbose output
python -m pytest -v
```

## Development

### Running in Debug Mode

Debug mode is enabled by default when `FLASK_ENV=development`:

```bash
FLASK_ENV=development
python run.py
```

### Adding New Features

1. Update models in `models/`
2. Add business logic in `services/`
3. Create routes in `routes/`
4. Add templates in `templates/`
5. Update tests

## Security Considerations

- **Never commit `.env` file** - It contains sensitive API keys
- **Change `FLASK_SECRET_KEY`** in production
- **Validate all file uploads** - The app checks file types and sizes
- **Use HTTPS** in production
- **Implement authentication** for production use

## Production Deployment

For production deployment, consider:

1. **Use a production WSGI server** (Gunicorn, uWSGI)
   ```bash
   pip install gunicorn
   gunicorn -w 4 -b 0.0.0.0:5000 app:app
   ```

2. **Use PostgreSQL** instead of SQLite
3. **Implement user authentication**
4. **Add rate limiting**
5. **Use cloud storage** for uploaded files (AWS S3, etc.)
6. **Set up monitoring** (Sentry, CloudWatch)
7. **Use environment-specific configs**

## License

[Your License Here]

## Support

For issues and questions, please open an issue on GitHub.

## Acknowledgments

- Built with [Flask](https://flask.palletsprojects.com/)
- Powered by [LangChain](https://www.langchain.com/)
- Embeddings by [Sentence Transformers](https://www.sbert.net/)
- LLM by [Google Gemini](https://deepmind.google/technologies/gemini/)
