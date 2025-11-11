"""
Web Routes for RAG Chatbot Platform.

Provides web interface routes for the chatbot creation wizard
and chat interface.
"""

import logging
from flask import Blueprint, render_template, current_app, abort

logger = logging.getLogger(__name__)

# Create web blueprint
web_bp = Blueprint('web', __name__)


@web_bp.route('/')
def index():
    """
    Landing page route.

    Displays the home page with information about the platform
    and a call-to-action to create a chatbot.

    Returns:
        Rendered index.html template
    """
    logger.info("Rendering landing page")
    return render_template('index.html')


@web_bp.route('/dashboard')
def dashboard():
    """
    Dashboard route.

    Displays all chatbots created by users with options to view,
    edit, or delete them.

    Returns:
        Rendered dashboard.html template
    """
    logger.info("Rendering dashboard page")
    return render_template('dashboard.html')


@web_bp.route('/create')
def create_chatbot():
    """
    Chatbot creation wizard - Step 1 (Data).

    Displays the first step of the chatbot creation wizard where users
    configure the chatbot name, system prompt, and upload documents.

    Returns:
        Rendered create_step1.html template
    """
    logger.info("Rendering chatbot creation wizard - Step 1 (Data)")
    return render_template('create_step1.html')


@web_bp.route('/create/step/<int:step_number>')
def create_step(step_number):
    """
    Chatbot creation wizard - Steps 2-3.

    Displays the specified step of the chatbot creation wizard.

    URL Parameters:
        - step_number: Step number (2 or 3)

    Returns:
        Rendered template for the specified step
        or 404 if step number is invalid

    Steps:
        - Step 2: Playground (Model selection, system prompt editing, testing)
        - Step 3: Deploy (Success page with chatbot URL)
    """
    # Validate step number
    if step_number < 2 or step_number > 3:
        logger.warning("Invalid step number requested: %d", step_number)
        abort(404)

    template_name = f'create_step{step_number}.html'
    logger.info("Rendering chatbot creation wizard - Step %d", step_number)

    return render_template(template_name)


@web_bp.route('/chat/<chatbot_id>')
def chat(chatbot_id):
    """
    Chat interface route.

    Displays the chat interface for interacting with a specific chatbot.
    Validates that the chatbot exists before rendering the page.

    URL Parameters:
        - chatbot_id: Unique identifier of the chatbot

    Returns:
        Rendered chat.html template with chatbot data
        or 404 if chatbot not found

    Template Context:
        - chatbot: Dictionary containing chatbot metadata
          (id, name, system_prompt, status, created_at)
    """
    try:
        # Get chatbot from service
        chatbot_service = current_app.chatbot_service
        chatbot = chatbot_service.get_chatbot(chatbot_id)

        # Check if chatbot exists
        if chatbot is None:
            logger.warning("Chatbot not found: %s", chatbot_id)
            abort(404)

        logger.info("Rendering chat interface for chatbot: %s", chatbot_id)

        return render_template('chat.html', chatbot=chatbot)

    except Exception as e:
        logger.error("Error loading chat interface for chatbot '%s': %s",
                     chatbot_id, str(e))
        abort(500)
