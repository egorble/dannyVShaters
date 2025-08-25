// Copyright (c) Zefchain Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use linera_sdk::views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext};
use linera_sdk::linera_base_types::ChainId;
use serde::{Deserialize, Serialize};
use async_graphql::SimpleObject;
use player_name::ScoreEntry;

/// Mob data structure
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct Mob {
    pub mob_id: String,
    pub mob_type: u8,
    pub current_health: u64,
    pub max_health: u64,
    pub created_at: u64, // timestamp
}

/// The application state.
#[derive(RootView, async_graphql::SimpleObject)]
#[view(context = "ViewStorageContext")]
pub struct PlayerNameState {
    // Existing game state
    pub player_name: RegisterView<String>,
    pub coin_balance: RegisterView<u64>,
    pub health: RegisterView<u64>,
    // Mob management
    pub mobs: MapView<String, Mob>, // mob_id -> Mob
    pub mob_counter: RegisterView<u64>, // Counter for generating unique mob IDs
    
    // Leaderboard state
    pub global_leaderboard: RegisterView<Vec<ScoreEntry>>, // Top scores globally
    pub player_best_scores: MapView<String, ScoreEntry>, // player_name -> best score
    pub is_leaderboard_chain: RegisterView<bool>, // Flag to identify if this is the leaderboard chain
    pub leaderboard_chain_id: RegisterView<Option<ChainId>>, // Store the leaderboard chain ID
    
    // Player-specific leaderboard fields
    pub my_scores: RegisterView<Vec<u64>>, // Personal score history
    pub my_best_score: RegisterView<u64>, // Personal best score
}