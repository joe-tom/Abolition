from langchain.chat_models import init_chat_model
from backend.config import settings


def get_model():
    return init_chat_model(settings.model_name)
