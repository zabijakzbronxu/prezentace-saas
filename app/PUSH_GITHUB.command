#!/usr/bin/env bash
#
# PUSH_GITHUB.command — jednorázové nahrání projektu na GitHub.
# Použití: dvojklik v Finderu, NEBO v Terminálu spusť  ./PUSH_GITHUB.command
# Určeno pro macOS. Nic nemaže, jen nastaví remote a nahraje kód.
#
set -euo pipefail

BOLD=$'\033[1m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RED=$'\033[31m'; RESET=$'\033[0m'

pause_exit() { echo; read -r -p "Stiskni Enter pro zavření…" _ || true; exit "${1:-0}"; }

echo "${BOLD}== Nahrání projektu na GitHub ==${RESET}"
echo

# 1) git musí existovat
if ! command -v git >/dev/null 2>&1; then
  echo "${RED}Chyba: 'git' není nainstalovaný.${RESET}"
  echo "Nainstaluj ho: v Terminálu napiš  ${BOLD}xcode-select --install${RESET}  a spusť skript znovu."
  pause_exit 1
fi

# 2) Přejdi do složky skriptu (app/) a najdi kořen git repozitáře
cd "$(dirname "$0")"
if ! REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"; then
  echo "${RED}Chyba: tahle složka není v git repozitáři.${RESET}"
  echo "Skript musí ležet uvnitř projektu 'prezentace-saas'."
  pause_exit 1
fi
cd "$REPO_ROOT"
BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)"
echo "Repozitář: ${BOLD}$REPO_ROOT${RESET}"
echo "Větev:     ${BOLD}$BRANCH${RESET}"
echo

# 3) Když už remote 'origin' existuje, jen nabídni push
if git remote get-url origin >/dev/null 2>&1; then
  EXISTING="$(git remote get-url origin)"
  echo "${YELLOW}Remote 'origin' už je nastavený:${RESET} $EXISTING"
  read -r -p "Nahrát (push) na tento remote? [a/N] " ans
  if [[ "${ans:-}" =~ ^[aAyY]$ ]]; then
    git push -u origin "$BRANCH"
    echo "${GREEN}Hotovo — nahráno.${RESET}"
  else
    echo "OK, nic jsem neudělal."
  fi
  pause_exit 0
fi

# 4) Cesta A — GitHub CLI (gh) je nainstalované a přihlášené → vše automaticky
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  echo "${GREEN}Našel jsem GitHub CLI (gh) a jsi přihlášený — udělám to za tebe.${RESET}"
  read -r -p "Název nového repozitáře [prezentace-saas]: " REPO_NAME
  REPO_NAME="${REPO_NAME:-prezentace-saas}"
  read -r -p "Má být SOUKROMÝ? [A/n] " priv
  if [[ "${priv:-a}" =~ ^[nN]$ ]]; then VIS="--public"; else VIS="--private"; fi
  echo "Vytvářím repozitář a nahrávám…"
  gh repo create "$REPO_NAME" "$VIS" --source="." --remote=origin --push
  echo "${GREEN}Hotovo — repo vytvořeno a kód nahrán.${RESET}"
  pause_exit 0
fi

# 5) Cesta B — ruční: vytvoř prázdný repo na webu a vlož URL
echo "GitHub CLI (gh) nenalezeno nebo nepřihlášeno — použijeme ruční způsob."
echo
echo "${BOLD}Nejdřív na webu:${RESET}"
echo "  1. Jdi na  https://github.com/new"
echo "  2. Zadej název (např. prezentace-saas)."
echo "  3. ${RED}DŮLEŽITÉ:${RESET} NEZAŠKRTÁVEJ 'Add a README', '.gitignore' ani 'license'."
echo "     (Repo musí být úplně prázdný, jinak vznikne konflikt.)"
echo "  4. Klikni 'Create repository' a zkopíruj URL (končí na .git)."
echo
read -r -p "Vlož URL repozitáře: " REPO_URL
if [[ -z "${REPO_URL:-}" ]]; then
  echo "${RED}Nezadal jsi URL. Končím, nic se nestalo.${RESET}"
  pause_exit 1
fi
git remote add origin "$REPO_URL"
echo "Nahrávám…"
git push -u origin "$BRANCH"
echo "${GREEN}Hotovo — nahráno na $REPO_URL${RESET}"
pause_exit 0
