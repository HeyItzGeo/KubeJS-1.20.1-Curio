# KubeJS 6 Curios & Player Data Managers (1.20.1)

I was getting annoyed. I wanted a way to manage **Curios inventories** in Minecraft 1.20.1, but I couldn’t find any mods or scripts that actually worked without bugs or crashes. On top of that, I wanted a solution to **save and restore player inventory and stats** reliably. So I decided to make my own—and make it **open-source**.  

This repository contains **two scripts**:

1. **Curios Manager** – Manage Curios inventories only.
2. **Full Player Data Manager** – Includes Curios management **plus** full player data save/load (`/inv_save` and `/inv_load`).

Both scripts use **persistent data**, so backups survive server restarts and relogs.

---

## Script 1: Curios Manager

Handles only Curios inventory.

### Features

- **Print Curios Inventory**  
  View equipped Curios items per slot.
- **Clear Curios Inventory**  
  Remove items but preserve slot layout.
- **Backup & Restore Curios**  
  Save and restore Curios items persistently.

### Commands

| Command | Description |
|---------|-------------|
| `/print_curios` | Displays detailed Curios inventory. |
| `/curios backup` | Saves current Curios inventory. |
| `/curios restore` | Restores Curios from backup. |
| `/clear_curios` | Clears all Curios items while preserving slots. |
| `/curios clear_backup` | Clears the saved Curios backup. |

---

## Script 2: Full Player Data Manager

Includes everything from Curios Manager **plus full player inventory and stats management**.

### Additional Features

- Save and restore full player data, including:
  - `Inventory`, `EnderItems`, `SelectedItemSlot`
  - `XpLevel`, `XpTotal`, `XpP`
  - `FoodLevel`, `FoodSaturationLevel`, `FoodExhaustionLevel`
  - `Health`, `AbsorptionAmount`, `ActiveEffects`

### Additional Commands

| Command | Description |
|---------|-------------|
| `/inv_save` | Saves full player inventory and stats persistently. |
| `/inv_load` | Restores full player inventory and stats from backup. |

All Curios management commands from Script 1 are also included.

---

## Why These Exist

I couldn’t find anything reliable. Existing mods either didn’t work on 1.20.1 or caused crashes. These scripts are simple, working solutions. They are **open-source**, easy to read, and modifiable for your server.

---

## Installation

1. Place the desired script in your KubeJS `server_scripts` folder.  
2. Reload scripts or restart the server.  
3. Use the commands listed above for Curios or full player data management.

---

## License

MIT License – feel free to use, modify, and contribute.

---

**Enjoy reliable, crash-free Curios and player data management!**
