# Éden Pixel

Um mundo em **pixel art** para celular, com Adão e Eva, biomas, estações do ano, clima, necessidades de sobrevivência
e uma população de coelhos com ciclo de vida. Tudo roda em **um único arquivo HTML** (`index.html`), sem dependências:
abra no navegador e jogue.

> Estado atual: protótipo em evolução. O foco até aqui foi o mundo, as necessidades do ser humano e o primeiro animal.

## Como jogar

| Ação | Como |
| --- | --- |
| Andar | Toque no mapa: o Adão pula até lá, procurando o melhor caminho e contornando água, troncos e pedras |
| Beber | Toque num lago (a água do mar é salgada; o gelo mata a sede, mas esfria o corpo) |
| Colher | Toque numa planta comestível (elas brilham quando você está perto) |
| Mover a câmera | Arraste o mapa; o botão 🎯 volta a seguir o Adão |
| Mapa completo | Toque no minimapa (círculo no canto): abre o mundo todo em tela cheia, com o Adão, a Eva e a área que você está vendo; feche no ✕ (no computador, tecla `M` ou `Esc`) |
| Zoom | Pinça no celular, roda do mouse ou botões `+` e `−` (1× a 8×) |
| Ver detalhes | Toque na Eva, num coelho ou numa toca para um aviso com ícones e números |

No computador também dá para andar com as setas ou WASD.

## O que existe no jogo

- **Mundo grande (4000 × 3000 px)**, gerado por pedaços: polo Norte de gelo, tundra e taiga, clima temperado no meio e
  trópicos ao Sul; deserto a oeste e selva e pântano a leste.
- **Adão e Eva** em pixel art. A Eva anda sozinha, cuida das próprias necessidades e, sem casa, fica por perto do Adão.
- **Necessidades**: comida, água, temperatura do corpo, energia e saúde. Sem cama só se dorme desmaiando de sono.
- **Dia e noite**: 10 min de dia e 10 min de noite, com gradiente entre eles.
- **Estações**: primavera, verão, outono e inverno (40 min cada), com cores, neve, flores, folhas caindo, lagos que
  congelam, comida de época e temperatura próprias de cada ambiente.
- **Tempo**: chuva, neve, nevasca e chuva de areia, com efeitos no corpo e no andar.
- **Natureza em movimento**: vento balançando as plantas, sombras de nuvens e ondulações na água.
- **Coelhos** (só de dia): filhote, jovem, adulto e idoso; reprodução, mortes (idade, fome, acidente, frio, superlotação),
  dispersão e fundação de novas tocas. A população do mundo todo é simulada, mesmo longe da câmera.
  O catálogo mostra estatísticas ao vivo.
- **Catálogo** (aba na parte de baixo): plantas, Adão e Eva e a ecologia dos coelhos.

## Estrutura do repositório

```
index.html          o jogo completo (gerado por build.py; é o arquivo que se abre no navegador)
build.py            junta src/ no index.html
src/
  index.template.html   HTML e CSS
  01-adao-e-sprites.js  constantes, grade de pixels e sprites do Adão
  02-plantas.js         ferramentas de desenho e espécies de plantas
  03-mundo.js           biomas, terreno por pedaços, vegetação, busca de rotas
  04-eva.js             sprites e comportamento da Eva
  05-necessidades.js    relógio, clima do ar, necessidades e painel
  06-estacoes-e-clima.js estações, cores sazonais, plantas sazonais e tempo
  07-natureza-em-movimento.js vento e folhas
  08-coelhos.js         sprites, ciclo de vida, ecologia e comportamento dos coelhos
  09-jogo.js            personagem, mapa, minimapa, catálogo e entrada
tests/              testes automatizados (Playwright)
docs/sprites/       folhas de sprites (Eva, coelho e os animais antigos)
legacy/animais/     código dos animais da versão anterior (fora do build)
```

### Gerar o `index.html`

```bash
python3 build.py
```

Depois de editar qualquer arquivo em `src/`, rode o comando acima. O `index.html` versionado já está atualizado.

### Testes

Os testes abrem o jogo num Chromium sem janela e conferem rotas, câmera, necessidades, estações, dia e noite, a Eva,
a natureza e a população de coelhos.

```bash
pip install playwright && playwright install chromium
python3 tests/teste_rotas.py
```

Se o Chromium não estiver no caminho padrão, informe-o: `CHROME_PATH=/caminho/do/chrome python3 tests/teste_rotas.py`.
Alguns testes salvam capturas de tela na pasta atual (ignoradas pelo Git).

## Próximos passos (ideias)

- Casa e camas, com a Eva livre quando houver casa.
- Fogo e roupas para sobreviver ao frio e à noite.
- Caça e pesca; predadores; mais espécies diurnas.
- Outras necessidades: higiene, doenças e ânimo.

## Licença

Ainda não definida.
