// Copyright (c) Zefchain Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use player_name::{Operation, PlayerNameAbi};
use linera_sdk::{
    linera_base_types::WithContractAbi,
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
    type Message = ();
    type InstantiationArgument = String;
    type Parameters = ();
    type EventValue = ();

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = PlayerNameState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        PlayerNameContract { state, runtime }
    }

    async fn instantiate(&mut self, initial_name: String) {
        // Validate that the application parameters were configured correctly.
        self.runtime.application_parameters();

        self.state.player_name.set(initial_name);
        // Initialize coin balance to 0
        self.state.coin_balance.set(0);
        // Initialize health to 100
        self.state.health.set(100);
        // Initialize mob counter to 0
        self.state.mob_counter.set(0);
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
        }
    }

    async fn execute_message(&mut self, _message: ()) {
        panic!("Player Name application doesn't support any cross-chain messages");
    }

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}