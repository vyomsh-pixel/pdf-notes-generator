import base64
import os
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient
import pytest
import requests

import app as streamlit_app
import backend.main as backend_main
from backend.main import app, call_api, split_into_chunks


@pytest.fixture(autouse=True)
def isolated_db(tmp_path, monkeypatch):
    db_file = tmp_path / "test_pdfnotes.sqlite3"
    monkeypatch.setenv("PDFNOTES_DB_PATH", str(db_file))
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    backend_main._initialized_dbs.clear()
    backend_main.init_db()
    yield db_file


@pytest.fixture
def client():
    return TestClient(app)


# ── 1. CHUNKING TESTS ────────────────────────────────────────────────────────
def test_split_into_chunks_single_and_multi():
    short_text = "Paragraph one.\nParagraph two."
    assert split_into_chunks(short_text, chunk_size=100) == [short_text]
    assert streamlit_app.split_into_chunks(short_text, chunk_size=100) == [short_text]

    line_a = "A" * 40
    line_b = "B" * 40
    line_c = "C" * 40
    combined = f"{line_a}\n{line_b}\n{line_c}"
    chunks = split_into_chunks(combined, chunk_size=50)
    assert chunks == [line_a, line_b, line_c]

    # Hard split when no newline is present
    no_newline = "X" * 120
    hard_chunks = split_into_chunks(no_newline, chunk_size=50)
    assert [len(c) for c in hard_chunks] == [50, 50, 20]


# ── 2. CALL_API HARDENING TESTS ──────────────────────────────────────────────
@pytest.mark.parametrize("target_fn", [call_api, streamlit_app.call_api])
def test_call_api_error_and_null_content_handling(target_fn):
    # Missing API key
    out, err = target_fn("Test prompt", "")
    assert out is None
    assert "Missing API key" in err

    # String error payload from upstream
    mock_resp = MagicMock()
    mock_resp.ok = False
    mock_resp.status_code = 502
    mock_resp.json.return_value = {"error": "Upstream provider overloaded"}
    with patch("requests.post", return_value=mock_resp):
        out, err = target_fn("Test prompt", "sk-test")
        assert out is None
        assert err == "Upstream provider overloaded"

    # Empty choices list
    mock_resp.ok = True
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"choices": []}
    with patch("requests.post", return_value=mock_resp):
        out, err = target_fn("Test prompt", "sk-test")
        assert out is None
        assert "choices" in err.lower()

    # Null content in message
    mock_resp.json.return_value = {"choices": [{"message": {"content": None}}]}
    with patch("requests.post", return_value=mock_resp):
        out, err = target_fn("Test prompt", "sk-test")
        assert out is None
        assert "empty content" in err.lower()

    # Timeout handling
    with patch("requests.post", side_effect=requests.exceptions.Timeout()):
        out, err = target_fn("Test prompt", "sk-test")
        assert out is None
        assert "timed out" in err.lower()

    # Valid response + verify HTTP-Referer typo is fixed
    mock_resp.json.return_value = {
        "choices": [{"message": {"content": "# Clean Notes\n- Bullet 1"}}]
    }
    with patch("requests.post", return_value=mock_resp) as mocked_post:
        out, err = target_fn("Test prompt", "sk-test")
        assert err is None
        assert out == "# Clean Notes\n- Bullet 1"
        headers = mocked_post.call_args.kwargs["headers"]
        assert headers["HTTP-Referer"] == "https://pdf-notes-generator.streamlit.app"


# ── 3. AUTHENTICATION FLOW TESTS ─────────────────────────────────────────────
def test_auth_register_login_me(client):
    # Consent required check
    bad_reg = client.post(
        "/api/auth/register",
        json={
            "username": "alice",
            "password": "password123",
            "display_name": "Alice",
            "consent_accepted": False,
        },
    )
    assert bad_reg.status_code == 400

    # Successful registration
    reg = client.post(
        "/api/auth/register",
        json={
            "username": "Alice",
            "password": "password123",
            "display_name": "Alice Smith",
            "consent_accepted": True,
        },
    )
    assert reg.status_code == 200
    reg_data = reg.json()
    assert "token" in reg_data
    assert reg_data["user"]["username"] == "alice"
    assert reg_data["user"]["display_name"] == "Alice Smith"

    # Duplicate username rejected
    dup = client.post(
        "/api/auth/register",
        json={
            "username": "alice",
            "password": "password123",
            "display_name": "Alice",
            "consent_accepted": True,
        },
    )
    assert dup.status_code == 409

    # Login with wrong password fails
    bad_login = client.post(
        "/api/auth/login",
        json={"username": "alice", "password": "wrongpassword"},
    )
    assert bad_login.status_code == 401

    # Login with valid password succeeds
    login = client.post(
        "/api/auth/login",
        json={"username": "alice", "password": "password123"},
    )
    assert login.status_code == 200
    token = login.json()["token"]

    # /api/auth/me returns profile
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["user"]["username"] == "alice"

    # Tampered token rejected
    bad_me = client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {token}tampered"}
    )
    assert bad_me.status_code == 401


# ── 4. GENERATE ENDPOINT TESTS (MERGE SKIP, PAGE RANGE, FALLBACK) ───────────
def test_generate_single_chunk_skips_merge_and_multi_chunk_merges(client):
    sample_text = (
        "Neural networks are computational models inspired by biological brains. "
        "Backpropagation computes the gradient of the loss function with respect to weights."
    )

    with patch("backend.main.call_api") as mocked_call:
        mocked_call.return_value = (
            "# Neural Network Notes\n- Backpropagation computes gradients accurately.",
            None,
        )
        res = client.post(
            "/api/generate",
            json={
                "filename": "Lecture1.PDF",
                "text": sample_text,
                "mode": "Notes",
                "api_key": "sk-live-key",
            },
        )
        assert res.status_code == 200
        body = res.json()
        assert body["chunks"] == 1
        assert body["file_stem"] == "Lecture1"
        assert "Backpropagation" in body["output"]
        # Single chunk MUST skip the second merge API call!
        assert mocked_call.call_count == 1

    # Multi-chunk text triggers N chunk calls + 1 merge call
    multi_text = ("Section A content.\n" * 500) + "\n" + ("Section B content.\n" * 500)
    with patch("backend.main.call_api") as mocked_call:
        mocked_call.return_value = (
            "# Merged Notes\n- Unified point across sections with sufficient length.",
            None,
        )
        res2 = client.post(
            "/api/generate",
            json={
                "filename": "BigBook.pdf",
                "text": multi_text,
                "mode": "Notes",
                "api_key": "sk-live-key",
            },
        )
        assert res2.status_code == 200
        body2 = res2.json()
        assert body2["chunks"] == 2
        assert mocked_call.call_count == 3  # 2 chunk calls + 1 merge call


def test_generate_offline_fallback_and_page_range(client):
    paged_text = (
        "Page 1: Operating Systems manage hardware resources and process scheduling.\f"
        "Page 2: Virtual memory uses paging to isolate address spaces across processes.\f"
        "Page 3: File systems organize persistent storage blocks and directory trees."
    )

    # Page range 2..2 in Notes mode without API key (uses offline fallback)
    notes_res = client.post(
        "/api/generate",
        json={
            "filename": "OS_Notes.pdf",
            "text": paged_text,
            "mode": "Notes",
            "page_start": 2,
            "page_end": 2,
        },
    )
    assert notes_res.status_code == 200
    notes_data = notes_res.json()
    assert notes_data["pages_processed"] == 1
    assert notes_data["offline_fallback"] is True
    assert "Virtual memory" in notes_data["output"]
    assert "File systems" not in notes_data["output"]

    # Generate Questions mode with offline fallback
    q_res = client.post(
        "/api/generate",
        json={
            "filename": "OS_Notes.pdf",
            "text": paged_text,
            "mode": "Generate Questions",
            "marks": 5,
            "num_questions": 3,
            "page_start": 1,
            "page_end": 3,
        },
    )
    assert q_res.status_code == 200
    q_data = q_res.json()
    assert q_data["pages_processed"] == 3
    assert "[5 Marks]" in q_data["output"]
    assert "1." in q_data["output"]
    assert "3." in q_data["output"]


def test_pdf_base64_extraction_and_size_limit(client):
    fake_page_1 = MagicMock()
    fake_page_1.extract_text.return_value = (
        "Thermodynamics first law states that energy is conserved in closed systems."
    )
    fake_page_2 = MagicMock()
    fake_page_2.extract_text.return_value = (
        "Entropy measures the microscopic disorder of a thermodynamic system."
    )
    fake_pdf = MagicMock()
    fake_pdf.pages = [fake_page_1, fake_page_2]
    fake_pdf.__enter__.return_value = fake_pdf
    fake_pdf.__exit__.return_value = False

    dummy_pdf_b64 = base64.b64encode(b"%PDF-1.4 dummy bytes").decode("ascii")
    with patch("backend.main.pdfplumber.open", return_value=fake_pdf):
        res = client.post(
            "/api/generate",
            json={
                "filename": "Physics.pdf",
                "pdf_base64": dummy_pdf_b64,
                "mode": "Notes",
                "page_start": 2,
                "page_end": 2,
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["pages_processed"] == 1
        assert "Entropy" in data["output"]


# ── 5. HISTORY, EXPORT & ACCOUNT DELETION TESTS ─────────────────────────────
def test_history_export_and_account_deletion(client):
    reg = client.post(
        "/api/auth/register",
        json={
            "username": "bob",
            "password": "securepassword",
            "display_name": "Bob Builder",
            "consent_accepted": True,
        },
    )
    token = reg.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Generate 2 items
    for i in range(2):
        g = client.post(
            "/api/generate",
            headers=headers,
            json={
                "filename": f"Chapter_{i + 1}.pdf",
                "text": "Distributed consensus algorithms like Raft ensure fault-tolerant state machines.",
                "mode": "Notes",
            },
        )
        assert g.status_code == 200

    # Check history
    hist = client.get("/api/history", headers=headers)
    assert hist.status_code == 200
    items = hist.json()["history"]
    assert len(items) == 2

    # Delete 1 history item
    first_id = items[0]["id"]
    del_item = client.delete(f"/api/history/{first_id}", headers=headers)
    assert del_item.status_code == 200

    hist_after = client.get("/api/history", headers=headers).json()["history"]
    assert len(hist_after) == 1

    # Export account data
    export_res = client.get("/api/account/export", headers=headers)
    assert export_res.status_code == 200
    export_data = export_res.json()
    assert export_data["user"]["username"] == "bob"
    assert len(export_data["history"]) == 1
    assert "exported_at" in export_data

    # Delete account
    del_acc = client.delete("/api/account", headers=headers)
    assert del_acc.status_code == 200
    assert del_acc.json() == {"status": "deleted"}

    # Token is no longer valid after account deletion
    me_after = client.get("/api/auth/me", headers=headers)
    assert me_after.status_code == 401
