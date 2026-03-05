# Diagnostic — Accès Internet FasoMarchés

## Résultat du diagnostic

| Élément | Statut |
|---------|--------|
| Serveur écoute sur 0.0.0.0:3001 | ✅ OK |
| Règle pare-feu Windows port 3001 | ❌ **ABSENTE** |
| IP locale du PC | 192.168.88.254 |
| IP publique | 102.180.101.14 |

---

## Problème principal : Pare-feu Windows

**La règle pare-feu n'a pas été ajoutée.** Le pare-feu bloque les connexions entrantes sur le port 3001.

### Solution immédiate

1. **Clic droit** sur `OUVRIR_PORTAIL_3001.bat`
2. **Exécuter en tant qu'administrateur**
3. Valider la demande UAC

---

## Commande NAT MikroTik à utiliser

Votre PC a l'IP **192.168.88.254**. La règle doit rediriger vers cette IP :

```
/ip firewall nat add chain=dstnat action=dst-nat to-addresses=192.168.88.254 to-ports=3001 protocol=tcp dst-port=3001 comment="FasoMarches"
```

> Si l'IP de votre PC change (DHCP), réservez-la dans le MikroTik ou configurez une IP fixe.

---

## Test d'accès

- **Depuis Internet** : http://102.180.101.14:3001
- **Depuis le réseau local** : http://192.168.88.254:3001

---

## Checklist complète

- [ ] Exécuter `OUVRIR_PORTAIL_3001.bat` en administrateur
- [ ] Vérifier la règle NAT sur le MikroTik (to-addresses=192.168.88.254)
- [ ] Lancer `LANCER_PRODUCTION.bat`
- [ ] Tester depuis un téléphone en 4G (hors WiFi) : http://102.180.101.14:3001
