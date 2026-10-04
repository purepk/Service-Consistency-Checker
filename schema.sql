CREATE DATABASE IF NOT EXISTS consistency_checker;
USE consistency_checker;

CREATE TABLE IF NOT EXISTS monitors (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  url VARCHAR(500) NOT NULL,
  expected_status SMALLINT DEFAULT 200,
  timeout_ms INT DEFAULT 10000,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  UNIQUE INDEX idx_url_deleted (url, deleted_at),
  INDEX idx_is_active (is_active)
);

CREATE TABLE IF NOT EXISTS check_runs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  started_at DATETIME NOT NULL,
  finished_at DATETIME NULL,
  total_count INT DEFAULT 0,
  up_count INT DEFAULT 0,
  down_count INT DEFAULT 0,
  duration_ms INT NULL,
  trigger_type ENUM('manual', 'schedule') NOT NULL DEFAULT 'manual',
  INDEX idx_started_at_desc (started_at DESC)
);

CREATE TABLE IF NOT EXISTS incidents (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  monitor_id INT UNSIGNED NOT NULL,
  started_at DATETIME NOT NULL,
  resolved_at DATETIME NULL,
  duration_seconds INT NULL,
  status ENUM('open', 'resolved') DEFAULT 'open',
  cause VARCHAR(255) NULL,
  fail_count INT DEFAULT 1,
  FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE,
  INDEX idx_monitor_status (monitor_id, status),
  INDEX idx_incidents_started_desc (started_at DESC)
);