# 🦅 PÁTRIA: Compound V — Addon para Minecraft Bedrock 26.51+

> Fã-mod não oficial (sem fins lucrativos) inspirado no **Capitão Pátria / Homelander** de *The Boys*.
> Você acorda num mundo comum… com um frasco de **Soro V da Verdade** no berço. Injete. Desperte. Seja o menino dourado.

**Arquivo pronto para instalar:** [`dist/Patria_CompoundV_v1.0.0.mcaddon`](dist/Patria_CompoundV_v1.0.0.mcaddon)

---

## ✨ O que o mod faz

| Recurso | Descrição |
|---|---|
| 💉 **Soro V da Verdade** | Todo jogador **recebe uma seringa automaticamente ao entrar no mundo**. Injete (segure e use) para despertar. |
| 😤 **Superforça** | *Strength II* permanente + *Regeneration I*. Socos que arremessam mobs e inimigos. |
| 🕊️ **Voo** | Habilidade nativa de voar (`mayfly`) + *Slow Falling* permanente (nunca sofre dano de queda). |
| 🔥 **Resistência ao fogo** | V *ferve* sangue, não o seu. |
| 🛡️ **Resistance I** | Tanque como nenhum outro herói. |
| 🔴 **Raio Laser** | Com o **Emblema Compound V** em mãos → **clique** dispara um feixe destruidor: derrete entidades e **destrói blocos no caminho**. |
| 📣 **Grito Sônico** | **Agachar + clique** → onda de choque: dano pesado, repulsão radial, *Slowness IV* (atordoamento), **estilhaça vidro e gelo** num raio de 7 blocos. |
| 🩹 **Emblema autorregenerante** | Se você perder ou morrer com o Emblema, ele **se recompõe no seu inventário** ao reentrar no mundo. |
| ⚗️ **Receita de emergência** | Se perder a seringa: `maçã dourada + 4 lingotes de ouro + 4 redstone` → nova seringa. Emblema perdido: `seringa + lingote de ouro` (shapeless). |

Cooldowns equilibrados para não quebrar o servidor: **laser 2,5 s** · **grito 6 s**. Cooldown climático, poder cinematográfico.

## 📦 Conteúdo do pacote

```
Patria_BP/                      (pack de comportamento — a lógica)
├── manifest.json               formato 2 · min_engine 1.21+ · módulo Script API
├── items/compound_v.json       seringa (use_duration 1.6s, cooldown anti-spam)
├── items/compound_v_emblem.json emblema-arma (mão direita, uso 0.2s)
├── recipes/                    craft da seringa + receita de emergência
├── scripts/main.js             toda a lógica (Script API estável, sem experimental flags)
└── texts/ (pt_BR, en_US, es_MX)

Patria_RP/                      (pack de recursos — a arte)
├── manifest.json               dependência cruzada BP ⇄ RP
├── pack_icon.png               medalhão dourado 256×256 (arte original)
├── sounds.json                 patria.laser · patria.scream · patria.transform · patria.inject
├── sounds/powers/*.wav         SFX 100% sintetizados (laser, grito, transformação, injeção)
├── textures/items/             pixel art 16×16 desenhada à mão (seringa + emblema)
└── texts/ (pt_BR, en_US, es_MX)
```

## 🚀 Como instalar

1. Baixe o arquivo **`Patria_CompoundV_v1.0.0.mcaddon`**.
2. Abra-o com o Minecraft (duplo clique no PC, toque no arquivo no Android/iOS) — os dois packs são importados automaticamente.
3. Crie um mundo → **Packs de comportamento: ativar** `Pátria: Compound V (BP)` · **Packs de recursos: ativar** `Pátria: Compound V (RP)`.
4. Entre no mundo. **Você acordará com o Soro V no inventário.**
5. Injete o Soro V → você recebe o Emblema Compound V.
6. **Clique** com o Emblema = 🔴 Raio Laser · **Agachar + Clique** = 📣 Grito Sônico.

> Em Realms/servidores: ative os dois packs com *Behavior/Resource packs* e dê permissão de **Operador** NÃO é necessária — o mod não usa cheats. A habilidade de voo é concedida via Script API (`ability @s mayfly true`), que funciona sem trapaças ativadas.

## 🛠️ Compatibilidade

- **Minecraft Bedrock 26.51** (e 26.50), PC, Android, iOS, Xbox, PlayStation, Switch, Nintendo Switch, Windows 10/11.
- Min engine: `1.21.0` — funciona de 1.21.x a 26.x (usa Script API **estável** `@minecraft/server 2.0.0`; sem toggles experimentais).
- Texturas: pixel art nativa 16×16, sem Needs of RTX/shader específico.

## 🎮 Dicas de uso

- O feixe do laser atravessa e **destrói** a maioria dos blocos (bedrock, barreiras e command blocks são protegidos pelo motor).
- O Grito Sônico também ** estilhaça vidros, gelos e gelo compacto** num raio de 7 blocos — ótimo para derreter mansões de vidro do vilão.
- Morreu com o Emblema? Ele volta. O poder é para sempre — como as dívidas da Vought.

## ⚠️ Avisos

- The Boys e seus personagens pertencem aos seus respectivos donos. Este é um **fã-mod afetuoso**, sem afiliação com a Vought, Amazon Studios ou Titãs.
- Não use o feixe do laser em áreas de terreno que você queira preservar. Ele **destrói tudo no caminho** — igualzinho ao herói.

## 🔧 Build a partir do código-fonte

```bash
tools/build.sh   # reempacota dist/Patria_CompoundV_v1.0.0.mcaddon
python3 tools/make_textures.py   # regenera as texturas 16×16
python3 tools/make_sounds.py     # re-sintetiza os SFX .wav
```
