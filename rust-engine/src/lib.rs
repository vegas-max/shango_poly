#![deny(clippy::all)]

use napi_derive::napi;
use parking_lot::RwLock;
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};

mod turbo_scanner;
mod turbo_aggregator;
mod deduplicator;
mod lightweight_mode;

pub use turbo_scanner::TurboScanner;
pub use turbo_aggregator::TurboAggregator;
pub use deduplicator::Deduplicator;
pub use lightweight_mode::LightweightConfig;

// Global configuration for lightweight mode
static LIGHTWEIGHT_MODE: Lazy<RwLock<bool>> = Lazy::new(|| RwLock::new(false));

#[napi]
pub fn set_lightweight_mode(enabled: bool) {
    let mut mode = LIGHTWEIGHT_MODE.write();
    *mode = enabled;
}

#[napi]
pub fn is_lightweight_mode() -> bool {
    *LIGHTWEIGHT_MODE.read()
}

// Opportunity structure optimized for ARM with proper alignment
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct Opportunity {
    pub path: Vec<String>,
    pub dexes: Vec<String>,
    pub input_amount: String,
    pub output_amount: String,
    pub profit: String,
    pub profit_bps: i32,
    pub timestamp: i64,
}

// Price data structure with ARM-friendly alignment
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct PriceData {
    pub token_a: String,
    pub token_b: String,
    pub price: String,
    pub source: String,
    pub timestamp: i64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_lightweight_mode() {
        set_lightweight_mode(true);
        assert!(is_lightweight_mode());
        set_lightweight_mode(false);
        assert!(!is_lightweight_mode());
    }
}
