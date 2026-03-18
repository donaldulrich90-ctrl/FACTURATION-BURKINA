# ========== Étape 1 : Build du frontend React ==========
FROM node:20-slim AS frontend-builder

WORKDIR /app

COPY package*.json ./
COPY scripts ./scripts
COPY public ./public
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build

# ========== Étape 2 : Image finale ==========
FROM node:20-slim

# Python pour convertisseur.py (extraction Word mercuriale) + wget pour healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip wget \
    && rm -rf /var/lib/apt/lists/* \
    && pip3 install --break-system-packages python-docx pandas tqdm 2>/dev/null || true

WORKDIR /app

# Copier le frontend buildé
COPY --from=frontend-builder /app/dist ./dist

# Copier le serveur et le convertisseur Python
COPY server ./server
COPY convertisseur.py ./convertisseur.py

WORKDIR /app/server

# Installer les dépendances du serveur et générer le client Prisma
RUN npm ci --omit=dev --legacy-peer-deps && npx prisma generate

# Créer les dossiers pour les uploads (DAO, archives)
RUN mkdir -p uploads/dao uploads/archives

RUN chmod +x docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

ENTRYPOINT ["./docker-entrypoint.sh"]
