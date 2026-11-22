# Deferred Work

- source_spec: `.docs/implementation-artifacts/spec-1-1-one-command-start.md`
  summary: Strengthen the lazy-provider test so a provider built at import or lifespan with a key set is detected.
  evidence: `proxy/tests/test_status.py` clears the `get_provider` cache after `app.main` is imported and never enters lifespan (`TestClient` without `with`); rework when Story 1.6 changes `llm.py`.
