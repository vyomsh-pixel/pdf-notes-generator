# 📄 PDF Notes Generator

An AI-powered Streamlit app that converts any PDF into clean study notes or exam-ready questions — in seconds.

Built with Python, Streamlit, and OpenRouter (free tier).

---

## Features

- **Notes Mode** — extracts key points and concept definitions from any PDF
- **Questions Mode** — generates exam-style questions (3/5/10 marks) distributed across the document
- Handles large PDFs by chunking and merging intelligently
- Download output as `.txt`
- Session history in sidebar

---

## Local Setup

**1. Clone the repo**
```bash
git clone https://github.com/YOUR_USERNAME/pdf-notes-generator.git
cd pdf-notes-generator
```

**2. Install dependencies**
```bash
pip install -r requirements.txt
```

**3. Add your API key**

Create `.streamlit/secrets.toml`:
```toml
OPENROUTER_API_KEY = "sk-or-v1-your-key-here"
```
Get a free key at [openrouter.ai](https://openrouter.ai) — no credit card required.

**4. Run**
```bash
streamlit run app.py
```

---

## Deploy on Streamlit Cloud (Free)

1. Push this repo to GitHub
2. Go to [share.streamlit.io](https://share.streamlit.io) → New app → connect your repo
3. Set `app.py` as the main file
4. Go to **App Settings → Secrets** and paste:
   ```
   OPENROUTER_API_KEY = "sk-or-v1-your-key-here"
   ```
5. Deploy — done.

---

## Tech Stack

| Layer | Tool |
|-------|------|
| UI | Streamlit |
| PDF Parsing | pdfplumber |
| AI | OpenRouter (mistral-7b-instruct) |
| Hosting | Streamlit Community Cloud |

---

## Notes

- The app never stores your PDF or API key permanently
- Session history lives only in memory and resets on refresh
- Works best on text-based PDFs; scanned/image PDFs are not supported
