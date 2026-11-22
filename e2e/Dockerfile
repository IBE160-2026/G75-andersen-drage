# One test image for all three suites (spec Design Notes): Playwright base + uv/Python.
# Build context is the repository root.
FROM mcr.microsoft.com/playwright:v1.65.0
COPY --from=ghcr.io/astral-sh/uv:0.13 /uv /usr/local/bin/uv
ENV UV_LINK_MODE=copy UV_PROJECT_ENVIRONMENT=/opt/venv UV_PYTHON_INSTALL_DIR=/opt/uv-python PYTHONDONTWRITEBYTECODE=1 CI=1
WORKDIR /repo

COPY proxy/pyproject.toml proxy/uv.lock proxy/
RUN cd proxy && uv sync --frozen --python 3.14

COPY web/package.json web/package-lock.json web/
RUN cd web && npm ci

COPY e2e/package.json e2e/package-lock.json e2e/
RUN cd e2e && npm ci

COPY proxy proxy
COPY web web
COPY e2e e2e
COPY scripts scripts
CMD ["bash", "scripts/test.sh"]
