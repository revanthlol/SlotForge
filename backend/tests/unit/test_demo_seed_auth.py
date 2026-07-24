import uuid

from scripts import seed_demo_data


def test_seed_keeps_existing_supabase_id_when_password_sync_fails(monkeypatch):
    user_id = uuid.uuid4()

    monkeypatch.setattr(seed_demo_data, "_is_placeholder_supabase_config", lambda: False)
    monkeypatch.setattr(seed_demo_data, "_get_auth_user_id_by_email", lambda db, email: user_id)

    def fail_password_sync(*args, **kwargs):
        raise RuntimeError("admin key rotation")

    monkeypatch.setattr(seed_demo_data, "_update_auth_user", fail_password_sync)

    assert seed_demo_data._ensure_supabase_auth_user(object(), email="demo@example.com", password="ignored") == user_id
