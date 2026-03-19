# Portaria Facil

Este projeto agora pode rodar em dois modos:

- `Base44`, mantendo a origem atual
- `self-hosted`, com frontend + backend Node + PostgreSQL em hospedagem propria

## Self-hosted

### O que foi preparado

- frontend React/Vite apontando para backend proprio
- backend Node/Express em `backend/src/server.js`
- banco SQL inicial em `infrastructure/sql/001_self_hosted_init.sql`
- provisionamento de tenant por `schema` ou `database`
- worker para processar fila de notificacoes
- upload de arquivos
- login seguro de funcionarios com hash + token assinado

### Estrutura do banco

O backend inicializa automaticamente:

- `public.tenants` para metadados dos clientes
- `app_records` para as entidades operacionais

No modo `schema`, cada novo cliente ganha um schema proprio com `app_records`.

No modo `database`, cada novo cliente ganha um banco proprio com `public.app_records`.

### Variaveis do frontend

Crie um `.env.local` com base em `.env.self-hosted.example`:

```env
VITE_SELF_HOSTED=true
VITE_SELF_HOSTED_API_URL=http://localhost:4000
```

Use `VITE_SELF_HOSTED_API_URL=http://localhost:4000` em desenvolvimento local com `vite`.

Use `VITE_SELF_HOSTED_API_URL=` vazio quando o frontend estiver na mesma origem do backend via proxy Nginx.

### Variaveis do backend

Copie `backend/.env.example` para `backend/.env` e ajuste:

```env
PORT=4000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/portaria_facil
PUBLIC_APP_URL=http://localhost:8080
DEFAULT_TENANT_ID=default
DEFAULT_TENANT_SLUG=default
EMPLOYEE_SESSION_SECRET=troque-isto
BOOTSTRAP_ADMIN_USERNAME=admin
BOOTSTRAP_ADMIN_PASSWORD=troque-isto
TENANT_PROVISION_MODE=schema
TENANT_DB_PREFIX=tenant
CRON_SECRET=troque-isto
UPLOAD_DIR=./uploads
```

Observacao:

- `schema` e o modo recomendado para comecar
- `database` exige um usuario PostgreSQL com permissao de `CREATE DATABASE`

### Subindo com Docker Compose

O compose em `docker-compose.yml` sobe:

- `postgres`
- `backend`
- `queue-worker`
- `web`

Execute:

```bash
docker compose up --build
```

Depois acesse:

- frontend: [http://localhost:8080](http://localhost:8080)
- backend health: [http://localhost:4000/api/health](http://localhost:4000/api/health)

### Primeiro acesso

O backend cria o admin padrao do tenant `default` usando:

- `BOOTSTRAP_ADMIN_USERNAME`
- `BOOTSTRAP_ADMIN_PASSWORD`

Login inicial:

- URL: `/Access`
- tenant: `default` ou em branco

O admin do tenant `default` pode acompanhar todos os clientes na tela interna:

- `/Tenants`

### Cadastro de novos clientes

Fluxo publico:

- `/CadastroCliente`

Ao cadastrar um novo cliente, o sistema:

- cria o tenant em `public.tenants`
- provisiona o isolamento SQL
- cria `CondoSettings` inicial
- cria um usuario admin inicial do tenant
- devolve `loginUrl`, `username` e `temporaryPassword`

### Tenant por URL

O frontend self-hosted resolve o tenant por esta ordem:

1. query string `?tenant=slug`
2. sessao do funcionario autenticado
3. tenant salvo localmente
4. subdominio

Isso permite operar tanto com:

- `https://app.exemplo.com/Access?tenant=cliente_a`
- `https://cliente-a.exemplo.com/Access`

### Worker da fila

O servico `queue-worker` chama `processNotificationQueue` a cada 60 segundos usando `CRON_SECRET`.

Se preferir um cron externo, chame:

```bash
curl -X POST \
  -H "x-cron-secret: SEU_SEGREDO" \
  http://SEU_BACKEND/api/functions/processNotificationQueue
```

### Desenvolvimento local sem Docker

Backend:

```bash
cd backend
npm install
npm run start
```

Frontend:

```bash
npm install
npm run dev
```

### Base44

Se quiser continuar publicando pelo Base44, basta nao ativar `VITE_SELF_HOSTED`.
