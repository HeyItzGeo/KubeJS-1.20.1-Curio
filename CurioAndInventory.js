// Inventory Management Commands with Logging
ServerEvents.commandRegistry(event => {
    const { commands: Commands } = event;
    
    // Save command - saves player inventory and data
    event.register(Commands.literal('inv_save')
        .executes(ctx => {
            const player = ctx.source.player;
            const nbt = player.getNbt();
            
            // Create a new NBT compound to store our backup
            const backup = {};
            
            // Helper function to safely add NBT values
            function addIfExists(obj, key) {
                if (nbt[key] !== undefined) {
                    obj[key] = nbt[key];
                }
            }
            
            // Vanilla Minecraft data
            const vanillaKeys = [
                'Inventory', 'EnderItems', 'SelectedItemSlot',
                'XpLevel', 'XpTotal', 'XpP',
                'FoodLevel', 'FoodSaturationLevel', 'FoodExhaustionLevel',
                'Health', 'AbsorptionAmount', 'ActiveEffects'
            ];
            
            // Only add vanilla data
            for (let i = 0; i < vanillaKeys.length; i++) {
                addIfExists(backup, vanillaKeys[i]);
            }
            if (nbt.ForgeData) {
                backup.ForgeData = {};
                // Use IIFE to create a new scope
                (function() {
                    const forgeKeys = ['PlayerPersisted', 'PlayerPersisted.NBT'];
                    for (let i = 0; i < forgeKeys.length; i++) {
                        const path = forgeKeys[i].split('.');
                        let source = nbt.ForgeData;
                        let target = backup.ForgeData;
                        
                        for (let j = 0; j < path.length - 1; j++) {
                            if (source[path[j]] === undefined) break;
                            if (target[path[j]] === undefined) target[path[j]] = {};
                            source = source[path[j]];
                            target = target[path[j]];
                        }
                        
                        const lastKey = path[path.length - 1];
                        if (source[lastKey] !== undefined) {
                            target[lastKey] = source[lastKey];
                        }
                    }
                })();
            }
            
            player.persistentData.put("backup", backup);
            
            // Store XP data using player properties
            backup.XpLevel = player.xpLevel || 0;
            backup.XpTotal = player.totalExperience || 0;
            backup.XpP = player.experienceProgress || 0;
            
            console.log(`[Inventory] Saved inventory for player: ${player.username}`);
            console.log(`[Inventory] Saved ${Object.keys(backup).length} NBT entries`);
            console.log(`[Inventory] XP Data - Level: ${backup.XpLevel}, Total: ${backup.XpTotal}, Progress: ${backup.XpP.toFixed(2)}`);
            
            ctx.source.sendSuccess(`✅ Inventory saved! (Level ${backup.XpLevel} | ${backup.XpTotal} XP)`, false);
            return 1;
        })
    );
    
    // Load command - restores player inventory and data
    event.register(Commands.literal('inv_load')
        .executes(ctx => {
            const player = ctx.source.player;
            const backup = player.persistentData.getCompound("backup");
            
            if (!backup) {
                console.log(`[Inventory] No backup found for player: ${player.username}`);
                ctx.source.sendFailure('❌ No saved inventory found!');
                return 0;
            }
            
            try {
                // Use an IIFE to create a new scope
                (function() {
                    // Get a fresh copy of the player's NBT data
                    const currentNbt = player.getNbt() || {};
                    
                    // List of vanilla keys we want to restore (excluding XP which we handle separately)
                    const keysToRestore = [
                        'Inventory', 'EnderItems', 'SelectedItemSlot',
                        'Health', 'AbsorptionAmount', 'ActiveEffects'
                    ];
                    
                    // Create a new object and copy properties manually
                    const updatedNbt = {};
                    
                    // First, copy all existing player NBT data
                    for (const key in currentNbt) {
                        if (currentNbt.hasOwnProperty(key)) {
                            updatedNbt[key] = currentNbt[key];
                        }
                    }
                    
                    // Then update with our backup data
                    for (let i = 0; i < keysToRestore.length; i++) {
                        const key = keysToRestore[i];
                        if (backup[key] !== undefined) {
                            // Copy the key normally (all remaining keys are vanilla)
                            updatedNbt[key] = backup[key];
                        }
                    }
                    
                    // Log the NBT structure we're about to apply
                    console.log('[Inventory] NBT keys to apply:', Object.keys(updatedNbt));
                    
                    // Apply the updated NBT
                    player.setNbt(updatedNbt);
                    
                    // Verify the data was set and update the client
                    const verifyNbt = player.getNbt();
                    console.log('[Inventory] NBT keys after set:', verifyNbt ? Object.keys(verifyNbt) : 'null');
                    // Force update the player's inventory to make sure the client gets the update
                    player.inventory.setChanged();
                })();
                
                // Then restore XP data in the correct order
                if (backup.XpLevel !== undefined) {
                    // Set level first
                    player.xpLevel = backup.XpLevel;
                    
                    // Then set total experience (this will adjust the level if needed)
                    if (backup.XpTotal !== undefined) {
                        player.totalExperience = backup.XpTotal;
                    }
                    
                    // Finally, set progress (0.0 to 1.0)
                    if (backup.XpP !== undefined) {
                        player.experienceProgress = backup.XpP;
                    }
                    
                    // Force sync if available
                    if (player.syncXp) {
                        player.syncXp();
                    }
                }
                
                console.log(`[Inventory] Loaded inventory for player: ${player.username}`);
                console.log(`[Inventory] Restored ${Object.keys(backup).length} NBT entries`);
                console.log(`[Inventory] Restored XP - Level: ${backup.XpLevel}, Total: ${backup.XpTotal}, Progress: ${backup.XpP ? backup.XpP.toFixed(2) : 'N/A'}`);
                
                ctx.source.sendSuccess(`✅ Inventory loaded! (Level ${backup.XpLevel})`, false);
                return 1;
            } catch (error) {
                console.log(`[Inventory] Error loading inventory for ${player.username}:`, error);
                ctx.source.sendFailure('❌ Failed to load inventory!');
                return 0;
            }
        })
    );
    
});

// Curios Inventory Management Commands with Persistent Storage
ServerEvents.commandRegistry(event => {
    const { commands: Commands } = event;

    event.register(
        Commands.literal('print_curios')
            .executes(ctx => {
                const player = ctx.source.player;
                if (!player) {
                    ctx.source.sendFailure('❌ This command can only be run by a player.');
                    return 0;
                }

                // Get player's NBT data
                var nbt = player.getNbt();
                if (!nbt) {
                    ctx.source.sendFailure('❌ Failed to get player NBT data');
                    return 0;
                }

                // Get Curios inventory
                var curiosInv = null;
                try {
                    var forgeCaps = nbt.get('ForgeCaps');
                    
                    // Log raw ForgeCaps data
                    console.log('\n=== RAW FORGECAPS ===');
                    console.log(forgeCaps ? forgeCaps.toString() : 'No ForgeCaps found');
                    
                    if (forgeCaps) {
                        curiosInv = forgeCaps.get('curios:inventory');
                        
                        // Log raw Curios inventory data
                        console.log('\n=== RAW CURIOS INVENTORY ===');
                        console.log(curiosInv ? curiosInv.toString() : 'No Curios inventory found');
                    }
                } catch (e) {
                    console.log('Error getting Curios inventory: ' + e);
                }

                if (!curiosInv) {
                    ctx.source.sendFailure('❌ No Curios inventory found - check console for raw NBT data');
                    return 0;
                }

                // Get the Curios list
                var curiosList = curiosInv.get('Curios');
                if (!curiosList) {
                    ctx.source.sendFailure('❌ No Curios list found in inventory');
                    return 0;
                }

                ctx.source.sendSuccess('📦 Curios for player: ' + player.username, false);

                // Process each slot
                for (var i = 0; i < curiosList.size(); i++) {
                    try {
                        var slot = curiosList.getCompound(i);
                        if (!slot) continue;

                        // Get slot identifier
                        var slotId = 'unknown_' + i;
                        if (slot.get('Identifier')) {
                            slotId = slot.get('Identifier').getAsString();
                        }

                        // Get StacksHandler
                        var stacksHandler = slot.get('StacksHandler');
                        if (!stacksHandler) continue;

                        // Get Stacks
                        var stacks = stacksHandler.get('Stacks');
                        if (!stacks) continue;

                        // Get Items list
                        var itemsTag = stacks.get('Items');
                        if (!itemsTag || itemsTag.getId() !== 9) continue; // 9 = ListTag

                        // Process items in this slot
                        for (var j = 0; j < itemsTag.size(); j++) {
                            var itemTag = itemsTag.getCompound(j);
                            if (!itemTag) continue;

                            // Get basic item info
                            var itemId = itemTag.contains('id') ? itemTag.getString('id') : 'unknown';
                            var count = itemTag.contains('Count') ? itemTag.getInt('Count') : 1;
                            
                            // Get NBT tag if it exists
                            var tag = itemTag.get('tag');
                            
                            // Send basic info to chat
                            ctx.source.sendSuccess(`🔘 ${slotId.toUpperCase()}: ${itemId} x${count}`, false);
                            
                            // Log full NBT data to console
                            if (tag) {
                                console.log(`\n=== ${itemId} in ${slotId} ===`);
                                var tagString = tag.toString();
                                console.log(tagString);
                                
                                // Also log a more readable version if possible
                                try {
                                    var tagObj = {};
                                    var keys = tag.getAllKeys().toArray();
                                    for (var k = 0; k < keys.length; k++) {
                                        var key = keys[k];
                                        var value = tag.get(key);
                                        if (value) {
                                            tagObj[key] = value.toString();
                                        }
                                    }
                                    console.log('Parsed NBT:', JSON.stringify(tagObj, null, 2));
                                } catch (e) {
                                    console.log('Could not parse NBT tag:', e);
                                }
                            }
                        }
                    } catch (e) {
                        console.log(`Error processing slot ${i}:`, e);
                    }
                }

                ctx.source.sendSuccess('✅ Check console for detailed NBT data', false);
                return 1;
            })
    );
    
    // Curios backup/restore commands with persistent storage
    event.register(
        Commands.literal('curios')
            // --- BACKUP ---
            .then(Commands.literal('backup')
                .executes(ctx => {
                    var player = ctx.source.player;
                    if (!player) {
                        ctx.source.sendFailure('❌ Player not found');
                        return 0;
                    }

                    // Get player's NBT data
                    var nbt = player.getNbt();
                    if (!nbt) {
                        ctx.source.sendFailure('❌ Failed to get player NBT data');
                        return 0;
                    }

                    // Get Curios inventory
                    var forgeCaps = nbt.get('ForgeCaps');
                    if (!forgeCaps) {
                        ctx.source.sendFailure('❌ No ForgeCaps found');
                        return 0;
                    }

                    var curiosInv = forgeCaps.get('curios:inventory');
                    if (!curiosInv) {
                        ctx.source.sendFailure('❌ No Curios inventory found');
                        return 0;
                    }

                    // Create a backup copy
                    try {
                        var backup = curiosInv.copy();
                        
                        // Store in player's persistent data
                        player.persistentData.put('curios_backup', backup);
                        
                        // Count items in backup
                        var curiosList = backup.get('Curios');
                        var itemCount = 0;
                        if (curiosList) {
                            for (var i = 0; i < curiosList.size(); i++) {
                                var slot = curiosList.getCompound(i);
                                if (!slot) continue;
                                
                                var stacksHandler = slot.get('StacksHandler');
                                if (!stacksHandler) continue;
                                
                                var stacks = stacksHandler.get('Stacks');
                                if (!stacks) continue;
                                
                                var itemsTag = stacks.get('Items');
                                if (itemsTag && itemsTag.getId() === 9) {
                                    itemCount += itemsTag.size();
                                }
                            }
                        }
                        
                        console.log(`[Curios] Saved backup for ${player.username}: ${itemCount} items`);
                        ctx.source.sendSuccess(`✅ Curios backup saved! (${itemCount} items)`, false);
                        return 1;
                    } catch (e) {
                        console.log('Error creating backup:', e);
                        ctx.source.sendFailure('❌ Failed to create backup');
                        return 0;
                    }
                })
            )
            // --- RESTORE ---
            .then(Commands.literal('restore')
                .executes(ctx => {
                    var player = ctx.source.player;
                    if (!player) {
                        ctx.source.sendFailure('❌ Player not found');
                        return 0;
                    }

                    // Get backup from persistent data
                    var backup = player.persistentData.getCompound('curios_backup');
                    if (!backup || backup.isEmpty()) {
                        ctx.source.sendFailure('❌ No Curios backup found');
                        return 0;
                    }

                    // Get player's current NBT
                    var nbt = player.getNbt();
                    if (!nbt) {
                        ctx.source.sendFailure('❌ Failed to get player NBT data');
                        return 0;
                    }

                    try {
                        // Ensure ForgeCaps exists
                        if (!nbt.contains('ForgeCaps')) {
                            nbt.put('ForgeCaps', new NbtCompound());
                        }
                        
                        var forgeCaps = nbt.get('ForgeCaps');
                        
                        // Count items before restore for logging
                        var currentCurios = forgeCaps.get('curios:inventory');
                        var itemsBefore = 0;
                        if (currentCurios) {
                            var curiosList = currentCurios.get('Curios');
                            if (curiosList) {
                                for (var i = 0; i < curiosList.size(); i++) {
                                    var slot = curiosList.getCompound(i);
                                    if (!slot) continue;
                                    
                                    var stacksHandler = slot.get('StacksHandler');
                                    if (!stacksHandler) continue;
                                    
                                    var stacks = stacksHandler.get('Stacks');
                                    if (!stacks) continue;
                                    
                                    var itemsTag = stacks.get('Items');
                                    if (itemsTag && itemsTag.getId() === 9) {
                                        itemsBefore += itemsTag.size();
                                    }
                                }
                            }
                        }
                        
                        // Restore the backup
                        forgeCaps.put('curios:inventory', backup.copy());
                        
                        // Apply the modified NBT to the player
                        player.setNbt(nbt);
                        
                        // Count items in backup for logging
                        var itemsAfter = 0;
                        var backupCuriosList = backup.get('Curios');
                        if (backupCuriosList) {
                            for (var i = 0; i < backupCuriosList.size(); i++) {
                                var slot = backupCuriosList.getCompound(i);
                                if (!slot) continue;
                                
                                var stacksHandler = slot.get('StacksHandler');
                                if (!stacksHandler) continue;
                                
                                var stacks = stacksHandler.get('Stacks');
                                if (!stacks) continue;
                                
                                var itemsTag = stacks.get('Items');
                                if (itemsTag && itemsTag.getId() === 9) {
                                    itemsAfter += itemsTag.size();
                                }
                            }
                        }
                        
                        console.log(`[Curios] Restored backup for ${player.username}: ${itemsAfter} items`);
                        ctx.source.sendSuccess(`✅ Curios restored! (${itemsBefore} → ${itemsAfter} items)`, false);
                        return 1;
                    } catch (e) {
                        console.log('Error restoring backup:', e);
                        ctx.source.sendFailure('❌ Failed to restore Curios');
                        return 0;
                    }
                })
            )
            // --- CLEAR BACKUP ---
            .then(Commands.literal('clear_backup')
                .executes(ctx => {
                    var player = ctx.source.player;
                    if (!player) {
                        ctx.source.sendFailure('❌ Player not found');
                        return 0;
                    }
                    
                    if (player.persistentData.contains('curios_backup')) {
                        player.persistentData.remove('curios_backup');
                        ctx.source.sendSuccess('✅ Curios backup cleared', false);
                        console.log(`[Curios] Cleared backup for ${player.username}`);
                        return 1;
                    } else {
                        ctx.source.sendFailure('❌ No Curios backup found to clear');
                        return 0;
                    }
                })
            )
    );

    // Command to clear all equipped Curios items while keeping the slot structure
    event.register(
        Commands.literal('clear_curios')
            .executes(ctx => {
                const player = ctx.source.player;
                if (!player) {
                    ctx.source.sendFailure('❌ This command can only be run by a player.');
                    return 0;
                }

                // Get player's NBT data
                var nbt = player.getNbt();
                if (!nbt) {
                    ctx.source.sendFailure('❌ Failed to get player NBT data');
                    return 0;
                }

                // Get ForgeCaps
                var forgeCaps = nbt.get('ForgeCaps');
                if (!forgeCaps) {
                    ctx.source.sendFailure('❌ No ForgeCaps found');
                    return 0;
                }

                // Get Curios inventory
                var curiosInv = forgeCaps.get('curios:inventory');
                if (!curiosInv) {
                    ctx.source.sendFailure('❌ No Curios inventory found');
                    return 0;
                }

                // Get the Curios list
                var curiosList = curiosInv.get('Curios');
                if (!curiosList) {
                    ctx.source.sendFailure('❌ No Curios list found in inventory');
                    return 0;
                }

                let clearedSlots = 0;
                let clearedItems = 0;

                // Clear all items from all slots while preserving the slot structure
                for (var i = 0; i < curiosList.size(); i++) {
                    var slot = curiosList.getCompound(i);
                    if (!slot) continue;

                    var stacksHandler = slot.get('StacksHandler');
                    if (!stacksHandler) continue;

                    var stacks = stacksHandler.get('Stacks');
                    if (!stacks) continue;

                    // Get current items to count them
                    var itemsTag = stacks.get('Items');
                    if (itemsTag && itemsTag.getId() === 9) { // 9 = ListTag
                        clearedItems += itemsTag.size();
                    }

                    // Clear items from this slot
                    var emptyList = [];
                    stacks.put('Items', emptyList);

                    // Also clear cosmetics if they exist
                    if (stacksHandler.contains('Cosmetics')) {
                        var cosmetics = stacksHandler.get('Cosmetics');
                        if (cosmetics && cosmetics.contains('Items')) {
                            var cosmeticItems = cosmetics.get('Items');
                            if (cosmeticItems && cosmeticItems.getId() === 9) {
                                cosmetics.put('Items', []);
                            }
                        }
                    }

                    // Reset HasCosmetic flag
                    if (stacksHandler.contains('HasCosmetic')) {
                        stacksHandler.putByte('HasCosmetic', 0);
                    }

                    clearedSlots++;
                }

                // Save the modified NBT back to the player
                player.setNbt(nbt);
                
                // Send success message
                if (clearedItems > 0) {
                    ctx.source.sendSuccess(`✅ Cleared ${clearedItems} items from ${clearedSlots} Curios slots`, true);
                } else {
                    ctx.source.sendSuccess(`✅ Curios inventory already empty (${clearedSlots} slots)`, true);
                }
                return 1;
            })
    );
});
