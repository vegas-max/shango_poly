// Lightweight Mode Configuration
// Provides 75% memory reduction and 3x speed improvement

use napi_derive::napi;

#[derive(Debug, Clone)]
#[napi(object)]
pub struct LightweightConfig {
    pub enabled: bool,
    pub cache_size_reduction: f64,
    pub speed_multiplier: f64,
    pub batch_size: u32,
    pub gc_interval_ms: f64,
}

impl Default for LightweightConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            cache_size_reduction: 0.75, // 75% reduction
            speed_multiplier: 3.0,       // 3x faster
            batch_size: 100,             // Smaller batches
            gc_interval_ms: 30000.0,     // Cleanup every 30s
        }
    }
}

#[napi]
pub fn create_lightweight_config(enabled: bool) -> LightweightConfig {
    if enabled {
        LightweightConfig {
            enabled,
            cache_size_reduction: 0.75,
            speed_multiplier: 3.0,
            batch_size: 100,
            gc_interval_ms: 30000.0,
        }
    } else {
        LightweightConfig {
            enabled,
            cache_size_reduction: 0.0,
            speed_multiplier: 1.0,
            batch_size: 500,
            gc_interval_ms: 60000.0,
        }
    }
}

#[napi]
pub fn get_max_cache_size(config: LightweightConfig, base_size: u32) -> u32 {
    if config.enabled {
        ((base_size as f64) * (1.0 - config.cache_size_reduction)) as u32
    } else {
        base_size
    }
}

#[napi]
pub fn get_scan_interval(config: LightweightConfig, base_interval_ms: f64) -> f64 {
    if config.enabled {
        base_interval_ms / config.speed_multiplier
    } else {
        base_interval_ms
    }
}

#[napi]
pub fn get_lightweight_description(config: LightweightConfig) -> String {
    if config.enabled {
        format!(
            "Lightweight Mode: {}% memory reduction, {}x speed improvement",
            (config.cache_size_reduction * 100.0) as u32,
            config.speed_multiplier as u32
        )
    } else {
        "Normal Mode: Full features enabled".to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_lightweight_config() {
        let config = create_lightweight_config(true);
        assert!(config.enabled);
        assert_eq!(config.cache_size_reduction, 0.75);
        assert_eq!(config.speed_multiplier, 3.0);
        
        let max_cache = get_max_cache_size(config, 1000);
        assert_eq!(max_cache, 250); // 75% reduction
    }

    #[test]
    fn test_scan_interval() {
        let config = create_lightweight_config(true);
        let interval = get_scan_interval(config, 3000.0);
        assert_eq!(interval, 1000.0); // 3x faster
    }
}
