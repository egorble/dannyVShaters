// Copyright (c) Zefchain Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use linera_sdk::views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext};
use serde::{Deserialize, Serialize};
use async_graphql::SimpleObject;

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
    pub player_name: RegisterView<String>,
    pub coin_balance: RegisterView<u64>,
    pub health: RegisterView<u64>,
    // Mob management
    pub mobs: MapView<String, Mob>, // mob_id -> Mob
    pub mob_counter: RegisterView<u64>, // Counter for generating unique mob IDs
}