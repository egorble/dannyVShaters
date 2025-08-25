// Copyright (c) Zefchain Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use std::sync::Arc;

use async_graphql::{EmptySubscription, Object, Request, Response, Schema};
use linera_sdk::{linera_base_types::WithServiceAbi, views::View, Service, ServiceRuntime};
use player_name::{Operation, PlayerNameAbi, ScoreEntry};

use self::state::{PlayerNameState, Mob};

linera_sdk::service!(PlayerNameService);

pub struct PlayerNameService {
    state: PlayerNameState,
    runtime: Arc<ServiceRuntime<Self>>,
}

impl WithServiceAbi for PlayerNameService {
    type Abi = PlayerNameAbi;
}

impl Service for PlayerNameService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = PlayerNameState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        PlayerNameService {
            state,
            runtime: Arc::new(runtime),
        }
    }

    async fn handle_query(&self, request: Request) -> Response {
        let mut mobs = Vec::new();
        if let Ok(indices) = self.state.mobs.indices().await {
            for mob_id in indices {
                if let Ok(Some(mob)) = self.state.mobs.get(&mob_id).await {
                    mobs.push(mob);
                }
            }
        }
        
        // Get leaderboard data
        let global_leaderboard = self.state.global_leaderboard.get().clone();
        let my_scores = self.state.my_scores.get().clone();
        let my_best_score = *self.state.my_best_score.get();
        let is_leaderboard_chain = *self.state.is_leaderboard_chain.get();
        let leaderboard_chain_id = self.state.leaderboard_chain_id.get().clone();
        
        // Debug logging for service queries
        eprintln!("[SERVICE] Query received on chain: {:?}", self.runtime.chain_id());
        eprintln!("[SERVICE] Is leaderboard chain: {}", is_leaderboard_chain);
        eprintln!("[SERVICE] Global leaderboard size: {}", global_leaderboard.len());
            
        let schema = Schema::build(
            QueryRoot {
                player_name: self.state.player_name.get().clone(),
                coin_balance: *self.state.coin_balance.get(),
                health: *self.state.health.get(),
                mobs,
                // Leaderboard fields
                global_leaderboard,
                my_scores,
                my_best_score,
                is_leaderboard_chain,
                leaderboard_chain_id,
            },
            MutationRoot {
                runtime: self.runtime.clone(),
            },
            EmptySubscription,
        )
        .finish();
        schema.execute(request).await
    }
}

struct MutationRoot {
    runtime: Arc<ServiceRuntime<PlayerNameService>>,
}

#[Object]
impl MutationRoot {
    async fn set_name(&self, name: String) -> String {
        self.runtime.schedule_operation(&Operation::SetName(name.clone()));
        name
    }

    async fn add_coins(&self, amount: u64) -> String {
        self.runtime.schedule_operation(&Operation::AddCoins(amount));
        format!("Added {} coins", amount)
    }

    async fn subtract_coins(&self, amount: u64) -> String {
        self.runtime.schedule_operation(&Operation::SubtractCoins(amount));
        format!("Subtracted {} coins", amount)
    }

    async fn add_health(&self, amount: u64) -> String {
        self.runtime.schedule_operation(&Operation::AddHealth(amount));
        format!("Added {} health", amount)
    }

    async fn subtract_health(&self, amount: u64) -> String {
        self.runtime.schedule_operation(&Operation::SubtractHealth(amount));
        format!("Subtracted {} health", amount)
    }

    async fn create_mob(&self, mob_id: String, mob_type: u32, max_health: u64) -> String {
        self.runtime.schedule_operation(&Operation::CreateMob { mob_id: mob_id.clone(), mob_type: mob_type as u8, max_health });
        format!("Created mob {} with type {} and {} health", mob_id, mob_type, max_health)
    }

    async fn damage_mob(&self, mob_id: String, damage: u64) -> String {
        self.runtime.schedule_operation(&Operation::DamageMob { mob_id: mob_id.clone(), damage });
        format!("Damaged mob {} for {} damage", mob_id, damage)
    }

    async fn remove_mob(&self, mob_id: String) -> String {
        self.runtime.schedule_operation(&Operation::RemoveMob { mob_id: mob_id.clone() });
        format!("Removed mob {}", mob_id)
    }

    async fn remove_all_mobs(&self) -> String {
        self.runtime.schedule_operation(&Operation::RemoveAllMobs);
        "All mobs removed successfully".to_string()
    }
    
    // Leaderboard mutations
    async fn setup_leaderboard(&self, leaderboard_chain_id: String) -> String {
        // Parse chain ID string - you might want to improve this parsing
        let chain_id = match leaderboard_chain_id.parse() {
            Ok(id) => id,
            Err(_) => return format!("Invalid chain ID format: {}", leaderboard_chain_id),
        };
        
        self.runtime.schedule_operation(&Operation::SetupLeaderboard { leaderboard_chain_id: chain_id });
        format!("Setup leaderboard with chain ID: {}", leaderboard_chain_id)
    }
    
    async fn submit_score(&self, score: u64) -> String {
        self.runtime.schedule_operation(&Operation::SubmitScore { score });
        format!("Submitted score: {}", score)
    }
    
    async fn reset_leaderboard(&self) -> String {
        self.runtime.schedule_operation(&Operation::ResetLeaderboard);
        "Leaderboard reset successfully".to_string()
    }
}

struct QueryRoot {
    player_name: String,
    coin_balance: u64,
    health: u64,
    mobs: Vec<Mob>,
    // Leaderboard fields
    global_leaderboard: Vec<ScoreEntry>,
    my_scores: Vec<u64>,
    my_best_score: u64,
    is_leaderboard_chain: bool,
    leaderboard_chain_id: Option<linera_sdk::linera_base_types::ChainId>,
}

#[Object]
impl QueryRoot {
    async fn player_name(&self) -> &String {
        &self.player_name
    }

    async fn coin_balance(&self) -> u64 {
        self.coin_balance
    }

    async fn health(&self) -> u64 {
        self.health
    }

    async fn mobs(&self) -> &Vec<Mob> {
        &self.mobs
    }

    async fn mob_count(&self) -> usize {
        self.mobs.len()
    }
    
    // Leaderboard queries
    async fn global_leaderboard(&self) -> &Vec<ScoreEntry> {
        &self.global_leaderboard
    }
    
    async fn my_scores(&self) -> &Vec<u64> {
        &self.my_scores
    }
    
    async fn my_best_score(&self) -> u64 {
        self.my_best_score
    }
    
    async fn is_leaderboard_chain(&self) -> bool {
        self.is_leaderboard_chain
    }
    
    async fn leaderboard_chain_id(&self) -> Option<String> {
        self.leaderboard_chain_id.map(|id| id.to_string())
    }
    
    async fn my_rank(&self) -> Option<usize> {
        self.global_leaderboard
            .iter()
            .position(|entry| entry.player_name == self.player_name)
            .map(|pos| pos + 1)
    }
    
    async fn top_players(&self, limit: Option<i32>) -> Vec<ScoreEntry> {
        let limit = limit.unwrap_or(10).max(1).min(100) as usize;
        self.global_leaderboard
            .iter()
            .take(limit)
            .cloned()
            .collect()
    }
    
    async fn total_players(&self) -> usize {
        self.global_leaderboard.len()
    }
}