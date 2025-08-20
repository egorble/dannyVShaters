// Copyright (c) Zefchain Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use std::sync::Arc;

use async_graphql::{EmptySubscription, Object, Request, Response, Schema};
use linera_sdk::{linera_base_types::WithServiceAbi, views::View, Service, ServiceRuntime};
use player_name::{Operation, PlayerNameAbi};


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
            
        let schema = Schema::build(
            QueryRoot {
                player_name: self.state.player_name.get().clone(),
                coin_balance: *self.state.coin_balance.get(),
                health: *self.state.health.get(),
                mobs,
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
}

struct QueryRoot {
    player_name: String,
    coin_balance: u64,
    health: u64,
    mobs: Vec<Mob>,
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
}