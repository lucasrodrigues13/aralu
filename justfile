set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]

default:
    @just --list

# Sobe a API, o frontend e o PostgreSQL no Docker.
up:
    docker compose up --build

# Encerra os containers desse compose.
down:
    docker compose down

# Suíte E2E completa num ambiente descartável (compose.e2e.yaml). Sempre derruba tudo no final, mesmo se falhar.
e2e *args:
    docker compose -p aralu-e2e -f compose.e2e.yaml down -v --remove-orphans
    docker compose -p aralu-e2e -f compose.e2e.yaml up -d --build --wait
    try { Push-Location tests/e2e; npm ci; npx playwright install chromium; npx playwright test {{args}} } finally { Pop-Location; docker compose -p aralu-e2e -f compose.e2e.yaml down -v --remove-orphans --rmi local }

# Sobe o ambiente E2E e deixa ligado, para escrever testes (npx playwright test --ui em tests/e2e).
e2e-up:
    docker compose -p aralu-e2e -f compose.e2e.yaml up -d --build --wait

# Derruba e apaga tudo do ambiente E2E.
e2e-down:
    docker compose -p aralu-e2e -f compose.e2e.yaml down -v --remove-orphans --rmi local
