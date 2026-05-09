import streamlit as st
import pdfplumber
import re
import requests
import datetime

# ── CONFIG ───────────────────────────────────────────────────────────────────
CHUNK_SIZE = 12000
MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"
API_TIMEOUT = 60

# ── HELPERS ───────────────────────────────────────────────────────────────────
def get_api_key():
    try:
        return st.secrets["OPENROUTER_API_KEY"]
    except Exception:
        return st.session_state.get("manual_api_key", "")


def split_into_chunks(text, chunk_size=CHUNK_SIZE):
    chunks = []
    while len(text) > chunk_size:
        split_at = text.rfind('\n', 0, chunk_size)
        if split_at == -1:
            split_at = chunk_size
        chunks.append(text[:split_at].strip())
        text = text[split_at:].strip()
    if text:
        chunks.append(text)
    return chunks


def call_api(prompt, api_key):
    try:
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://pdf-notes-generatorgit.streamlit.app",
                "X-Title": "PDF Notes Generator"
            },
            json={
                "model": MODEL,
                "temperature": 0.3,
                "messages": [{"role": "user", "content": prompt}]
            },
            timeout=API_TIMEOUT
        )
        result = response.json()
    except requests.exceptions.Timeout:
        return None, "Request timed out. Try again."
    except requests.exceptions.ConnectionError:
        return None, "Connection error. Check your internet."
    except Exception as e:
        return None, f"Unexpected error: {str(e)}"

    if "choices" not in result:
        error_msg = result.get("error", {}).get("message", str(result))
        return None, error_msg

    return result["choices"][0]["message"]["content"], None


def log_to_history(filename, mode, total_chunks):
    if "history" not in st.session_state:
        st.session_state.history = []
    st.session_state.history.append({
        "time": datetime.datetime.now().strftime('%Y-%m-%d %H:%M'),
        "file": filename,
        "mode": mode,
        "chunks": total_chunks
    })


# ── PAGE ──────────────────────────────────────────────────────────────────────
st.set_page_config(page_title="PDF Notes Generator", page_icon="📄", layout="centered")
st.title("📄 PDF Notes Generator")
st.caption("Upload a PDF → get clean study notes or exam questions instantly.")

# ── SIDEBAR ───────────────────────────────────────────────────────────────────
with st.sidebar:
    st.header("⚙️ Settings")

    key_in_secrets = False
    try:
        _ = st.secrets["OPENROUTER_API_KEY"]
        key_in_secrets = True
    except Exception:
        pass

    if key_in_secrets:
        st.success("API key loaded ✓")
    else:
        st.warning("No API key configured.")
        manual_key = st.text_input(
            "Enter your OpenRouter API key",
            type="password",
            help="Get a free key at openrouter.ai"
        )
        if manual_key:
            st.session_state.manual_api_key = manual_key

    st.divider()
    st.markdown("**Model:** `mistral-7b-instruct`")
    st.markdown("**Powered by** [OpenRouter](https://openrouter.ai)")

    if "history" in st.session_state and st.session_state.history:
        st.divider()
        st.subheader("📋 Session History")
        for entry in reversed(st.session_state.history[-5:]):
            st.markdown(f"- `{entry['time']}` · **{entry['file']}** · {entry['mode']}")

# ── MAIN ──────────────────────────────────────────────────────────────────────
api_key = get_api_key()

if not api_key:
    st.info(" Enter your OpenRouter API key in the sidebar to get started.")
    st.stop()

uploaded_file = st.file_uploader("Upload your PDF", type="pdf")

if uploaded_file:
    with pdfplumber.open(uploaded_file) as pdf:
        total_pages = len(pdf.pages)
        text = ""
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                text += t + "\n"

    clean_text = re.sub(r'\n+', '\n', text)
    clean_text = re.sub(r' +', ' ', clean_text)

    if not clean_text.strip():
        st.error("No text found. This PDF may be image-based or scanned.")
        st.stop()

    chunks = split_into_chunks(clean_text)
    total_chunks = len(chunks)

    col1, col2 = st.columns(2)
    with col1:
        st.metric("Pages", total_pages)
    with col2:
        st.metric("Sections", total_chunks)

    if total_chunks > 1:
        st.info(f"📄 Large PDF — processing {total_chunks} sections and merging the output.")

    mode = st.selectbox("Select Mode", ["Notes", "Generate Questions"])

    marks = None
    num_questions = None
    if mode == "Generate Questions":
        col1, col2 = st.columns(2)
        with col1:
            marks = st.selectbox("Marks per Question", [3, 5, 10])
        with col2:
            num_questions = st.number_input("Number of Questions", min_value=1, max_value=20, value=5)

    if st.button("🚀 Generate", use_container_width=True, type="primary"):
        final_output = ""

        if mode == "Notes":
            chunk_outputs = []
            progress = st.progress(0, text="Starting...")

            for i, chunk in enumerate(chunks):
                progress.progress(i / total_chunks, text=f"Processing section {i+1} of {total_chunks}...")
                prompt = f"""Convert into structured study notes:

- Key Points (bullet list)
- Concepts (term: definition)

Rules:
- No repetition
- Keep important details only
- Ignore formatting noise
- Keep output concise

Text:
{chunk}"""
                output, error = call_api(prompt, api_key)
                if error:
                    st.error(f" API Error on section {i+1}: {error}")
                    st.stop()
                chunk_outputs.append(output)

            progress.progress(0.95, text="Merging sections...")
            combined = "\n\n---\n\n".join(chunk_outputs)
            merge_prompt = f"""Below are study notes from multiple sections of the same document.

Merge into ONE clean unified set with:
- A single Title
- Key Points (no duplicates, combined from all sections)
- Concepts (no duplicates, combined from all sections)

Rules:
- Remove repetition across sections
- Keep all unique points and concepts
- Maintain academic tone
- Do not add anything not present in the input

Notes to merge:
{combined}"""
            final_output, error = call_api(merge_prompt, api_key)
            if error:
                st.error(f" API Error during merge: {error}")
                st.stop()

            progress.progress(1.0, text="Done!")
            progress.empty()

        else:
            base = num_questions // total_chunks
            remainder = num_questions % total_chunks
            questions_per_chunk = [base + (1 if i < remainder else 0) for i in range(total_chunks)]

            all_questions = []
            progress = st.progress(0, text="Starting...")

            for i, (chunk, q_count) in enumerate(zip(chunks, questions_per_chunk)):
                if q_count == 0:
                    continue
                progress.progress(i / total_chunks, text=f"Processing section {i+1} of {total_chunks}...")
                prompt = f"""Generate {q_count} exam-oriented questions of {marks} marks.

IMPORTANT RULES:
- Focus only on technical concepts
- Do NOT change names, terms, or facts
- Do NOT invent information
- Avoid repetition of same concept
- Each question must be from a DIFFERENT topic
- Each question must be ONE clear sentence
- Start with action verbs: Explain, Define, Discuss, Differentiate

GROUNDING RULES:
- All questions must be directly traceable to the input text
- Do not create relationships unless explicitly stated
- If unsure, stick strictly to given content

Text:
{chunk}"""
                output, error = call_api(prompt, api_key)
                if error:
                    st.error(f" API Error on section {i+1}: {error}")
                    st.stop()
                all_questions.append(output)

            progress.progress(1.0, text="Done!")
            progress.empty()
            final_output = "\n\n".join(all_questions)

        if len(final_output.strip()) < 50:
            st.warning("⚠️ Output seems too short. Try again.")
        else:
            log_to_history(uploaded_file.name, mode, total_chunks)
            st.success(" Done!")
            st.subheader("Output")
            st.markdown(final_output)
            st.download_button(
                label="⬇️ Download Output",
                data=final_output,
                file_name=f"{uploaded_file.name.replace('.pdf', '')}_{mode.lower().replace(' ', '_')}.txt",
                mime="text/plain",
                use_container_width=True
            )