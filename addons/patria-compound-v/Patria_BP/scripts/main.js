/**
 * ═══════════════════════════════════════════════════════════════════
 *  PÁTRIA: COMPOUND V — v1.0.0
 *  Minecraft Bedrock 26.51+ · @minecraft/server 2.0.0
 *
 *  Mecânicas:
 *   · Todo jogador recebe UMA seringa de Soro V ao entrar no mundo.
 *   · Injetar o Soro V transforma o jogador no Capitão Pátria:
 *       – Superforça   (Strength II + Resistance I + Regeneration I)
 *       – Voo          (ability mayfly + slow falling permanente)
 *       – Fogo/imunidade (Fire Resistance)
 *   · Emblema Compound V (entregue na transformação):
 *       – Clique                 → RAIO LASER (perfura e destrói o caminho)
 *       – Agachar + Clique       → GRITO SÔNICO (dano e repulsão em área)
 *   · O Emblema se recompõe no inventário sempre que o jogador reaparece
 *     sem tê-lo (perdeu/morreu com ele).
 * ═══════════════════════════════════════════════════════════════════
 */

import { world, system, ItemStack, GameMode } from "@minecraft/server";

// ───────────────────────────────────────────────────────────── configuração
const CONFIG = {
  syringeItem: "patria:compound_v",
  emblemItem: "patria:compound_v_emblem",

  // cooldowns (em ticks — 20 ticks = 1 segundo)
  laserCooldownTicks: 50,    // 2.5 s
  screamCooldownTicks: 120,  // 6 s

  // raio laser
  laserRange: 34,            // alcance máximo em blocos
  laserStep: 0.5,            // espaçamento da amostragem do feixe
  laserDamage: 18,           // dano por alvo atingido (9 corações)
  laserEntityRadius: 1.4,    // largura do feixe para acerto em entidades

  // grito sônico
  screamRadius: 10,          // raio de alcance em blocos
  screamDamage: 12,          // dano por alvo (6 corações)
  glassBreakRadius: 7,       // raio de quebra de vidro/gelo
  glassBreakCap: 150,        // limite de blocos estilhaçados por grito
};

// dynamic properties (persistentes por jogador)
const PROP = {
  transformed: "patria:is_patria",
  starterGiven: "patria:received_vaccine",
  laserReadyAt: "patria:laser_ready_at",
  screamReadyAt: "patria:scream_ready_at",
};

// blocos que o laser NÃO pode destruir
const UNBREAKABLE = new Set([
  "minecraft:bedrock",
  "minecraft:barrier",
  "minecraft:command_block",
  "minecraft:chain_command_block",
  "minecraft:repeating_command_block",
  "minecraft:structure_block",
  "minecraft:jigsaw_block",
  "minecraft:end_gateway_block",
]);

// entidades que o feixe/grito ignoram
const IGNORED_HITS = new Set([
  "minecraft:item",
  "minecraft:xp_orb",
  "minecraft:arrow",
  "minecraft:trident",
  "minecraft:fireworks_rocket",
]);

// deduplicar itemUse/itemCompleteUse (o motor dispara os dois para o mesmo uso)
const lastUse = new Map(); // "playerId:itemId" -> tick
const USE_DEDUPE_TICKS = 10;

// ───────────────────────────────────────────────────────────────── helpers
function safeActionBar(player, text) {
  try {
    player.onScreenDisplay.setActionBar(text);
  } catch {
    try { player.sendMessage(text); } catch { /* silencioso */ }
  }
}

function sendTitle(player, title) {
  try {
    player.onScreenDisplay.setTitle(title, {
      subtitle: "§7O menino dourado despertou",
      fadeInDuration: 12,
      stayDuration: 70,
      fadeOutDuration: 24,
    });
  } catch {
    try { player.onScreenDisplay.setTitle(title); } catch { /* sem título */ }
  }
}

function inventoryOf(player) {
  try {
    const comp = player.getComponent("inventory") ?? player.getComponent("minecraft:inventory");
    return comp?.container ?? null;
  } catch {
    return null;
  }
}

function giveItem(player, typeId, amount) {
  const container = inventoryOf(player);
  if (!container) {
    player.sendMessage("§c[Vought] Inventário indisponível — peça o item a um admin.");
    return;
  }
  const leftover = container.addItem(new ItemStack(typeId, amount));
  if (leftover) {
    player.sendMessage("§e[Vought] Inventário cheio! O item caiu aos seus pés.");
    try {
      player.dimension.spawnItem(leftover, player.location);
    } catch {
      // spawnItem indisponível — sem drama, o item foi perdido
    }
  }
}

function removeOne(player, typeId) {
  const container = inventoryOf(player);
  if (!container) return false;
  for (let i = 0; i < container.size; i++) {
    const item = container.getItem(i);
    if (!item || item.typeId !== typeId) continue;
    if (item.amount <= 1) {
      container.setItem(i, undefined);
    } else {
      item.amount = item.amount - 1;
      container.setItem(i, item);
    }
    return true;
  }
  return false;
}

function hasItem(player, typeId) {
  const container = inventoryOf(player);
  if (!container) return false;
  for (let i = 0; i < container.size; i++) {
    const item = container.getItem(i);
    if (item && item.typeId === typeId) return true;
  }
  return false;
}

function horizontalNormalize(x, z) {
  const len = Math.hypot(x, z);
  if (len < 1e-4) return { x: 0, z: 1 };
  return { x: x / len, z: z / len };
}

function viewDirectionFromRotation(player) {
  const rotation = player.getRotation();
  const pitch = (rotation.x * Math.PI) / 180;
  const yaw = (rotation.y * Math.PI) / 180;
  const cosPitch = Math.cos(pitch);
  return {
    x: -Math.sin(yaw) * cosPitch,
    y: -Math.sin(pitch),
    z: Math.cos(yaw) * cosPitch,
  };
}

function getLookDirection(player) {
  try {
    const dir = player.getViewDirection();
    if (dir && Number.isFinite(dir.x)) return dir;
  } catch {
    /* fallback abaixo */
  }
  return viewDirectionFromRotation(player);
}

function isProtectedPlayer(entity) {
  if (entity.typeId !== "minecraft:player") return false;
  try {
    const gm = entity.getGameMode();
    return gm === GameMode.creative || gm === GameMode.spectator;
  } catch {
    return false;
  }
}

function isBreakable(typeId) {
  return !UNBREAKABLE.has(typeId);
}

function isGlassLike(typeId) {
  return (
    typeId.includes("glass") ||
    typeId.includes("_ice") ||
    typeId === "minecraft:ice" ||
    typeId.includes("frosted")
  );
}

function isHittable(entity, attacker) {
  if (entity.id === attacker.id) return false;
  if (IGNORED_HITS.has(entity.typeId)) return false;
  if (isProtectedPlayer(entity)) return false;
  return true;
}

// ─────────────────────────────────────────── poderes passivos permanentes
function applyPowers(player) {
  // Superforça, tanque e regeneração — reaplicados a cada 10 s
  player.addEffect("strength", 12000, { amplifier: 1, showParticles: false });      // Strength II
  player.addEffect("resistance", 12000, { amplifier: 0, showParticles: false });    // Resistance I
  player.addEffect("regeneration", 12000, { amplifier: 0, showParticles: false });  // Regeneration I
  player.addEffect("fire_resistance", 12000, { amplifier: 0, showParticles: false });
  player.addEffect("slow_falling", 12000, { amplifier: 0, showParticles: false });  // não sofre dano de queda

  // Voo (habilidade nativa do motor — não exige cheats, concedida via script)
  try {
    player.runCommand("ability @s mayfly true");
  } catch {
    // Sem permissão de comando neste mundo: slow falling segura o ataque aéreo.
  }
}

function ensureEmblem(player) {
  if (hasItem(player, CONFIG.emblemItem)) return;
  giveItem(player, CONFIG.emblemItem, 1);
  player.sendMessage("§6[Vought] §fO Emblema Compound V se recompôs no seu inventário.");
}

// ───────────────────────────────────────────────────────────── habilidades
function injectSerum(player) {
  if (player.getDynamicProperty(PROP.transformed)) {
    safeActionBar(player, "§eCompound V já corre no seu sangue — os poderes já são seus.");
    return;
  }

  removeOne(player, CONFIG.syringeItem);
  player.setDynamicProperty(PROP.transformed, true);

  giveItem(player, CONFIG.emblemItem, 1);
  applyPowers(player);

  const dim = player.dimension;
  const loc = player.location;
  const above = { x: loc.x, y: loc.y + 1, z: loc.z };

  dim.playSound("patria.inject", loc, { volume: 1.0, pitch: 1.0 });
  dim.playSound("patria.transform", loc, { volume: 1.3, pitch: 1.0 });

  // explosão de energia dourada/branca
  for (let i = 0; i < 26; i++) {
    const angle = (i / 26) * Math.PI * 2;
    dim.spawnParticle("minecraft:flame_particle", {
      x: loc.x + Math.cos(angle) * 1.6,
      y: loc.y + 0.4 + (i % 4) * 0.45,
      z: loc.z + Math.sin(angle) * 1.6,
    });
  }
  for (let i = 0; i < 6; i++) {
    dim.spawnParticle("minecraft:large_explosion", above);
  }

  sendTitle(player, "§l§6P Á T R I A");
  world.sendMessage(`§6[Vought] §fO menino dourado despertou em §e${player.nameTag}§f. O céu observa.`);

  try {
    player.addEffect("instant_health", 1, { amplifier: 4, showParticles: true });
  } catch { /* cura é bônus */ }

  safeActionBar(player, "§aCompound V injetado! §fEmblema → clique: §cRaio Laser §f| agachar+clique: §4Grito Sônico");
}

function fireLaser(player) {
  const now = system.currentTick;
  const readyAt = Number(player.getDynamicProperty(PROP.laserReadyAt) ?? 0);
  if (now < readyAt) {
    safeActionBar(player, `§cVisão laser recarregando… §7${((readyAt - now) / 20).toFixed(1)}s`);
    return;
  }
  player.setDynamicProperty(PROP.laserReadyAt, now + CONFIG.laserCooldownTicks);

  const dim = player.dimension;
  const head = player.getHeadLocation();
  const dir = getLookDirection(player);

  dim.playSound("patria.laser", head, { volume: 1.4, pitch: 1.0 });

  const hitEntities = new Set();
  let blocksDestroyed = 0;
  const step = CONFIG.laserStep;

  for (let d = 1.6; d <= CONFIG.laserRange; d += step) {
    const pos = { x: head.x + dir.x * d, y: head.y + dir.y * d, z: head.z + dir.z * d };

    // trilha de energia
    if (Math.round(d / step) % 2 === 0) {
      dim.spawnParticle("minecraft:flame_particle", pos);
    }

    // destruir blocos no caminho
    try {
      const block = dim.getBlock(pos);
      if (block && !block.isAir && isBreakable(block.typeId)) {
        block.setType("minecraft:air");
        blocksDestroyed++;
        if (Math.random() < 0.35) {
          dim.spawnParticle("minecraft:smoke_particle", pos);
        }
      }
    } catch { /* bloco protegido — ignora */ }

    // ferir entidades atravessadas
    try {
      const targets = dim.getEntities({ location: pos, maxDistance: CONFIG.laserEntityRadius });
      for (const target of targets) {
        if (!isHittable(target, player)) continue;
        if (hitEntities.has(target.id)) continue;
        hitEntities.add(target.id);
        try {
          target.applyDamage(CONFIG.laserDamage);
        } catch { /* alvo intangível */ }
        const knock = horizontalNormalize(dir.x, dir.z);
        try {
          // API 2.0.0: applyKnockback(horizontalForce: VectorXZ, verticalStrength: number)
          target.applyKnockback({ x: knock.x * 4.5, z: knock.z * 4.5 }, 2.2);
        } catch { /* sem knockback */ }
        dim.spawnParticle("minecraft:large_explosion", {
          x: target.location.x,
          y: target.location.y + 1,
          z: target.location.z,
        });
      }
    } catch { /* consulta de entidades falhou neste passo */ }
  }

  // clarão no ponto de fuga do feixe
  dim.spawnParticle("minecraft:large_explosion", {
    x: head.x + dir.x * CONFIG.laserRange,
    y: head.y + dir.y * CONFIG.laserRange,
    z: head.z + dir.z * CONFIG.laserRange,
  });

  safeActionBar(player, `§c§lRAIO LASER §8— §f${hitEntities.size} alvo(s) · ${blocksDestroyed} bloco(s) destruído(s)`);
}

function scream(player) {
  const now = system.currentTick;
  const readyAt = Number(player.getDynamicProperty(PROP.screamReadyAt) ?? 0);
  if (now < readyAt) {
    safeActionBar(player, `§cGrito sônico recarregando… §7${((readyAt - now) / 20).toFixed(1)}s`);
    return;
  }
  player.setDynamicProperty(PROP.screamReadyAt, now + CONFIG.screamCooldownTicks);

  const dim = player.dimension;
  const origin = { x: player.location.x, y: player.location.y + 1.4, z: player.location.z };

  dim.playSound("patria.scream", origin, { volume: 2.0, pitch: 1.0 });

  // anéis de choque em duas alturas
  for (let i = 0; i < 36; i++) {
    const angle = (i / 36) * Math.PI * 2;
    for (const radius of [2.2, 4.6, 7.0]) {
      dim.spawnParticle("minecraft:smoke_particle", {
        x: origin.x + Math.cos(angle) * radius,
        y: origin.y + (radius > 4.6 ? 0.7 : -0.3),
        z: origin.z + Math.sin(angle) * radius,
      });
    }
  }
  dim.spawnParticle("minecraft:large_explosion", origin);

  // dano + repulsão radial + atordoamento
  let hits = 0;
  try {
    const targets = dim.getEntities({ location: origin, maxDistance: CONFIG.screamRadius });
    for (const target of targets) {
      if (!isHittable(target, player)) continue;
      const push = horizontalNormalize(
        target.location.x - origin.x,
        target.location.z - origin.z
      );
      try {
        target.applyDamage(CONFIG.screamDamage);
      } catch { /* intangível */ }
      try {
        target.applyKnockback({ x: push.x * 5.4, z: push.z * 5.4 }, 3.8);
      } catch { /* sem knockback */ }
      try {
        target.addEffect("slowness", 50, { amplifier: 3, showParticles: true }); // atordoado 2.5 s
        target.addEffect("weakness", 100, { amplifier: 1, showParticles: false });
      } catch { /* sem efeitos */ }
      hits++;
    }
  } catch { /* consulta falhou */ }

  // estilhaça vidro e gelo ao redor
  let broken = 0;
  const glassRadius = CONFIG.glassBreakRadius;
  const center = {
    x: Math.floor(origin.x),
    y: Math.floor(origin.y),
    z: Math.floor(origin.z),
  };
  for (let dx = -glassRadius; dx <= glassRadius && broken < CONFIG.glassBreakCap; dx++) {
    for (let dy = -4; dy <= 4 && broken < CONFIG.glassBreakCap; dy++) {
      for (let dz = -glassRadius; dz <= glassRadius && broken < CONFIG.glassBreakCap; dz++) {
        if (dx * dx + dz * dz > glassRadius * glassRadius) continue;
        try {
          const block = dim.getBlock({ x: center.x + dx, y: center.y + dy, z: center.z + dz });
          if (block && !block.isAir && isGlassLike(block.typeId)) {
            block.setType("minecraft:air");
            if (broken % 3 === 0) {
              dim.spawnParticle("minecraft:smoke_particle", {
                x: center.x + dx + 0.5,
                y: center.y + dy + 0.5,
                z: center.z + dz + 0.5,
              });
            }
            broken++;
          }
        } catch { /* bloco fora do mundo/protegido */ }
      }
    }
  }

  safeActionBar(player, `§4§lGRITO SÔNICO §8— §f${hits} alvo(s) · ${broken} bloco(s) estilhaçado(s)`);
}

// ─────────────────────────────────────────────────────────── uso dos itens
function handleItemUse(player, itemTypeId) {
  if (!itemTypeId) return;

  // dedupe entre itemUse e itemCompleteUse
  const now = system.currentTick;
  const key = `${player.id}:${itemTypeId}`;
  const last = lastUse.get(key) ?? -Infinity;
  if (now - last < USE_DEDUPE_TICKS) return;
  lastUse.set(key, now);
  if (lastUse.size > 256) lastUse.clear(); // higiene de memória

  if (itemTypeId === CONFIG.syringeItem) {
    injectSerum(player);
    return;
  }

  if (itemTypeId === CONFIG.emblemItem) {
    if (!player.getDynamicProperty(PROP.transformed)) {
      safeActionBar(player, "§cO Emblema está inerte — falta o Compound V no seu sangue.");
      return;
    }
    if (player.isSneaking) {
      scream(player);
    } else {
      fireLaser(player);
    }
  }
}

// ───────────────────────────────────────────────────────────────── eventos
world.afterEvents.playerSpawn.subscribe((event) => {
  const player = event.player;
  try {
    if (event.initialSpawn && !player.getDynamicProperty(PROP.starterGiven)) {
      player.setDynamicProperty(PROP.starterGiven, true);
      giveItem(player, CONFIG.syringeItem, 1);
      player.sendMessage("§6[Vought] §eUm frasco de §cSoro V da Verdade §ese encontra no seu berço…");
      system.runTimeout(() => {
        safeActionBar(player, "§cUse o Soro V da Verdade para despertar o Capitão dentro de si.");
      }, 40);
    }

    // Transformação persiste através de mortes e reonexões
    if (player.getDynamicProperty(PROP.transformed)) {
      applyPowers(player);
      ensureEmblem(player);
      safeActionBar(player, "§6PÁTRIA §fonline — §eEmblema: clique = laser §f| §cagachar+clique = grito sônico");
    }
  } catch (error) {
    console.warn(`[Patria] playerSpawn falhou: ${error}`);
  }
});

world.afterEvents.itemUse.subscribe((event) => {
  try {
    handleItemUse(event.source, event.itemStack?.typeId);
  } catch (error) {
    console.warn(`[Patria] itemUse falhou: ${error}`);
  }
});

// Itens com duração de uso (como a seringa) também disparam este evento —
// o dedupe em handleItemUse evita processar o mesmo disparo duas vezes.
if (world.afterEvents.itemCompleteUse) {
  world.afterEvents.itemCompleteUse.subscribe((event) => {
    try {
      handleItemUse(event.source, event.itemStack?.typeId);
    } catch (error) {
      console.warn(`[Patria] itemCompleteUse falhou: ${error}`);
    }
  });
}

// Reafirma poderes periódicos (efeitos expiram, habilidades resetam)
system.runInterval(() => {
  for (const player of world.getAllPlayers()) {
    try {
      if (player.getDynamicProperty(PROP.transformed)) {
        applyPowers(player);
      }
    } catch (error) {
      console.warn(`[Patria] tick de poderes falhou: ${error}`);
    }
  }
}, 200); // a cada 10 segundos
