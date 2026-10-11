import concurrent.futures
import datetime
import io
from pathlib import Path
import re
import pdfplumber
import requests
import streamlit as st

# ── CONFIG ───────────────────────────────────────────────────────────────────
CHUNK_SIZE = 12000
MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"
API_TIMEOUT = 60


# ── HELPERS ───────────────────────────────────────────────────────────────────
def get_api_key():
    try:
        secret_key = st.secrets["OPENROUTER_API_KEY"]
        if secret_key:
            return secret_key
    except Exception:
        pass
    try:
        return st.session_state.get("manual_api_key", "")
    except Exception:
        return ""


def split_into_chunks(text, chunk_size=CHUNK_SIZE):
    chunks = []
    while len(text) > chunk_size:
        split_at = text.rfind("\n", 0, chunk_size)
        if split_at == -1:
            split_at = chunk_size
        chunks.append(text[:split_at].strip())
        text = text[split_at:].strip()
    if text:
        chunks.append(text)
    return chunks


def call_api(prompt, api_key):
    if not api_key or not str(api_key).strip():
        return None, "Missing API key."
    try:
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer { str(api_key).strip() }",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://pdf-notes-generator.streamlit.app",
                "X-Title": "PDF Notes Generator",
            },
            json={
                "model": MODEL,
                "temperature": 0.3,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=API_TIMEOUT,
        )
        result = response.json()
    except requests.exceptions.Timeout:
        return None, "Request timed out. Try again."
    except requests.exceptions.ConnectionError:
        return None, "Connection error. Check your internet."
    except ValueError:
        return None, "Invalid JSON response from API."
    except Exception as e:
        return None, f"Unexpected error: {str(e)}"

    if not isinstance(result, dict):
        return None, "Unexpected response structure from API."

    if not getattr(response, "ok", True) or "error" in result or "choices" not in result:
        err = result.get("error")
        if isinstance(err, dict):
            error_msg = err.get("message") or str(err)
        elif isinstance(err, str) and err.strip():
            error_msg = err.strip()
        else:
            error_msg = str(result)
        return None, error_msg

    choices = result.get("choices")
    if not isinstance(choices, list) or not choices:
        return None, "No completion choices returned by the model."

    first_choice = choices[0] if isinstance(choices[0], dict) else {}
    message = first_choice.get("message") if isinstance(first_choice.get("message"), dict) else {}
    content = message.get("content")
    if content is None or not str(content).strip():
        return None, "Model returned empty content."

    return str(content), None


@st.cache_data(show_spinner="Extracting text from PDF...")
def extract_pdf_text(file_bytes: bytes):
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        total_pages = len(pdf.pages)
        text = ""
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                text += t + "\n"

    clean_text = re.sub(r"\n+", "\n", text)
    clean_text = re.sub(r" +", " ", clean_text)
    return total_pages, clean_text


def log_to_history(filename, mode, total_chunks):
    if "history" not in st.session_state:
        st.session_state.history = []
    st.session_state.history.append(
        {
            "time": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
            "file": filename,
            "mode": mode,
            "chunks": total_chunks,
        }
    )


def main():
    # ── PAGE ──────────────────────────────────────────────────────────────────
    st.set_page_config(page_title="PDF Notes Generator", page_icon="📄", layout="centered")
    st.markdown(
        """
<div style='text-align: center; padding: 20px 0 30px 0;'>
    <h1 style='font-size: 3.2rem; margin-bottom: 0;'>📄 PDF Notes Generator</h1>
    <p style='font-size: 1.2rem; color: #9CA3AF;'>
        Transform dense PDFs into structured notes and exam-ready questions instantly.
    </p>
</div>
""",
        unsafe_allow_html=True,
    )
    st.markdown(
        """
<style>
.block-container {
    padding-top: 2rem;
    padding-bottom: 2rem;
    max-width: 900px;
}

.stButton > button {
    width: 100%;
    border-radius: 14px;
    height: 3.2em;
    font-size: 18px;
    font-weight: bold;
    background: linear-gradient(90deg, #4F46E5, #7C3AED);
    color: white;
    border: none;
    transition: 0.3s ease;
}

.stButton > button:hover {
    transform: scale(1.02);
}

[data-testid="stMetricValue"] {
    font-size: 2rem;
    font-weight: bold;
}

[data-testid="stSidebar"] {
    background-color: #111827;
    color: #F9FAFB;
}

[data-testid="stSidebar"] p,
[data-testid="stSidebar"] span,
[data-testid="stSidebar"] label,
[data-testid="stSidebar"] h1,
[data-testid="stSidebar"] h2,
[data-testid="stSidebar"] h3 {
    color: #F9FAFB !important;
}

h1, h2, h3 {
    font-family: sans-serif;
}
</style>
""",
        unsafe_allow_html=True,
    )

    # ── SIDEBAR ───────────────────────────────────────────────────────────────
    with st.sidebar:
        st.markdown("## 🚀 Study Assistant")
        st.caption("Your AI-powered revision weapon.")
        st.divider()
        key_in_secrets = False
        try:
            key_in_secrets = bool(st.secrets["OPENROUTER_API_KEY"])
        except Exception:
            key_in_secrets = False

        if key_in_secrets:
            st.success("API key loaded ✓")
        else:
            st.warning("No API key configured.")
            manual_key = st.text_input(
                "Enter your OpenRouter API key",
                type="password",
                help="Get a free key at openrouter.ai",
            )
            if manual_key:
                st.session_state.manual_api_key = manual_key

        st.divider()
        st.markdown("**Model:** `nemotron`")
        st.markdown("**Powered by** [OpenRouter](https://openrouter.ai)")

        if "history" in st.session_state and st.session_state.history:
            st.divider()
            st.subheader("📋 Session History")
            for entry in reversed(st.session_state.history[-5:]):
                st.markdown(f"- `{entry['time']}` · **{entry['file']}** · {entry['mode']}")

    # ── MAIN ──────────────────────────────────────────────────────────────────
    api_key = get_api_key()

    if not api_key:
        st.info("Enter your OpenRouter API key in the sidebar to get started.")
        st.stop()

    uploaded_file = st.file_uploader("Upload your PDF", type="pdf")

    if uploaded_file:
        try:
            total_pages, clean_text = extract_pdf_text(uploaded_file.getvalue())
        except Exception as exc:
            st.error(f"Unable to read PDF (file may be corrupted or encrypted): {exc}")
            st.stop()

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
            st.info(f"📄 Large PDF — processing {total_chunks} sections in parallel and merging the output.")

        mode = st.selectbox("Select Mode", ["Notes", "Generate Questions"])

        marks = None
        num_questions = None
        if mode == "Generate Questions":
            col1, col2 = st.columns(2)
            with col1:
                marks = st.selectbox("Marks per Question", [3, 5, 10])
            with col2:
                num_questions = st.number_input("Number of Questions", min_value=1, max_value=20, value=5)

        consent_checked = st.checkbox(
            "I consent to sending extracted PDF text to OpenRouter for AI processing and understand that AI-generated study output may contain inaccuracies.",
            value=False,
        )
        st.caption(
            "Educational Disclaimer: Generated notes and questions are study aids only. Always verify important definitions and facts against your primary course material."
        )

        if st.button("GENERATE", use_container_width=True, type="primary", disabled=not consent_checked):
            final_output = ""

            if mode == "Notes":
                progress = st.progress(0, text="Processing sections...")

                def _process_note_chunk(chunk_text):
                    prompt = f"""Convert into structured study notes:

- Key Points (bullet list)
- Concepts (term: definition)

Rules:
- No repetition
- Keep important details only
- Ignore formatting noise
- Keep output concise

Text:
{chunk_text}"""
                    return call_api(prompt, api_key)

                with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
                    results = list(executor.map(_process_note_chunk, chunks))

                chunk_outputs = []
                for i, (output, error) in enumerate(results):
                    if error:
                        st.error(f"API Error on section {i + 1}: {error}")
                        st.stop()
                    chunk_outputs.append(output)

                if total_chunks == 1:
                    final_output = chunk_outputs[0]
                else:
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
                        st.error(f"API Error during merge: {error}")
                        st.stop()

                progress.progress(1.0, text="Done!")
                progress.empty()

            else:
                base = num_questions // total_chunks
                remainder = num_questions % total_chunks
                questions_per_chunk = [base + (1 if i < remainder else 0) for i in range(total_chunks)]

                progress = st.progress(0, text="Generating questions...")
                work_items = [
                    (i, chunk, q_count)
                    for i, (chunk, q_count) in enumerate(zip(chunks, questions_per_chunk))
                    if q_count > 0
                ]

                def _process_question_chunk(item):
                    idx, chunk_text, q_count = item
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
{chunk_text}"""
                    out, err = call_api(prompt, api_key)
                    return idx, out, err

                with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
                    q_results = list(executor.map(_process_question_chunk, work_items))

                all_questions = []
                for idx, output, error in q_results:
                    if error:
                        st.error(f"API Error on section {idx + 1}: {error}")
                        st.stop()
                    all_questions.append(output)

                progress.progress(1.0, text="Done!")
                progress.empty()
                final_output = "\n\n".join(all_questions)

            if len(final_output.strip()) < 50:
                st.warning("⚠️ Output seems too short. Try again.")
            else:
                log_to_history(uploaded_file.name, mode, total_chunks)
                st.session_state.final_output = final_output
                st.session_state.last_filename = Path(uploaded_file.name).stem
                st.session_state.last_mode = mode

        if st.session_state.get("final_output"):
            st.success("Done!")
            st.subheader("Output")
            st.markdown(st.session_state.final_output)
            file_stem = st.session_state.get("last_filename") or Path(uploaded_file.name).stem
            saved_mode = st.session_state.get("last_mode") or mode
            st.download_button(
                label="⬇️ Download Output",
                data=st.session_state.final_output,
                file_name=f"{file_stem}_{saved_mode.lower().replace(' ', '_')}.txt",
                mime="text/plain",
                use_container_width=True,
            )


if __name__ == "__main__":
    main()
else:
    try:
        if st.runtime.exists():
            main()
    except Exception:
        pass