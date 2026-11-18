#!/usr/bin/env python3
"""Junta os módulos de `src/` e gera o `index.html` (jogo em um arquivo só)."""
import pathlib

RAIZ = pathlib.Path(__file__).resolve().parent
SRC = RAIZ / "src"


def montar() -> str:
    """Lê o modelo HTML e coloca os módulos JavaScript, em ordem numérica, no lugar do marcador."""
    modelo = (SRC / "index.template.html").read_text(encoding="utf-8")
    codigo = "".join(p.read_text(encoding="utf-8") for p in sorted(SRC.glob("[0-9][0-9]-*.js")))
    return modelo.replace("/*__SCRIPT__*/", codigo)


if __name__ == "__main__":
    saida = RAIZ / "index.html"
    saida.write_text(montar(), encoding="utf-8")
    print(f"gerado: {saida} ({saida.stat().st_size / 1024:.0f} KB)")
