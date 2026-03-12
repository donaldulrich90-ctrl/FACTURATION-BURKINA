---
dest: ./Guide_Deploiement_MikroTik.pdf
pdf_options:
  format: A4
  margin: 20mm
  printBackground: true
---

# Mise en ligne FasoMarchés derrière un MikroTik

Ce guide explique comment exposer FasoMarchés sur Internet en utilisant votre routeur MikroTik pour la redirection de ports (NAT).

## Prérequis

- Un PC ou serveur Windows sur votre réseau local (ex. `192.168.88.100`)
- Node.js installé sur ce PC
- Un MikroTik configuré comme passerelle Internet
- Une IP publique (fixe ou dynamique avec DDNS)

---

## Étape 1 : Préparer l'application en production

### 1.1 Construire l'application

```batch
cd C:\Users\user\Documents\FACTURATION
npm run build
```

### 1.2 Configurer le serveur (server\.env)

Créez ou modifiez `server\.env` :

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="VOTRE_SECRET_TRES_LONG_ET_COMPLEXE_32_CARACTERES_MIN"
JWT_EXPIRES_IN="7d"
PORT=3001
NODE_ENV=production
```

> **Important** : Changez `JWT_SECRET` pour une valeur aléatoire et secrète en production.

### 1.3 Lancer en production

Utilisez le script `LANCER_PRODUCTION.bat` ou manuellement :

```batch
cd server
set NODE_ENV=production
node src/index.js
```

L'application sera accessible sur `http://VOTRE_IP_LOCALE:3001` (ex. `http://192.168.88.100:3001`).

---

## Étape 2 : Configurer le MikroTik

### 2.1 Redirection de port (NAT DST-NAT)

Connectez-vous à votre MikroTik (WinBox ou terminal SSH) et exécutez :

```
/ip firewall nat add chain=dstnat action=dst-nat to-addresses=192.168.88.100 to-ports=3001 protocol=tcp dst-port=3001 comment="FasoMarchés"
```

**Remplacez** `192.168.88.100` par l’IP locale du PC qui exécute FasoMarchés.

### 2.2 Règle de masquerade (si pas déjà configurée)

```
/ip firewall nat add chain=srcnat action=masquerade out-interface-list=WAN comment="Masquerade"
```

### 2.3 (Optionnel) Utiliser le port 80

Pour accéder via `http://votre-ip` sans préciser le port :

```
/ip firewall nat add chain=dstnat action=dst-nat to-addresses=192.168.88.100 to-ports=3001 protocol=tcp dst-port=80 comment="FasoMarchés HTTP"
```

Puis dans `server\.env`, mettez `PORT=80` (nécessite les droits administrateur sur Windows) ou utilisez un reverse proxy.

---

## Étape 3 : Accès depuis Internet

### Avec IP publique fixe

Accédez à : `http://VOTRE_IP_PUBLIQUE:3001`

### Avec IP dynamique (DDNS)

1. Créez un compte sur un service DDNS (No-IP, DuckDNS, etc.)
2. Configurez le DDNS sur le MikroTik : **IP > Cloud** ou un script DDNS
3. Accédez via : `http://votre-domaine.ddns.net:3001`

---

## Sécurité recommandée

1. **Pare-feu Windows** : Autorisez le port 3001 (entrée) pour le serveur Node
2. **JWT_SECRET** : Utilisez une clé longue et aléatoire
3. **HTTPS** : Pour une connexion chiffrée, utilisez un reverse proxy (nginx, Caddy) ou un tunnel (Cloudflare Tunnel)
4. **Sauvegardes** : Sauvegardez régulièrement `server/prisma/dev.db`

---

## Dépannage

| Problème | Solution |
|----------|----------|
| **Le MikroTik ne donne pas internet à la machine** | Voir section [Pas d'internet](#pas-dinternet-sur-la-machine) ci-dessous |
| Impossible d'accéder depuis l'extérieur | Vérifiez la règle NAT, le pare-feu Windows, et que le serveur écoute sur `0.0.0.0` (par défaut avec Express) |
| Connexion refusée | Vérifiez que Node.js tourne et écoute sur le bon port |
| Page blanche | Vérifiez que `npm run build` a été exécuté et que `dist/` existe |

### Pas d'internet sur la machine

Si votre PC connecté au MikroTik n'a pas accès à Internet, vérifiez dans WinBox ou le terminal :

1. **Connexion WAN (Internet)**  
   - `IP > Addresses` : l'interface WAN (ether1, pppoe-out, etc.) a-t-elle une IP ?  
   - `IP > Routes` : existe-t-il une route par défaut (`0.0.0.0/0`) vers la passerelle du FAI ?

2. **Masquerade (NAT)**  
   ```
   /ip firewall nat print
   ```
   Il doit y avoir une règle `chain=srcnat action=masquerade out-interface-list=WAN`.  
   Si absente :
   ```
   /ip firewall nat add chain=srcnat action=masquerade out-interface-list=WAN comment="Masquerade"
   ```

3. **DHCP et DNS**  
   - `IP > DHCP Server` : le serveur DHCP est-il actif sur le réseau local ?  
   - `IP > DNS` : des serveurs DNS sont-ils configurés (ex. `8.8.8.8`, `1.1.1.1`) ?  
   - Sur le PC : `ipconfig /all` — avez-vous une IP en 192.168.88.x et une passerelle (ex. 192.168.88.1) ?

4. **Interface WAN**  
   - `Interfaces` : l'interface WAN est-elle "running" ?  
   - Si PPPoE : `PPP` — la connexion est-elle établie ?

5. **Liste d'interfaces WAN**  
   - `IP > Firewall > Interface Lists` : la liste `WAN` doit contenir l'interface vers Internet (ether1, pppoe-out, etc.).  
   - Si la liste WAN est vide ou inexistante, la règle masquerade ne fonctionnera pas.

---

## Résumé des commandes MikroTik

```
# Ajouter la redirection
/ip firewall nat add chain=dstnat action=dst-nat to-addresses=192.168.88.100 to-ports=3001 protocol=tcp dst-port=3001 comment="FasoMarchés"

# Lister les règles NAT
/ip firewall nat print

# Supprimer une règle (remplacez 0 par le numéro)
/ip firewall nat remove 0
```
