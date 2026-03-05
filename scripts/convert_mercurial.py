#!/usr/bin/env python3
"""
Extraction des tableaux d'un fichier Word (.docx) de mercuriale Burkina Faso vers CSV.
Expert Data Engineer - Extraction propre avec nettoyage des données et formatage des prix.

Usage: python convert_mercurial.py <fichier.docx> [mercurial_burkina.csv]
"""

import re
import sys
from pathlib import Path

import pandas as pd
from docx import Document
from tqdm import tqdm

# Mots-clés pour détecter les lignes d'en-têtes (à ignorer)
HEADER_KEYWORDS = [
    "code", "désignation", "designation", "libellé", "libelle", "caractéristiques",
    "unité", "unite", "conditionnement", "minimum", "moyen", "maximum", "plafond",
    "prix", "htva", "fcfa", "ouagadougou", "kadiogo",
]


def clean_cell(text: str) -> str:
    """Nettoie une cellule : espaces insécables, retours à la ligne, espaces inutiles."""
    if not text:
        return ""
    s = str(text).replace("\xa0", " ").replace("\n", " ").replace("\r", " ")
    return re.sub(r"\s+", " ", s).strip()


def clean_price(value: str) -> float | int | None:
    """
    Nettoie la colonne Prix : enlève FCFA, espaces milliers (10 000 -> 10000),
    point milliers européen (42.500 -> 42500). Retourne float ou int, ou None si invalide.
    """
    if not value or not str(value).strip():
        return None
    s = str(value).strip().upper().replace("FCFA", "").replace("F CFA", "")
    s = s.replace(" ", "").replace("\xa0", "").replace("\u00a0", "")
    s = re.sub(r"[^\d.,\-]", "", s)
    if not s or s in ("-", "."):
        return None
    if "," in s and "." not in s:
        parts = s.split(",")
        if len(parts) == 2 and len(parts[1]) == 3 and parts[1].isdigit():
            s = "".join(parts)
        else:
            s = s.replace(",", ".")
    elif "." in s and "," not in s:
        parts = s.split(".")
        if len(parts) >= 2 and all(p.isdigit() for p in parts) and len(parts[-1]) == 3:
            s = "".join(parts)
    elif "," in s and "." in s:
        s = s.replace(".", "").replace(",", ".")
    try:
        n = float(s.replace(",", "."))
        return int(n) if n == int(n) else n
    except ValueError:
        return None


def is_header_row(cells: list[str]) -> bool:
    """Détecte si la ligne est un en-tête de colonnes."""
    text = " ".join(str(c).lower() for c in cells)
    return any(kw in text for kw in HEADER_KEYWORDS)


def get_column_indices(header_row: list[str], num_cols: int) -> dict[str, int]:
    """Déduit les indices Code, Designation, Unite, Prix_Plafond à partir d'une ligne d'en-tête."""
    indices = {"code": 0, "designation": 1, "unite": 2, "prix_plafond": -1}
    for i, cell in enumerate(header_row[:num_cols]):
        val = str(cell).lower()
        if any(k in val for k in ["code", "article"]):
            indices["code"] = i
        elif any(k in val for k in ["désignation", "designation", "libellé", "caractéristiques"]):
            indices["designation"] = i
        elif any(k in val for k in ["unité", "unite", "conditionnement"]):
            indices["unite"] = i
        elif any(k in val for k in ["maximum", "max", "plafond"]):
            indices["prix_plafond"] = i
        elif any(k in val for k in ["minimum", "moyen"]) and indices["prix_plafond"] < 0:
            indices["prix_plafond"] = num_cols - 1
    if indices["prix_plafond"] < 0 and num_cols >= 4:
        indices["prix_plafond"] = num_cols - 1
    return indices


def extract_table(table, table_idx: int) -> list[dict]:
    """Extrait les lignes d'un tableau Word."""
    rows_data = []
    if not table.rows:
        return rows_data

    num_cols = max(len(r.cells) for r in table.rows)
    header_found = False
    indices = {"code": 0, "designation": 1, "unite": 2, "prix_plafond": num_cols - 1 if num_cols >= 4 else -1}

    for row_idx, row in enumerate(table.rows):
        try:
            cells = [clean_cell(cell.text) for cell in row.cells]
            while len(cells) < num_cols:
                cells.append("")

            if is_header_row(cells):
                if not header_found:
                    indices = get_column_indices(cells, num_cols)
                    header_found = True
                continue

            code = clean_cell(cells[indices["code"]]) if indices["code"] >= 0 else ""
            designation = clean_cell(cells[indices["designation"]]) if indices["designation"] >= 0 else ""
            unite = clean_cell(cells[indices["unite"]]) if indices["unite"] >= 0 else "Unité"

            prix_val = None
            if indices["prix_plafond"] >= 0:
                prix_val = clean_price(cells[indices["prix_plafond"]])
            if prix_val is None:
                for c in range(indices["unite"] + 1 if indices["unite"] >= 0 else 3, len(cells)):
                    p = clean_price(cells[c])
                    if p is not None and p > 0:
                        prix_val = p
                        break

            if not code and not designation:
                continue

            rows_data.append({
                "Code": code or f"T{table_idx}_R{row_idx}",
                "Designation": designation or code,
                "Unite": unite or "Unité",
                "Prix_Plafond": prix_val if prix_val is not None else "",
            })
        except Exception as e:
            print(f"\n[Erreur ligne {row_idx + 1} du tableau {table_idx + 1}] {e}")

    return rows_data


def main():
    if len(sys.argv) < 2:
        print("Usage: python convert_mercurial.py <fichier.docx> [mercurial_burkina.csv]")
        print("Exemple: python convert_mercurial.py Mercuriale_2026_OUAGADOUGOU.docx")
        sys.exit(1)

    docx_path = Path(sys.argv[1])
    if not docx_path.exists():
        print(f"Erreur: fichier introuvable: {docx_path}")
        sys.exit(1)
    if docx_path.suffix.lower() != ".docx":
        print("Erreur: le fichier doit être au format .docx")
        sys.exit(1)

    output_path = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("mercurial_burkina.csv")
    script_dir = Path(__file__).parent
    if not output_path.is_absolute():
        output_path = script_dir / output_path

    print(f"Chargement: {docx_path}")
    doc = Document(str(docx_path))
    tables = doc.tables
    print(f"Nombre de tableaux: {len(tables)}")

    all_rows = []
    global_row = 0

    for table_idx, table in enumerate(tqdm(tables, desc="Extraction des tableaux", unit="tableau")):
        try:
            rows = extract_table(table, table_idx)
            for r in rows:
                global_row += 1
                try:
                    all_rows.append(r)
                except Exception as e:
                    print(f"\n[Erreur ligne {global_row}] {e}")
        except Exception as e:
            print(f"\n[Erreur tableau {table_idx + 1}] {e}")

    if not all_rows:
        print("Aucune donnée extraite.")
        sys.exit(1)

    df = pd.DataFrame(all_rows)
    df.to_csv(output_path, sep=";", index=False, encoding="utf-8-sig")
    print(f"\nExporté: {len(df)} lignes -> {output_path}")


if __name__ == "__main__":
    main()
