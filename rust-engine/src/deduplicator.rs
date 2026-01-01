// Deduplicator: High-performance duplicate detection for ARM
// Uses ahash for faster hashing on ARM architectures

use napi_derive::napi;
use ahash::AHashSet;
use parking_lot::RwLock;
use std::sync::Arc;
use crate::is_lightweight_mode;

/// High-performance deduplicator optimized for ARM
/// 
/// Note: The max_size is determined at construction based on the current
/// lightweight mode setting. The mode should be set via `set_lightweight_mode()`
/// before creating any Deduplicator instances to ensure consistent cache limits.
#[napi]
pub struct Deduplicator {
    seen_items: Arc<RwLock<AHashSet<String>>>,
    max_size: usize,
    stats: Arc<RwLock<DedupStats>>,
}

#[derive(Debug, Default)]
struct DedupStats {
    total_checked: u64,
    duplicates_found: u64,
    cache_clears: u64,
}

#[napi(object)]
pub struct DedupResult {
    pub is_duplicate: bool,
    pub total_checked: f64,
    pub duplicates_found: f64,
}

#[napi]
impl Deduplicator {
    #[napi(constructor)]
    pub fn new() -> Self {
        let lightweight = is_lightweight_mode();
        let max_size = if lightweight { 5000 } else { 20000 };
        
        Self {
            seen_items: Arc::new(RwLock::new(AHashSet::new())),
            max_size,
            stats: Arc::new(RwLock::new(DedupStats::default())),
        }
    }

    /// Check if item is duplicate and add to cache
    /// Returns true if duplicate
    #[napi]
    pub fn check_and_add(&self, key: String) -> bool {
        let mut seen = self.seen_items.write();
        let mut stats = self.stats.write();
        
        stats.total_checked += 1;

        // Check if already seen
        if seen.contains(&key) {
            stats.duplicates_found += 1;
            return true;
        }

        // Auto-cleanup in lightweight mode when cache is full
        if seen.len() >= self.max_size {
            if is_lightweight_mode() {
                // Keep only 25% of entries (75% memory reduction)
                let keep_size = self.max_size / 4;
                let keys_to_keep: Vec<String> = seen.iter().take(keep_size).cloned().collect();
                seen.clear();
                seen.extend(keys_to_keep);
                stats.cache_clears += 1;
            } else {
                // Clear 50% in normal mode
                let keep_size = self.max_size / 2;
                let keys_to_keep: Vec<String> = seen.iter().take(keep_size).cloned().collect();
                seen.clear();
                seen.extend(keys_to_keep);
                stats.cache_clears += 1;
            }
        }

        seen.insert(key);
        false
    }

    /// Batch check for duplicates (more efficient for ARM)
    #[napi]
    pub fn check_batch(&self, keys: Vec<String>) -> Vec<bool> {
        let mut seen = self.seen_items.write();
        let mut stats = self.stats.write();
        let mut results = Vec::with_capacity(keys.len());

        for key in keys {
            stats.total_checked += 1;
            let is_dup = seen.contains(&key);
            if is_dup {
                stats.duplicates_found += 1;
            } else {
                seen.insert(key);
            }
            results.push(is_dup);
        }

        results
    }

    #[napi]
    pub fn get_stats(&self) -> DedupResult {
        let stats = self.stats.read();
        DedupResult {
            is_duplicate: stats.duplicates_found > 0,
            total_checked: stats.total_checked as f64,
            duplicates_found: stats.duplicates_found as f64,
        }
    }

    #[napi]
    pub fn get_cache_size(&self) -> u32 {
        self.seen_items.read().len() as u32
    }

    #[napi]
    pub fn clear(&self) {
        self.seen_items.write().clear();
        let mut stats = self.stats.write();
        *stats = DedupStats::default();
    }

    /// Get memory savings percentage
    #[napi]
    pub fn get_memory_savings(&self) -> f64 {
        let current_size = self.seen_items.read().len();
        let max_size = self.max_size;
        
        if max_size == 0 {
            return 0.0;
        }
        
        let used_percentage = (current_size as f64 / max_size as f64) * 100.0;
        100.0 - used_percentage
    }
}

impl Default for Deduplicator {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_deduplicator() {
        let dedup = Deduplicator::new();
        
        assert!(!dedup.check_and_add("key1".to_string()));
        assert!(dedup.check_and_add("key1".to_string())); // Duplicate
        assert!(!dedup.check_and_add("key2".to_string()));
        
        assert_eq!(dedup.get_cache_size(), 2);
    }

    #[test]
    fn test_batch_check() {
        let dedup = Deduplicator::new();
        
        let keys = vec![
            "key1".to_string(),
            "key2".to_string(),
            "key1".to_string(), // Duplicate
        ];
        
        let results = dedup.check_batch(keys);
        assert_eq!(results, vec![false, false, true]);
    }
}
