// Copyright (c) Zefchain Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use player_name::{ApplicationParameters, LeaderboardMessage, Operation, PlayerNameAbi, ScoreEntry};
use linera_sdk::{
    linera_base_types::{ChainId, WithContractAbi},
    views::{RootView, View},
    Contract, ContractRuntime,
};

use self::state::{PlayerNameState, Mob};
// Removed std::time import - using Linera's system_time instead

linera_sdk::contract!(PlayerNameContract);

pub struct PlayerNameContract {
    state: PlayerNameState,
    runtime: ContractRuntime<Self>,
}

impl WithContractAbi for PlayerNameContract {
    type Abi = PlayerNameAbi;
}

impl Contract for PlayerNameContract {
    type Message = LeaderboardMessage;
    type InstantiationArgument = String;
    type Parameters = ApplicationParameters;
    type EventValue = ();

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = PlayerNameState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        PlayerNameContract { state, runtime }
    }

    async fn instantiate(&mut self, initial_name: String) {
        // Validate that the application parameters were configured correctly.
        let parameters = self.runtime.application_parameters();
        
        // Validate player name is not empty
        if initial_name.trim().is_empty() {
            panic!("Player name cannot be empty during instantiation");
        }

        // Initialize game state
        self.state.player_name.set(initial_name);
        self.state.coin_balance.set(0);
        self.state.health.set(100);
        self.state.mob_counter.set(0);
        
        // Initialize leaderboard state
        self.state.global_leaderboard.set(Vec::new());
        self.state.leaderboard_chain_id.set(parameters.leaderboard_chain_id);
        
        // Check if this chain is the leaderboard chain
        let is_leaderboard = parameters.leaderboard_chain_id
            .map(|chain_id| chain_id == self.runtime.chain_id())
            .unwrap_or(false);
        self.state.is_leaderboard_chain.set(is_leaderboard);
        
        // Initialize player-specific leaderboard fields
        self.state.my_scores.set(Vec::new());
        self.state.my_best_score.set(0);
    }

    async fn execute_operation(&mut self, operation: Operation) -> () {
        match operation {
            Operation::SetName(new_name) => {
                self.state.player_name.set(new_name);
            }
            Operation::AddCoins(amount) => {
                let current_balance = *self.state.coin_balance.get();
                self.state.coin_balance.set(current_balance + amount);
            }
            Operation::SubtractCoins(amount) => {
                let current_balance = *self.state.coin_balance.get();
                if current_balance >= amount {
                    self.state.coin_balance.set(current_balance - amount);
                } else {
                    panic!("Insufficient balance: current {} < requested {}", current_balance, amount);
                }
            }
            Operation::GetBalance => {
                // This operation doesn't modify state, just allows querying balance
                // The actual balance can be queried through the service
            }
            Operation::AddHealth(amount) => {
                let current_health = *self.state.health.get();
                let new_health = std::cmp::min(current_health + amount, 100); // Cap at 100
                self.state.health.set(new_health);
            }
            Operation::SubtractHealth(amount) => {
                let current_health = *self.state.health.get();
                if current_health >= amount {
                    self.state.health.set(current_health - amount);
                } else {
                    self.state.health.set(0); // Health cannot go below 0
                }
            }
            Operation::GetHealth => {
                // This operation doesn't modify state, just allows querying health
                // The actual health can be queried through the service
            }
            Operation::CreateMob { mob_id, mob_type, max_health } => {
                // Generate unique mob ID if not provided or if already exists
                let final_mob_id = if mob_id.is_empty() || self.state.mobs.contains_key(&mob_id).await.unwrap_or(false) {
                    let counter = *self.state.mob_counter.get();
                    self.state.mob_counter.set(counter + 1);
                    format!("mob_{}", counter)
                } else {
                    mob_id
                };
                
                let timestamp = self.runtime.system_time().micros(); // Get timestamp in microseconds
                
                let mob = Mob {
                    mob_id: final_mob_id.clone(),
                    mob_type,
                    current_health: max_health,
                    max_health,
                    created_at: timestamp,
                };
                
                self.state.mobs.insert(&final_mob_id, mob).expect("Failed to create mob");
            }
            Operation::DamageMob { mob_id, damage } => {
                if let Ok(Some(mut mob)) = self.state.mobs.get(&mob_id).await {
                    if mob.current_health >= damage {
                        mob.current_health -= damage;
                    } else {
                        mob.current_health = 0;
                    }
                    self.state.mobs.insert(&mob_id, mob).expect("Failed to update mob");
                }
            }
            Operation::GetMobHealth { mob_id: _ } => {
                // This operation doesn't modify state, just allows querying mob health
                // The actual mob health can be queried through the service
            }
            Operation::RemoveMob { mob_id } => {
                self.state.mobs.remove(&mob_id).expect("Failed to remove mob");
            }
            Operation::RemoveAllMobs => {
                // Clear all mobs from the state
                self.state.mobs.clear();
            }
            Operation::GetAllMobs => {
                // This operation doesn't modify state, just allows querying all mobs
                // The actual mobs can be queried through the service
            }
            
            // Leaderboard operations
            Operation::SetupLeaderboard { leaderboard_chain_id } => {
                eprintln!("[SETUP] SetupLeaderboard called on chain {:?} with leaderboard_chain_id: {:?}", self.runtime.chain_id(), leaderboard_chain_id);
                
                // Only allow setup if not already configured
                if self.state.leaderboard_chain_id.get().is_some() {
                    eprintln!("[SETUP] Leaderboard already configured, panicking");
                    panic!("Leaderboard already configured. Leaderboard chain is already set.");
                }

                // Set the leaderboard chain ID
                self.state.leaderboard_chain_id.set(Some(leaderboard_chain_id));
                eprintln!("[SETUP] Set leaderboard_chain_id to: {:?}", leaderboard_chain_id);

                // If this chain is being designated as the leaderboard chain
                if self.runtime.chain_id() == leaderboard_chain_id {
                    eprintln!("[SETUP] This chain IS the leaderboard chain, setting flag to true");
                    self.state.is_leaderboard_chain.set(true);
                } else {
                    eprintln!("[SETUP] This chain is NOT the leaderboard chain, keeping flag false");
                }
                
                eprintln!("[SETUP] Final state - is_leaderboard_chain: {}, leaderboard_chain_id: {:?}", 
                    *self.state.is_leaderboard_chain.get(), 
                    self.state.leaderboard_chain_id.get());
            }

            Operation::SubmitScore { score } => {
                let player_name = self.state.player_name.get().clone();
                eprintln!("[SUBMIT] SubmitScore called: {} - {} points on chain {:?}", player_name, score, self.runtime.chain_id());
                eprintln!("[SUBMIT] Is leaderboard chain: {}", *self.state.is_leaderboard_chain.get());
                eprintln!("[SUBMIT] Configured leaderboard chain: {:?}", self.state.leaderboard_chain_id.get());
                
                let chain_id = self.runtime.chain_id();
                let timestamp = self.runtime.system_time().micros();

                // Update local score history
                let mut my_scores = self.state.my_scores.get().clone();
                my_scores.push(score);
                self.state.my_scores.set(my_scores);

                // Update personal best
                let current_best = *self.state.my_best_score.get();
                if score > current_best {
                    self.state.my_best_score.set(score);
                }

                // If this is the leaderboard chain, update global leaderboard
                if *self.state.is_leaderboard_chain.get() {
                    eprintln!("[SUBMIT] Processing score locally on leaderboard chain");
                    self.update_global_leaderboard(player_name, score, chain_id, timestamp).await;
                } else {
                    // Send message to leaderboard chain
                    if let Some(leaderboard_chain) = self.state.leaderboard_chain_id.get() {
                        eprintln!("[SUBMIT] Sending score message from chain {:?} to leaderboard chain {:?}", chain_id, leaderboard_chain);
                        let message = LeaderboardMessage::SubmitScoreToLeaderboard {
                            player_name: player_name.clone(),
                            score,
                            player_chain_id: chain_id,
                            timestamp,
                        };
                        
                        self.runtime.send_message(*leaderboard_chain, message);
                        eprintln!("[SUBMIT] Message sent successfully to {:?}", leaderboard_chain);
                    } else {
                        eprintln!("[SUBMIT] ERROR: No leaderboard chain configured, cannot send message");
                    }
                }
            }
            
            Operation::ResetLeaderboard => {
                eprintln!("[RESET] ResetLeaderboard called on chain {:?}", self.runtime.chain_id());
                eprintln!("[RESET] Is leaderboard chain: {}", *self.state.is_leaderboard_chain.get());
                
                // Only allow reset on the leaderboard chain
                if !*self.state.is_leaderboard_chain.get() {
                    eprintln!("[RESET] ERROR: Reset can only be performed on the leaderboard chain");
                    panic!("Reset operation can only be performed on the leaderboard chain");
                }
                
                eprintln!("[RESET] Clearing all leaderboard data...");
                
                // Clear the global leaderboard
                self.state.global_leaderboard.set(Vec::new());
                eprintln!("[RESET] Global leaderboard cleared");
                
                // Clear all player best scores
                self.state.player_best_scores.clear();
                eprintln!("[RESET] Player best scores cleared");
                
                eprintln!("[RESET] Leaderboard reset completed successfully");
            }
        }
    }

    async fn execute_message(&mut self, message: Self::Message) {
        eprintln!("[MESSAGE] Received message on chain {:?}", self.runtime.chain_id());
        eprintln!("[MESSAGE] Is leaderboard chain: {}", *self.state.is_leaderboard_chain.get());
        eprintln!("[MESSAGE] Configured leaderboard chain: {:?}", self.state.leaderboard_chain_id.get());
        
        // Check if message is bouncing
        let is_bouncing = self
            .runtime
            .message_is_bouncing()
            .expect("Message delivery status must be available when executing a message");

        if is_bouncing {
            eprintln!("[MESSAGE] Message is bouncing, returning");
            return;
        }

        match message {
            LeaderboardMessage::SubmitScoreToLeaderboard {
                player_name,
                score,
                player_chain_id,
                timestamp,
            } => {
                eprintln!("[MESSAGE] Processing SubmitScoreToLeaderboard: {} - {} points from {:?}", player_name, score, player_chain_id);
                
                // Only process on leaderboard chain
                if !*self.state.is_leaderboard_chain.get() {
                    eprintln!("[MESSAGE] This is NOT the leaderboard chain, ignoring message");
                    return;
                }
                
                eprintln!("[MESSAGE] This IS the leaderboard chain, processing score");
                self.update_global_leaderboard(player_name, score, player_chain_id, timestamp).await;
            }
        }
    }

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}

impl PlayerNameContract {
    async fn update_global_leaderboard(
        &mut self,
        player_name: String,
        score: u64,
        chain_id: ChainId,
        timestamp: u64,
    ) {
        eprintln!(
            "[LEADERBOARD] Starting update: player={}, score={}, chain={:?}", 
            player_name, score, chain_id
        );
        
        let new_entry = ScoreEntry {
            player_name: player_name.clone(),
            score,
            chain_id,
            timestamp,
        };

        // Check if this is a better score for this player
        let should_update = match self.state.player_best_scores.get(&player_name).await {
            Ok(Some(current_best)) => {
                eprintln!(
                    "[LEADERBOARD] Found existing best for {}: {} vs new {}", 
                    player_name, current_best.score, score
                );
                if score > current_best.score {
                    eprintln!("[LEADERBOARD] New score is better, updating player best");
                    // Better score - update player's best
                    self.state.player_best_scores.insert(&player_name, new_entry.clone())
                        .expect("Failed to update player best score");
                    eprintln!("[LEADERBOARD] Player best score updated successfully");
                    true
                } else {
                    eprintln!("[LEADERBOARD] New score {} not better than existing {}, skipping", score, current_best.score);
                    false
                }
            }
            Ok(None) => {
                eprintln!("[LEADERBOARD] First score for player {}, adding", player_name);
                // First score for this player - always add
                self.state.player_best_scores.insert(&player_name, new_entry.clone())
                    .expect("Failed to insert first player score");
                eprintln!("[LEADERBOARD] First player score inserted successfully");
                true
            }
            Err(_) => {
                eprintln!("[ERROR] Failed to get player best scores, treating as first score");
                // Try to insert anyway as this might be the first score
                self.state.player_best_scores.insert(&player_name, new_entry.clone())
                    .expect("Failed to insert player score on error fallback");
                true
            }
        };

        // Only rebuild global leaderboard if this was a new best score
        if should_update {
            eprintln!("[LEADERBOARD] Rebuilding global leaderboard from MapView data");
            self.rebuild_global_leaderboard().await;
        } else {
            eprintln!("[LEADERBOARD] Skipping global leaderboard update - score not better");
        }
    }

    /// Rebuild the global leaderboard from all player best scores
    async fn rebuild_global_leaderboard(&mut self) {
        // Collect all best scores
        let mut all_scores = Vec::new();

        // Get all player names who have scores
        let player_names = self
            .state
            .player_best_scores
            .indices()
            .await
            .expect("Failed to get player names");

        eprintln!("[LEADERBOARD] Found {} players with scores", player_names.len());

        for player_name in player_names {
            if let Ok(Some(entry)) = self.state.player_best_scores.get(&player_name).await {
                eprintln!("[LEADERBOARD] Added {} with score {} to rebuild list", player_name, entry.score);
                all_scores.push(entry);
            }
        }

        // Sort by score descending (highest first), then by timestamp ascending for ties
        all_scores.sort_by(|a, b| {
            b.score.cmp(&a.score).then(a.timestamp.cmp(&b.timestamp))
        });
        eprintln!("[LEADERBOARD] Sorted {} scores", all_scores.len());

        // Take top 100
        let top_100: Vec<ScoreEntry> = all_scores.into_iter().take(100).collect();
        eprintln!("[LEADERBOARD] Taking top {} scores for leaderboard", top_100.len());

        // Update the global leaderboard
        self.state.global_leaderboard.set(top_100.clone());
        eprintln!("[LEADERBOARD] Global leaderboard updated with {} entries", top_100.len());
        
        // Log final leaderboard state
        eprintln!("[LEADERBOARD] Final leaderboard state:");
        for (i, entry) in top_100.iter().take(10).enumerate() {
            eprintln!("[LEADERBOARD] #{}: {} - {} points (chain: {:?})", 
                i + 1, entry.player_name, entry.score, entry.chain_id);
        }
        
        eprintln!("[LEADERBOARD] Rebuild completed successfully");
    }
}