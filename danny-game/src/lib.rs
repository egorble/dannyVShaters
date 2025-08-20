// Copyright (c) Zefchain Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/*! ABI of the Player Name Application */

use async_graphql::{Request, Response};
use linera_sdk::linera_base_types::{ContractAbi, ServiceAbi};
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

#[derive(Debug, Serialize, Deserialize)]
pub enum Operation {
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
}
