"""
Free LLM Inference Playground
-----------------------------
Single Streamlit app that chats against seven free-tier providers through
their OpenAI-compatible endpoints.

Setup:
    pip install streamlit openai python-dotenv httpx
    cp .env.example .env   # then fill in whichever keys you have
    streamlit run prompt_pad.py

You only need keys for the providers you actually want to use. The sidebar
greys out anything that isn't configured.
"""

from prompt_pad.app import main

main()
