// Copyright (c) Zefchain Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/*! ABI of the Player Name Application */

use async_graphql::{Request, Response};
use linera_sdk::linera_base_types::{ChainId, ContractAbi, ServiceAbi};
use serde::{Deserialize, Serialize};

pub struct PlayerNameAbi;

impl ContractAbi for PlayerNameAbi {
    type Operation = Operation;
    type Response = ();
}

impl ServiceAbi for PlayerNameAbi {
    type Query = Request;
    type QueryResponse = Response;
}

// Leaderboard structures
#[derive(Debug, Clone, Serialize, Deserialize, async_graphql::SimpleObject)]
pub struct ScoreEntry {
    pub player_name: String,
    pub score: u64,
    pub chain_id: ChainId,
    pub timestamp: u64,
}

// Application parameters for leaderboard configuration
#[derive(Debug, Clone, Deserialize, Serialize, Default)]
pub struct ApplicationParameters {
    pub leaderboard_chain_id: Option<ChainId>,
}

// Cross-chain leaderboard messages
#[derive(Debug, Deserialize, Serialize)]
pub enum LeaderboardMessage {
    SubmitScoreToLeaderboard {
        player_name: String,
        score: u64,
        player_chain_id: ChainId,
        timestamp: u64,
    },
}

#[derive(Debug, Serialize, Deserialize)]
pub enum Operation {
    // Existing game operations
    SetName(String),
    AddCoins(u64),
    SubtractCoins(u64),
    GetBalance,
    AddHealth(u64),
    SubtractHealth(u64),
    GetHealth,
    // Mob operations
    CreateMob { mob_id: String, mob_type: u8, max_health: u64 },
    DamageMob { mob_id: String, damage: u64 },
    GetMobHealth { mob_id: String },
    RemoveMob { mob_id: String },
    RemoveAllMobs,
    GetAllMobs,
    
    // New leaderboard operations
    SetupLeaderboard {
        leaderboard_chain_id: ChainId,
    },
    SubmitScore {
        score: u64,
    },
    ResetLeaderboard,
}
