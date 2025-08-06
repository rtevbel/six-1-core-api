--
-- Database: `six1_core_api`
--
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS `users` (
    `user_id`        BIGINT UNSIGNED AUTO_INCREMENT,
    `email`          VARCHAR(255) NOT NULL UNIQUE,
    `username`       VARCHAR(100) NOT NULL UNIQUE,
    `first_name`     VARCHAR(100),
    `last_name`      VARCHAR(100),
    `password`       VARCHAR(255) NOT NULL,
    `display_name`   varchar(250) NOT NULL DEFAULT '',
    `dashboard_url`  varchar(100) NOT NULL DEFAULT '',
    `activation_key` varchar(255) NOT NULL DEFAULT '',
    `status`         int(11) NOT NULL DEFAULT 0,
    `last_login_at`  DATETIME NULL COMMENT 'Latest successful login',
    `created_at`     DATETIME  DEFAULT current_timestamp(),
    `updated_at`     TIMESTAMP DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



CREATE TABLE IF NOT EXISTS `user_meta` (
    `user_meta_id` BIGINT UNSIGNED AUTO_INCREMENT,
    `user_id`      BIGINT UNSIGNED NOT NULL,
    `meta_key`     VARCHAR(255)  NOT NULL,
    `meta_value`   TEXT,
    `created_at`   DATETIME DEFAULT current_timestamp(),
    PRIMARY KEY (`user_meta_id`),
    KEY `user_meta_user_id` (`user_id`),
    CONSTRAINT `fk_user_meta_user_id`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_user_meta_key` (`user_id`, `meta_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS  `system_statuses`(
    `status_id` TINYINT UNSIGNED AUTO_INCREMENT,
    `name` VARCHAR(20) NOT NULL UNIQUE  COMMENT 'Human-readable status name',
    `module_name` VARCHAR(255) NOT NULL,
    `module_identifier` VARCHAR(255) NOT NULL,
    PRIMARY KEY (`status_id`)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE IF NOT EXISTS  `system_languages`(
    `language_id` TINYINT UNSIGNED AUTO_INCREMENT,
    `name` VARCHAR(20) NOT NULL UNIQUE  COMMENT 'Human-readable language name like Enlish,Italian etc..',
    `lang_code` VARCHAR(20) NOT NULL UNIQUE  COMMENT 'langugae code like en',
    `is_active` TINYINT(1) UNSIGNED DEFAULT 1,
    PRIMARY KEY (`language_id`),
    KEY `system_languages_lang_code` (`lang_code`)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `tenant_types` (
    `tenant_type_id` TINYINT UNSIGNED AUTO_INCREMENT,
    `name`           VARCHAR(20) NOT NULL UNIQUE COMMENT 'Human-readable tenant name like company, freelancer',
    `description`    TEXT COMMENT 'Human-readable tenant name like company, freelancer',
    `status_id`      TINYINT UNSIGNED NOT NULL COMMENT 'Tenant Types status',
    `created_at`         DATETIME NOT NULL DEFAULT current_timestamp(),
    `updated_at`         TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`tenant_type_id`),
    KEY `tenant_types_status_id` (`status_id`),
    CONSTRAINT `fk_tenant_types_status_id`     
       FOREIGN KEY (`status_id`)  REFERENCES `system_statuses`(`status_id`)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `tenants` (
    `tenant_id`          BIGINT UNSIGNED AUTO_INCREMENT,
    `name`               VARCHAR(255) NOT NULL COMMENT 'Example: Company, Freelancer, or Middleman',
    `tenant_type_id`     TINYINT UNSIGNED NOT NULL COMMENT 'company, freelancer, middleman etc',
    `tenant_indentifier` VARCHAR(255) NOT NULL UNIQUE COMMENT 'Unique identifier for tenant',
    `user_id`            BIGINT UNSIGNED NOT NULL COMMENT 'Owner of this tenant',
    `status_id`          TINYINT UNSIGNED NOT NULL COMMENT 'Tenant status',
    `created_at`         DATETIME NOT NULL DEFAULT current_timestamp(),
    `updated_at`         TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`tenant_id`),
    KEY `tenants_user_id`       (`user_id`),
    KEY `tenants_tenant_type_id` (`tenant_type_id`),
    KEY `tenants_status_id` (`status_id`),
    CONSTRAINT `fk_tenants_user_id`
        FOREIGN KEY (`user_id`)        REFERENCES `users`        (`user_id`)             ON DELETE CASCADE,
    CONSTRAINT `fk_tenants_tenant_type_id`
        FOREIGN KEY (`tenant_type_id`) REFERENCES `tenant_types` (`tenant_type_id`),
    CONSTRAINT `fk_tenants_status_id`     
       FOREIGN KEY (`status_id`)  REFERENCES `system_statuses`(`status_id`)  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE `tenant_meta` (
    `tenant_meta_id` BIGINT UNSIGNED AUTO_INCREMENT,
    `tenant_id` BIGINT UNSIGNED NOT NULL COMMENT 'Linked tenant',
    `meta_key` VARCHAR(255) NOT NULL COMMENT 'Key for the metadata',
    `meta_value` TEXT COMMENT 'Value for the metadata',
	  `created_at` DATETIME NOT NULL DEFAULT current_timestamp(),
    `updated_at` TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`tenant_meta_id`),
    FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`tenant_id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_meta` (`tenant_id`, `meta_key`) COMMENT "Prevent tenant's duplicate keys"
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE IF NOT EXISTS `tenant_working_hours` (
    `tenant_working_hour_id` BIGINT UNSIGNED AUTO_INCREMENT,
    `tenant_id` BIGINT UNSIGNED NOT NULL COMMENT 'Linked tenant',
    `day_of_week` ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') NOT NULL,
    `start_time` TIME NOT NULL COMMENT 'Start of working hours',
    `end_time` TIME NOT NULL COMMENT 'End of working hours',
    `created_by` BIGINT UNSIGNED NOT NULL,
    `updated_by` BIGINT UNSIGNED DEFAULT 0,
    PRIMARY KEY (`tenant_working_hour_id`),
    CONSTRAINT `fk_tenant_working_hours_tenant_id`
        FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE,
    CONSTRAINT `fk_tenant_working_hours_created_by`
        FOREIGN KEY (`created_by`) REFERENCES `tenant_users` (`tenant_user_id`),
    CONSTRAINT `fk_tenant_working_hours_updated_by`
        FOREIGN KEY (`updated_by`) REFERENCES `tenant_users` (`tenant_user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE IF NOT EXISTS `tenant_off_days` (
    `tenant_off_day_id` BIGINT UNSIGNED AUTO_INCREMENT,
    `tenant_id` BIGINT UNSIGNED NOT NULL COMMENT 'Linked tenant',
    `off_date` DATE NOT NULL COMMENT 'Date of the off day',
    `description` VARCHAR(255) COMMENT 'Reason for the off day (e.g., holiday)',
    `created_by` BIGINT UNSIGNED NOT NULL,
    `updated_by` BIGINT UNSIGNED DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT current_timestamp(),
    `updated_at` TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`tenant_off_day_id`),
    CONSTRAINT `fk_tenant_off_days_tenant_id`
        FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE IF NOT EXISTS `tenant_contact_info` (
    `tenant_contact_id` BIGINT UNSIGNED AUTO_INCREMENT,
    `tenant_id`         BIGINT UNSIGNED NOT NULL COMMENT 'Linked tenant',
    `email`             VARCHAR(255) NOT NULL COMMENT 'Primary email',
    `phone`             VARCHAR(20) COMMENT 'Primary phone number',
    `address`           TEXT COMMENT 'Physical address',
    `city`              VARCHAR(100) COMMENT 'City',
    `state`             VARCHAR(100) COMMENT 'State',
    `country`           VARCHAR(100) COMMENT 'Country',
    `postal_code`       VARCHAR(20) COMMENT 'Postal code',
    `created_by`        BIGINT UNSIGNED NOT NULL,
    `updated_by`        BIGINT UNSIGNED DEFAULT 0,
    `created_at`        DATETIME NOT NULL DEFAULT current_timestamp(),
    `updated_at`        TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`tenant_contact_id`),
    KEY `tenant_contact_info_tenant_id` (`tenant_id`),
    CONSTRAINT `fk_tenant_contact_info_tenant_id`
        FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `tenant_billing_info` (
    `billing_id`      BIGINT UNSIGNED AUTO_INCREMENT,
    `tenant_id`       BIGINT UNSIGNED NOT NULL COMMENT 'Linked tenant',
    `address` TEXT COMMENT 'Billing address',
    `tax_id`          VARCHAR(50) COMMENT 'Tax ID',
    `payment_terms`   VARCHAR(255) COMMENT 'Payment terms',
    `email`   VARCHAR(255) NOT NULL COMMENT 'Primary email',
    `phone`           VARCHAR(20) COMMENT 'Primary phone number',
    `city`            VARCHAR(100) COMMENT 'City',
    `state`           VARCHAR(100) COMMENT 'State',
    `country`         VARCHAR(100) COMMENT 'Country',
    `postal_code`     VARCHAR(20) COMMENT 'Postal code',
    `currency`        VARCHAR(10) DEFAULT 'USD' COMMENT 'Currency',
    `created_by`      BIGINT UNSIGNED NOT NULL,
    `updated_by`      BIGINT UNSIGNED DEFAULT 0,
    `created_at`      DATETIME NOT NULL DEFAULT current_timestamp(),
    `updated_at`      TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`billing_id`),
    KEY `tenant_billing_info_tenant_id` (`tenant_id`),
    CONSTRAINT `fk_tenant_billing_info_tenant_id`
        FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE IF NOT EXISTS `tenant_subscriptions` (
    `subscription_id` BIGINT UNSIGNED AUTO_INCREMENT,
    `tenant_id`       BIGINT UNSIGNED NOT NULL COMMENT 'Linked tenant',
    `plan`            ENUM('free', 'basic', 'premium') NOT NULL DEFAULT 'free' COMMENT 'Subscription plan',
    `start_date`      DATE NOT NULL COMMENT 'Subscription start date',
    `end_date`        DATE COMMENT 'Subscription end date',
    `is_active`       TINYINT(1) UNSIGNED DEFAULT 1 COMMENT 'Is active',
    `created_at`      DATETIME NOT NULL DEFAULT current_timestamp(),
    `updated_at`      TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`subscription_id`),
    KEY `tenant_subscriptions_tenant_id` (`tenant_id`),
    CONSTRAINT `fk_tenant_subscriptions_tenant_id`
        FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `tenant_configurations` (
    `tenant_config_id`        BIGINT UNSIGNED AUTO_INCREMENT,
    `tenant_id`               BIGINT UNSIGNED NOT NULL COMMENT 'Linked tenant',
    `timezone`                VARCHAR(50)  DEFAULT 'UTC'  COMMENT 'Timezone',
    `language_id`             TINYINT UNSIGNED NOT NULL DEFAULT 1,
    `default_currency`        VARCHAR(10)  DEFAULT 'USD'  COMMENT 'Default currency',
    `week_start_day`          VARCHAR(10)  DEFAULT 'Monday' COMMENT 'Week start day e.g Monday or Sunday',
    `date_format`             VARCHAR(20)  DEFAULT 'YYYY-MM-DD' COMMENT 'Date format',
    `time_format`             VARCHAR(20)  DEFAULT '24h'  COMMENT 'Time format (12h,24h)',
    `default_task_status`     VARCHAR(50)  DEFAULT 'To Do' COMMENT 'Default task status',
    `notification_preferences` VARCHAR(255) DEFAULT 'email' COMMENT 'e.g. email, sms, push',
    `branding_logo`           VARCHAR(255) COMMENT 'URL to branding logo',
    `two_factor_auth_enabled` TINYINT(1) UNSIGNED DEFAULT 0 COMMENT 'Is 2FA enabled?',
    `created_by`              BIGINT UNSIGNED NOT NULL,
    `updated_by`              BIGINT UNSIGNED DEFAULT 0,
    `created_at`              DATETIME NOT NULL DEFAULT current_timestamp(),
    `updated_at`              TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`tenant_config_id`),
    KEY `tenant_configurations_tenant_id`  (`tenant_id`),
    KEY `tenant_configurations_created_by` (`created_by`),
    KEY `tenant_configurations_updated_by` (`updated_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



CREATE TABLE IF NOT EXISTS `tenant_users` (
    `tenant_user_id` BIGINT UNSIGNED AUTO_INCREMENT,
    `tenant_id`      BIGINT UNSIGNED NOT NULL,
    `user_id`        BIGINT UNSIGNED NOT NULL,
    `status_id`      TINYINT UNSIGNED NOT NULL DEFAULT 1,
    `created_by`     BIGINT UNSIGNED DEFAULT NULL,
    `updated_by`     BIGINT UNSIGNED DEFAULT 0,
    `created_at`     DATETIME NOT NULL DEFAULT current_timestamp(),
    `updated_at`     TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`tenant_user_id`),
    KEY `tenant_users_created_by` (`created_by`),
    KEY `tenant_users_updated_by` (`updated_by`),
    FOREIGN KEY (`tenant_id`)  REFERENCES `tenants`      (`tenant_id`)   ON DELETE CASCADE,
    FOREIGN KEY (`user_id`)    REFERENCES `users`        (`user_id`)     ON DELETE CASCADE,
    FOREIGN KEY (`status_id`)  REFERENCES `system_statuses`(`status_id`),
    FOREIGN KEY (`created_by`) REFERENCES `tenant_users` (`tenant_user_id`),
    FOREIGN KEY (`updated_by`) REFERENCES `tenant_users` (`tenant_user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



CREATE TABLE IF NOT EXISTS `tenant_user_invitations` (
    `invitation_id` BIGINT UNSIGNED AUTO_INCREMENT,
    `tenant_id`     BIGINT UNSIGNED NOT NULL COMMENT 'Linked tenant',
    `user_id`       BIGINT UNSIGNED NOT NULL COMMENT 'Linked user',
    `email`         VARCHAR(255) NOT NULL COMMENT 'Email of the tenant user',
    `token`         VARCHAR(255) NOT NULL COMMENT 'Invitation token',
    `role_id`       INT UNSIGNED NOT NULL COMMENT 'Role of the tenant user',
    `status`        ENUM('pending', 'accepted', 'declined') DEFAULT 'pending' COMMENT 'Status of the invitation',
    `invited_by`    BIGINT UNSIGNED NOT NULL COMMENT 'User who sent the invitation',
    `invited_at`    DATETIME DEFAULT current_timestamp() COMMENT 'When the invitation was sent',
    `expires_at`    DATETIME COMMENT 'When the invitation expires',
    PRIMARY KEY (`invitation_id`),
    FOREIGN KEY (`user_id`)    REFERENCES `users`        (`user_id`)     ON DELETE CASCADE,
    FOREIGN KEY (`tenant_id`)  REFERENCES `tenants`      (`tenant_id`)       ON DELETE CASCADE,
    FOREIGN KEY (`invited_by`) REFERENCES `tenant_users` (`tenant_user_id`)  ON DELETE CASCADE,
    FOREIGN KEY (`role_id`)    REFERENCES `roles`        (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE IF NOT EXISTS `tenant_user_configurations` (
    `tenant_user_config_id`  BIGINT UNSIGNED AUTO_INCREMENT,
    `tenant_user_id`         BIGINT UNSIGNED NOT NULL COMMENT 'Linked tenant user',
    `timezone`               VARCHAR(50) DEFAULT 'UTC' COMMENT 'Timezone',
    `language_id`            TINYINT UNSIGNED NOT NULL DEFAULT 1,
    `default_currency`       VARCHAR(10) DEFAULT 'USD' COMMENT 'Default currency',
    `week_start_day`         VARCHAR(10) DEFAULT 'Monday' COMMENT 'Week start day e.g Monday or Sunday',
    `date_format`            VARCHAR(20) DEFAULT 'YYYY-MM-DD' COMMENT 'Date format',
    `time_format`            VARCHAR(20) DEFAULT '24h' COMMENT 'Time format (12h,24h)',
    `notification_preferences` VARCHAR(255) DEFAULT 'email' COMMENT 'e.g. email, sms, push',
    `created_by`             BIGINT UNSIGNED NOT NULL,
    `updated_by`             BIGINT UNSIGNED DEFAULT 0,
    `created_at`             DATETIME NOT NULL DEFAULT current_timestamp(),
    `updated_at`             TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`tenant_user_config_id`),
    KEY `tenant_configurations_language_id` (`language_id`),
    KEY `tenant_configurations_created_by` (`created_by`),
    KEY `tenant_configurations_updated_by` (`updated_by`),
    FOREIGN KEY (`tenant_user_id`) REFERENCES `tenant_users` (`tenant_user_id`) ON DELETE CASCADE,
    FOREIGN KEY (`created_by`)     REFERENCES `tenant_users` (`tenant_user_id`),
    FOREIGN KEY (`updated_by`)     REFERENCES `tenant_users` (`tenant_user_id`) ON DELETE SET NULL,
    FOREIGN KEY (`language_id`)    REFERENCES `system_languages` (`language_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE IF NOT EXISTS `tenant_user_working_hours` (
    `tenant_user_working_hour_id` BIGINT UNSIGNED AUTO_INCREMENT,
    `tenant_user_id`              BIGINT UNSIGNED NOT NULL COMMENT 'Linked tenant user',
    `day_of_week`                 ENUM('monday','tuesday','wednesday','thursday','friday','saturday','sunday') NOT NULL,
    `start_time`                  TIME NOT NULL COMMENT 'Start of working hours',
    `end_time`                    TIME NOT NULL COMMENT 'End of working hours',
    `created_by`                  BIGINT UNSIGNED NOT NULL,
    `updated_by`                  BIGINT UNSIGNED DEFAULT 0,
    PRIMARY KEY (`tenant_user_working_hour_id`),
    FOREIGN KEY (`tenant_user_id`) REFERENCES `tenant_users` (`tenant_user_id`) ON DELETE CASCADE,
    FOREIGN KEY (`created_by`)     REFERENCES `tenant_users` (`tenant_user_id`),
    FOREIGN KEY (`updated_by`)     REFERENCES `tenant_users` (`tenant_user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE IF NOT EXISTS `tenant_user_off_days` (
    `tenant_user_off_day_id` BIGINT UNSIGNED AUTO_INCREMENT,
    `tenant_user_id`         BIGINT UNSIGNED NOT NULL COMMENT 'Linked tenant',
    `off_date`               DATE NOT NULL COMMENT 'Date of the off day',
    `description`            VARCHAR(255) COMMENT 'Reason for the off day (e.g., holiday)',
    `created_by`             BIGINT UNSIGNED NOT NULL,
    `updated_by`             BIGINT UNSIGNED DEFAULT 0,
    PRIMARY KEY (`tenant_user_off_day_id`),
    FOREIGN KEY (`tenant_user_id`) REFERENCES `tenant_users` (`tenant_user_id`) ON DELETE CASCADE,
    FOREIGN KEY (`created_by`)     REFERENCES `tenant_users` (`tenant_user_id`),
    FOREIGN KEY (`updated_by`)     REFERENCES `tenant_users` (`tenant_user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE IF NOT EXISTS `tenant_user_meta` (
    `tenant_user_meta_id` BIGINT UNSIGNED AUTO_INCREMENT,
    `tenant_user_id`      BIGINT UNSIGNED NOT NULL COMMENT 'Linked tenant user',
    `meta_key`            VARCHAR(255) NOT NULL COMMENT 'Key for the metadata',
    `meta_value`          TEXT COMMENT 'Value for the metadata',
    `created_at`          DATETIME NOT NULL DEFAULT current_timestamp(),
    `updated_at`          TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`tenant_user_meta_id`),
    KEY `tenant_user_meta_tenant_user_id` (`tenant_user_id`),
    FOREIGN KEY (`tenant_user_id`) REFERENCES `tenant_users` (`tenant_user_id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_meta` (`tenant_user_id`, `meta_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



--
-- Table structure for application roles
--
CREATE TABLE IF NOT EXISTS `roles` (
    `role_id`            INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `status_id`          TINYINT UNSIGNED DEFAULT 1 COMMENT '1,2',
    `tenant_id`          BIGINT UNSIGNED DEFAULT 0 COMMENT 'Linked tenant',
    `is_tenant_role`     TINYINT(1) UNSIGNED DEFAULT 0,
    `is_tenant_team_role` TINYINT(1) UNSIGNED DEFAULT 0,
    `is_customer_role`   TINYINT(1) UNSIGNED DEFAULT 0,
    `created_at`         DATETIME NOT NULL DEFAULT current_timestamp(),
    `updated_at`         TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`role_id`),
    KEY `roles_status_id`          (`status_id`),
    KEY `roles_is_tenant_role`     (`is_tenant_role`),
    KEY `roles_is_tenant_team_role` (`is_tenant_team_role`),
    FOREIGN KEY (`status_id`) REFERENCES `system_statuses` (`status_id`),
    FOREIGN KEY (`tenant_id`)  REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



--
-- Table structure for role descriptions
--

CREATE TABLE IF NOT EXISTS `role_descriptions` (
    `role_description_id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `role_id`             INT(11) UNSIGNED NOT NULL,
    `language_id`         TINYINT UNSIGNED NOT NULL DEFAULT 1,
    `name`                VARCHAR(50) NOT NULL UNIQUE,
    `description`         TEXT DEFAULT NULL,
    `created_at`          DATETIME NOT NULL DEFAULT current_timestamp(),
    `updated_at`          TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`role_description_id`),
    KEY `role_descriptions_role_id`    (`role_id`),
    KEY `role_descriptions_language_id` (`language_id`),
    FOREIGN KEY (`role_id`)    REFERENCES `roles` (`role_id`) ON DELETE CASCADE,
    FOREIGN KEY (`language_id`) REFERENCES `system_languages` (`language_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE IF NOT EXISTS `permissions` (
    `permission_id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `status_id`     TINYINT UNSIGNED NOT NULL DEFAULT 1,
    `created_by`    BIGINT UNSIGNED NOT NULL DEFAULT 0,
    `updated_by`    BIGINT UNSIGNED DEFAULT 0,
    `created_at`    DATETIME NOT NULL DEFAULT current_timestamp(),
    `updated_at`    TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`permission_id`),
    KEY `permissions_status_id`   (`status_id`),
    KEY `permissions_created_by`  (`created_by`),
    KEY `permissions_updated_by`  (`updated_by`),
    FOREIGN KEY (`status_id`)  REFERENCES `system_statuses` (`status_id`),
    FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`),
    FOREIGN KEY (`updated_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `permission_descriptions` (
    `permission_description_id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `permission_id`             INT(11) UNSIGNED NOT NULL,
    `language_id`               TINYINT UNSIGNED NOT NULL DEFAULT 1,
    `name`                      VARCHAR(100) NOT NULL UNIQUE,
    `description`               TEXT DEFAULT NULL,
    `permission_group`          VARCHAR(100) NULL,
    `created_at`                DATETIME NOT NULL DEFAULT current_timestamp(),
    `updated_at`                TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`permission_description_id`),
    KEY `permission_descriptions_permission_id` (`permission_id`),
    KEY `permission_descriptions_language_id`   (`language_id`),
    FOREIGN KEY (`permission_id`) REFERENCES `permissions`      (`permission_id`) ON DELETE CASCADE,
    FOREIGN KEY (`language_id`)  REFERENCES `system_languages` (`language_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE IF NOT EXISTS `role_permissions` (
    `role_permission_id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `role_id`            INT(11) UNSIGNED NOT NULL,
    `permission_id`      INT(11) UNSIGNED NOT NULL,
    `created_at`         DATETIME NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`role_permission_id`),
    UNIQUE KEY `unique_role_permission` (`role_id`, `permission_id`) COMMENT 'Prevents duplicate entries',
    KEY `role_permissions_role_id`        (`role_id`),
    KEY `role_permissions_permission_id`  (`permission_id`),
    FOREIGN KEY (`role_id`)       REFERENCES `roles`       (`role_id`),
    FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



CREATE TABLE IF NOT EXISTS `user_roles` (
    `user_role_id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id`      BIGINT UNSIGNED NOT NULL,
    `role_id`      INT(11) UNSIGNED NOT NULL,
    `created_by`   BIGINT UNSIGNED NOT NULL COMMENT 'WordPress User ID',
    `created_at`   DATETIME NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`user_role_id`),
    UNIQUE KEY `unique_user_id_role_id` (`user_id`, `role_id`) COMMENT 'Prevents duplicate entries',
    KEY `user_roles_user_id` (`user_id`),
    KEY `user_roles_role_id` (`role_id`),
    FOREIGN KEY (`role_id`)   REFERENCES `roles` (`role_id`),
    FOREIGN KEY (`user_id`)   REFERENCES `users` (`user_id`) ON DELETE CASCADE,
    FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;




CREATE TABLE IF NOT EXISTS `tenant_user_roles` (
    `tenant_user_role_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tenant_user_id`      BIGINT UNSIGNED NOT NULL,
    `role_id`             INT(11) UNSIGNED NOT NULL,
    `created_by`          BIGINT UNSIGNED NOT NULL COMMENT 'Tenant User ID who assigned role',
    `created_at`          DATETIME NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`tenant_user_role_id`),
    UNIQUE KEY `unique_tenant_user_id_role_id` (`tenant_user_id`, `role_id`),
    KEY `user_roles_user_id` (`tenant_user_id`),
    KEY `user_roles_role_id` (`role_id`),
    FOREIGN KEY (`created_by`)     REFERENCES `tenant_users` (`tenant_user_id`),
    FOREIGN KEY (`tenant_user_id`) REFERENCES `tenant_users` (`tenant_user_id`) ON DELETE CASCADE,
    FOREIGN KEY (`role_id`)        REFERENCES `roles` (`role_id`)              ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE IF NOT EXISTS `tenant_teams` (
    `tenant_team_id` BIGINT UNSIGNED AUTO_INCREMENT,
    `tenant_id`      BIGINT UNSIGNED NOT NULL COMMENT 'Linked tenant',
    `team_identifier` VARCHAR(255) NOT NULL COMMENT 'Identifier used to view team details publicly',
    `name`            VARCHAR(255) NOT NULL COMMENT 'Name of the team',
    `description`     TEXT COMMENT 'Description of the team',
    `created_by`      BIGINT UNSIGNED NOT NULL COMMENT 'Tenant-user who created the team',
    `updated_by`      BIGINT UNSIGNED DEFAULT 0 COMMENT 'Tenant-user who updated the team',
    `created_at`      DATETIME  DEFAULT current_timestamp(),
    `updated_at`      TIMESTAMP DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    
    PRIMARY KEY (`tenant_team_id`),
    
    KEY `tenant_teams_tenant_id`   (`tenant_id`),
    KEY `tenant_teams_created_by`  (`created_by`),
    KEY `tenant_teams_updated_by`  (`updated_by`),
    
    FOREIGN KEY (`tenant_id`)  REFERENCES `tenants`      (`tenant_id`)       ON DELETE CASCADE,
    FOREIGN KEY (`created_by`) REFERENCES `tenant_users` (`tenant_user_id`),
    FOREIGN KEY (`updated_by`) REFERENCES `tenant_users` (`tenant_user_id`)  ON DELETE SET NULL,
    
    UNIQUE KEY `unique_team` (`team_identifier`) COMMENT 'Prevent duplicate team_identifier'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE IF NOT EXISTS `tenant_team_members` (
    `tenant_team_member_id` BIGINT UNSIGNED AUTO_INCREMENT,
    `tenant_team_id`        BIGINT UNSIGNED NOT NULL COMMENT 'Linked team',
    `tenant_user_id`        BIGINT UNSIGNED NOT NULL COMMENT 'Linked tenant user',
    `role_id`               INT(11) UNSIGNED DEFAULT 0,
    `created_at`            DATETIME DEFAULT current_timestamp() COMMENT 'When the user joined the team',
    PRIMARY KEY (`tenant_team_member_id`),
    FOREIGN KEY (`tenant_team_id`) REFERENCES `tenant_teams`  (`tenant_team_id`)  ON DELETE CASCADE,
    FOREIGN KEY (`tenant_user_id`) REFERENCES `tenant_users` (`tenant_user_id`)  ON DELETE CASCADE,
    UNIQUE KEY `unique_team_member` (`tenant_team_id`, `tenant_user_id`) COMMENT 'Prevent duplicate members in a team'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE IF NOT EXISTS `tenant_team_projects` (
    `team_project_id` BIGINT UNSIGNED AUTO_INCREMENT,
    `tenant_team_id`  BIGINT UNSIGNED NOT NULL COMMENT 'Linked team',
    `project_id`      BIGINT UNSIGNED NOT NULL COMMENT 'Linked project',
    `created_by`      BIGINT UNSIGNED NOT NULL COMMENT 'User who assigned the project',
    `created_at`      DATETIME DEFAULT current_timestamp() COMMENT 'When the project was assigned',
    PRIMARY KEY (`team_project_id`),
    FOREIGN KEY (`tenant_team_id`) REFERENCES `tenant_teams` (`tenant_team_id`) ON DELETE CASCADE,
    FOREIGN KEY (`project_id`)     REFERENCES `projects`     (`project_id`)     ON DELETE CASCADE,
    FOREIGN KEY (`created_by`)     REFERENCES `tenant_users` (`tenant_user_id`),
    UNIQUE KEY `unique_team_project` (`tenant_team_id`, `project_id`) COMMENT 'Prevent duplicate assignments'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `categories` (
    `category_id` INT UNSIGNED AUTO_INCREMENT,
    `tenant_id`   BIGINT UNSIGNED DEFAULT 0,
    `status_id`   TINYINT UNSIGNED NOT NULL,
    `group_name`  VARCHAR(255) NOT NULL,
    `created_by`  BIGINT UNSIGNED NOT NULL COMMENT 'Tenant-user who created the team',
    `updated_by`  BIGINT UNSIGNED DEFAULT 0 COMMENT 'Tenant-user who updated the team',
    `created_at`  DATETIME  DEFAULT current_timestamp(),
    `updated_at`  TIMESTAMP DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`category_id`),
    FOREIGN KEY (`tenant_id`)  REFERENCES `tenants`        (`tenant_id`)       ON DELETE CASCADE,
    FOREIGN KEY (`status_id`)  REFERENCES `system_statuses`(`status_id`),
    FOREIGN KEY (`created_by`) REFERENCES `tenant_users`   (`tenant_user_id`),
    FOREIGN KEY (`updated_by`) REFERENCES `tenant_users`   (`tenant_user_id`)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE IF NOT EXISTS `category_descriptions` (
    `category_description_id` BIGINT UNSIGNED AUTO_INCREMENT,
    `category_id`             INT UNSIGNED DEFAULT 0 COMMENT 'Category id who owns this description',
    `language_id`             TINYINT UNSIGNED NOT NULL DEFAULT 1,
    `name`                    VARCHAR(255) NOT NULL UNIQUE COMMENT 'Name of the category',
    `description`             TEXT COMMENT 'Description of the category',
    `created_at`              DATETIME DEFAULT current_timestamp(),
    PRIMARY KEY (`category_description_id`),
    KEY `category_descriptions_language_id` (`language_id`),
    FOREIGN KEY (`language_id`) REFERENCES `system_languages` (`language_id`),
    FOREIGN KEY (`category_id`)  REFERENCES `categories`      (`category_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



CREATE TABLE IF NOT EXISTS `process_templates` (
    `process_template_id` BIGINT UNSIGNED AUTO_INCREMENT,
    `tenant_id`           BIGINT UNSIGNED DEFAULT 0 COMMENT 'Who owns this process_template?',
    `created_by`          BIGINT UNSIGNED NOT NULL COMMENT 'Tenant User ID',
    `updated_by`          BIGINT UNSIGNED DEFAULT 0 COMMENT 'Tenant User ID',
    `created_at`          DATETIME  DEFAULT current_timestamp(),
    `updated_at`          TIMESTAMP DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    
    PRIMARY KEY (`process_template_id`),
    FOREIGN KEY (`tenant_id`)  REFERENCES `tenants`      (`tenant_id`)       ON DELETE CASCADE,
    FOREIGN KEY (`created_by`) REFERENCES `tenant_users` (`tenant_user_id`),
    FOREIGN KEY (`updated_by`) REFERENCES `tenant_users` (`tenant_user_id`)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;




CREATE TABLE IF NOT EXISTS `process_template_descriptions` (
    `process_template_description_id` BIGINT UNSIGNED AUTO_INCREMENT,
    `process_template_id`             BIGINT UNSIGNED DEFAULT 0 COMMENT 'Process template id who own this description',
    `language_id`                     TINYINT UNSIGNED NOT NULL DEFAULT 1,
    `name`                            VARCHAR(255) NOT NULL COMMENT 'Example: HVAC Installation, IT Project Setup',
    `description`                     TEXT NULL COMMENT 'Description of the process',
    `created_at`                      DATETIME DEFAULT current_timestamp(),
    PRIMARY KEY (`process_template_description_id`),
    KEY `process_template_descriptions_language_id` (`language_id`),
    FOREIGN KEY (`language_id`)         REFERENCES `system_languages`   (`language_id`),
    FOREIGN KEY (`process_template_id`) REFERENCES `process_templates`  (`process_template_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



CREATE TABLE IF NOT EXISTS `process_template_categories` (
    `process_template_id` BIGINT UNSIGNED NOT NULL COMMENT 'Linked template',
    `category_id`         INT UNSIGNED NOT NULL COMMENT 'Linked category',
    PRIMARY KEY (`process_template_id`, `category_id`),
    FOREIGN KEY (`process_template_id`)
        REFERENCES `process_templates` (`process_template_id`) ON DELETE CASCADE,
    FOREIGN KEY (`category_id`)
        REFERENCES `categories` (`category_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE IF NOT EXISTS `process_template_steps` (
    `process_template_step_id` BIGINT UNSIGNED AUTO_INCREMENT,
    `process_template_id`      BIGINT UNSIGNED NOT NULL COMMENT 'Links to process_templates',
    `task_type`                ENUM('manual','automated') DEFAULT 'manual' COMMENT 'Manual or Auto step',
    `step_order`               INT NOT NULL COMMENT 'Defines the order of steps in the process',
    `is_optional`              TINYINT(1) DEFAULT 0,
    `created_by`               BIGINT UNSIGNED NOT NULL COMMENT 'Tenant User ID',
    `updated_by`               BIGINT UNSIGNED DEFAULT 0 COMMENT 'Tenant User ID',
    `created_at`               DATETIME DEFAULT current_timestamp(),
    `updated_at`               TIMESTAMP DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`process_template_step_id`),
    FOREIGN KEY (`process_template_id`) REFERENCES `process_templates` (`process_template_id`) ON DELETE CASCADE,
    FOREIGN KEY (`created_by`)          REFERENCES `tenant_users`      (`tenant_user_id`),
    FOREIGN KEY (`updated_by`)          REFERENCES `tenant_users`      (`tenant_user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



CREATE TABLE IF NOT EXISTS `process_template_step_descriptions` (
    `process_template_step_description_id` BIGINT UNSIGNED AUTO_INCREMENT,
    `process_template_step_id`             BIGINT UNSIGNED DEFAULT 0 COMMENT 'Process template step ID who own this description',
    `language_id`                          TINYINT UNSIGNED NOT NULL DEFAULT 1,
    `name`                                 VARCHAR(255) NOT NULL COMMENT 'Step Name (e.g., "Install Wires", "Test Server")',
    `description`                          TEXT NULL COMMENT 'Step details',
    `created_at`                           TIMESTAMP DEFAULT current_timestamp(),
    PRIMARY KEY (`process_template_step_description_id`),
    KEY `process_template_step_descriptions_language_id` (`language_id`),
    FOREIGN KEY (`language_id`)             REFERENCES `system_languages`          (`language_id`),
    FOREIGN KEY (`process_template_step_id`) REFERENCES `process_template_steps`   (`process_template_step_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



CREATE TABLE IF NOT EXISTS `process_template_step_requirements` (
    `process_template_step_requirement_id` BIGINT UNSIGNED AUTO_INCREMENT,
    `process_template_step_id`             BIGINT UNSIGNED NOT NULL COMMENT 'Links to process_template_steps',
    `requirement_type`                     VARCHAR(255) NOT NULL COMMENT 'e.g., document, approval, payment, etc.',
    `requirement_key`                      VARCHAR(255) NOT NULL COMMENT 'Example: "firewall_config.json", "IT Manager Approval"', 
    `json_schema`                          JSON NOT NULL COMMENT 'Stores validation and events schema for this requirement',
    `created_by`                           BIGINT UNSIGNED NOT NULL COMMENT 'User ID from tenant_users table',
    `updated_by`                           BIGINT UNSIGNED DEFAULT 0 COMMENT 'User ID from tenant_users table',
    `created_at`                           DATETIME DEFAULT current_timestamp(),
    `updated_at`                           TIMESTAMP DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    
    PRIMARY KEY (`process_template_step_requirement_id`),
    FOREIGN KEY (`process_template_step_id`)
        REFERENCES `process_template_steps` (`process_template_step_id`) ON DELETE CASCADE,
    FOREIGN KEY (`created_by`)
        REFERENCES `tenant_users` (`tenant_user_id`),
    FOREIGN KEY (`updated_by`)
        REFERENCES `tenant_users` (`tenant_user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;




CREATE TABLE IF NOT EXISTS `process_template_step_requirement_submissions` (
    `step_requirement_submission_id`        BIGINT UNSIGNED AUTO_INCREMENT,
    `process_template_step_requirement_id`  BIGINT UNSIGNED NOT NULL COMMENT 'Links to process_template_step_requirement',
    `submitted_data`                        JSON NOT NULL COMMENT 'Stores actual input data',
    `status`                                ENUM('pending','approved','rejected') DEFAULT 'pending' COMMENT 'Approval status',
    `reviewed_by`                           BIGINT UNSIGNED NULL COMMENT 'Tenant User who approved/rejected',
    `reviewed_at`                           DATETIME NULL COMMENT 'When it was reviewed',
    `created_by`                            BIGINT UNSIGNED NOT NULL COMMENT 'Tenant User ID',
    `created_at`                            TIMESTAMP DEFAULT current_timestamp(),
    PRIMARY KEY (`step_requirement_submission_id`), 
    FOREIGN KEY (`process_template_step_requirement_id`)
        REFERENCES `process_template_step_requirements` (`process_template_step_requirement_id`) ON DELETE CASCADE,
    FOREIGN KEY (`created_by`)
        REFERENCES `tenant_users` (`tenant_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;




CREATE TABLE IF NOT EXISTS `process_template_step_trigger_conditions` (
    `step_trigger_condition_id` BIGINT UNSIGNED AUTO_INCREMENT,
    `process_template_step_id`  BIGINT UNSIGNED NOT NULL COMMENT 'Links to process_template_steps',
    `condition_type`            VARCHAR(255) NOT NULL COMMENT 'e.g., task_completion, time_based, manual_approval etc.',
    `condition_key`             VARCHAR(255) NOT NULL COMMENT 'Example: "firewall_config.json", "IT Manager Approval"', 
    `json_schema`               JSON NOT NULL COMMENT 'Details of the condition (e.g., task ID, time delay)',
    `created_by`                BIGINT UNSIGNED NOT NULL COMMENT 'User ID from tenant_users table',
    `updated_by`                BIGINT UNSIGNED DEFAULT 0 COMMENT 'User ID from tenant_users table',
    `created_at`                DATETIME DEFAULT current_timestamp(),
    `updated_at`                DATETIME DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`step_trigger_condition_id`),
    FOREIGN KEY (`process_template_step_id`)
        REFERENCES `process_template_steps` (`process_template_step_id`) ON DELETE CASCADE,
    FOREIGN KEY (`created_by`)
        REFERENCES `tenant_users` (`tenant_user_id`),
    FOREIGN KEY (`updated_by`)
        REFERENCES `tenant_users` (`tenant_user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;




CREATE TABLE IF NOT EXISTS `process_template_step_trigger_condition_submissions` (
    `step_trigger_condition_submission_id` BIGINT UNSIGNED AUTO_INCREMENT,
    `step_trigger_condition_id`            BIGINT UNSIGNED NOT NULL COMMENT 'Links to process_template_step_trigger_conditions',
    `submitted_data`                       JSON NOT NULL COMMENT 'Stores actual input data',
    `status`                               ENUM('pending','approved','rejected') DEFAULT 'pending' COMMENT 'Approval status',
    `reviewed_by`                          BIGINT UNSIGNED NULL COMMENT 'Tenant User who approved/rejected',
    `reviewed_at`                          DATETIME NULL COMMENT 'When it was reviewed',
    `created_by`                           BIGINT UNSIGNED NOT NULL COMMENT 'Tenant User ID',
    `created_at`                           TIMESTAMP DEFAULT current_timestamp(),
    PRIMARY KEY (`step_trigger_condition_submission_id`), 
    FOREIGN KEY (`step_trigger_condition_id`)
        REFERENCES `process_template_step_trigger_conditions` (`step_trigger_condition_id`) ON DELETE CASCADE,
    FOREIGN KEY (`created_by`)
        REFERENCES `tenant_users` (`tenant_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;




CREATE TABLE IF NOT EXISTS `projects` (
    `project_id`          BIGINT UNSIGNED AUTO_INCREMENT,
    `name`                VARCHAR(255) NOT NULL,
    `description`         TEXT NULL,
    `project_indentifier` VARCHAR(255) NOT NULL UNIQUE,
    `parent_project_id`   BIGINT UNSIGNED DEFAULT 0 COMMENT 'Helps to split project into phases',
    `tenant_id`           BIGINT UNSIGNED NOT NULL COMMENT 'Who owns this project?',
    `process_template_id` BIGINT UNSIGNED DEFAULT 0 COMMENT 'Linked process template, if project follows custom workflow',
    `is_shared`           BOOLEAN DEFAULT FALSE COMMENT 'Can be shared across companies?',
    `created_by`          BIGINT UNSIGNED NOT NULL COMMENT 'User who created this project',
    `updated_by`          BIGINT UNSIGNED DEFAULT 0,
    `created_at`          DATETIME NOT NULL DEFAULT current_timestamp(),
    `updated_at`          TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    
    PRIMARY KEY (`project_id`),
    
    KEY `projects_is_shared`          (`is_shared`),
    KEY `projects_parent_project_id`  (`parent_project_id`),
    
    FOREIGN KEY (`tenant_id`)
        REFERENCES `tenants`            (`tenant_id`)            ON DELETE CASCADE,
    FOREIGN KEY (`process_template_id`)
        REFERENCES `process_templates`  (`process_template_id`),
    FOREIGN KEY (`created_by`)
        REFERENCES `tenant_users`       (`tenant_user_id`),
    FOREIGN KEY (`updated_by`)
        REFERENCES `tenant_users`       (`tenant_user_id`)       ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;




CREATE TABLE IF NOT EXISTS `project_task_statuses` (
    `project_task_status_id` BIGINT UNSIGNED AUTO_INCREMENT,
    `name`                   VARCHAR(255) NOT NULL COMMENT 'Status name like To-DO, InProgress, Ready-for-testing etc.',
    `tenant_id`              BIGINT UNSIGNED DEFAULT 0 COMMENT 'Tenant ID who owns this project status',
    `project_id`             BIGINT UNSIGNED NOT NULL,
    `status_order`           INT NOT NULL DEFAULT 1 COMMENT 'Defines the order of status in the project',
    `created_by`             BIGINT UNSIGNED NOT NULL COMMENT 'Tenant User ID who created this status',
    `updated_by`             BIGINT UNSIGNED DEFAULT 0,
    PRIMARY KEY (`project_task_status_id`),
    KEY `project_task_statuses_project_id`  (`project_id`),
    KEY `project_task_statuses_tenant_id`   (`tenant_id`),
    KEY `project_task_statuses_status_order` (`status_order`),
    FOREIGN KEY (`created_by`) REFERENCES `tenant_users` (`tenant_user_id`),
    FOREIGN KEY (`updated_by`) REFERENCES `tenant_users` (`tenant_user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;




CREATE TABLE IF NOT EXISTS `tasks` (
    `task_id`             BIGINT UNSIGNED AUTO_INCREMENT,
    `project_id`          BIGINT UNSIGNED NOT NULL,
    `task_indentifier`    VARCHAR(255) NOT NULL UNIQUE,
    `name`                VARCHAR(255) NOT NULL,
    `description`         TEXT NULL,
    `task_status_id`      BIGINT UNSIGNED NOT NULL,
    `process_template_step_id` BIGINT UNSIGNED NULL COMMENT 'Linked process step',
    `priority`            ENUM('low','medium','high') DEFAULT 'medium',
    `estimated_duration`  DECIMAL(10,2) UNSIGNED COMMENT 'Estimated time in hours (e.g., 8.5 = 8 hours 30 mins)',
    `parent_task_id`      BIGINT UNSIGNED NULL COMMENT 'If its a sub-task',
    `created_by`          BIGINT UNSIGNED NOT NULL COMMENT 'Tenant User ID',
    `updated_by`          BIGINT UNSIGNED DEFAULT 0 COMMENT 'Tenant User ID',
    `created_at`          TIMESTAMP DEFAULT current_timestamp(),
    `updated_at`          TIMESTAMP DEFAULT current_timestamp() ON UPDATE current_timestamp(),

    PRIMARY KEY (`task_id`),

    FOREIGN KEY (`project_id`)
        REFERENCES `projects` (`project_id`) ON DELETE CASCADE,
    FOREIGN KEY (`parent_task_id`)
        REFERENCES `tasks`   (`task_id`) ON DELETE SET NULL,
    FOREIGN KEY (`task_status_id`)
        REFERENCES `project_task_statuses` (`project_task_status_id`),
    FOREIGN KEY (`created_by`)
        REFERENCES `tenant_users` (`tenant_user_id`),
    FOREIGN KEY (`updated_by`)
        REFERENCES `tenant_users` (`tenant_user_id`) ON DELETE SET NULL,
    FOREIGN KEY (`process_template_step_id`)
        REFERENCES `process_template_steps` (`process_template_step_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



CREATE TABLE IF NOT EXISTS `scheduled_tasks` (
    `scheduled_task_id` BIGINT UNSIGNED AUTO_INCREMENT,
    `task_id`           BIGINT UNSIGNED NOT NULL COMMENT 'Linked task',
    `task_status_id`    BIGINT UNSIGNED NOT NULL,
    `scheduled_start`   DATETIME NOT NULL,
    `scheduled_end`     DATETIME NOT NULL,
    `actual_start`      DATETIME COMMENT 'When the task actually started',
    `actual_end`        DATETIME COMMENT 'When the task actually ended',
    PRIMARY KEY (`scheduled_task_id`),
    FOREIGN KEY (`task_id`)        REFERENCES `tasks`                 (`task_id`),
    FOREIGN KEY (`task_status_id`) REFERENCES `project_task_statuses` (`project_task_status_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;





CREATE TABLE IF NOT EXISTS `task_time_logs` (
    `log_id`               BIGINT UNSIGNED AUTO_INCREMENT,
    `resource_assignment_id` BIGINT UNSIGNED NOT NULL COMMENT 'Linked resource assignment',
    `tenant_user_id`       BIGINT UNSIGNED NOT NULL COMMENT 'Who logged the time',
    `start_time`           DATETIME NOT NULL COMMENT 'Time tracking started',
    `end_time`             DATETIME COMMENT 'Time tracking stopped',
    `duration`             DECIMAL(10,2) UNSIGNED COMMENT 'Calculated duration in hours',
    `status`               ENUM('active','completed') DEFAULT 'active' COMMENT 'Is the timer running?',
    `description`          TEXT COMMENT 'Optional notes (e.g., "Debugging API")',
    PRIMARY KEY (`log_id`),
    FOREIGN KEY (`resource_assignment_id`)
        REFERENCES `resource_assignments` (`resource_assignment_id`),
    FOREIGN KEY (`tenant_user_id`)
        REFERENCES `tenant_users` (`tenant_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;




CREATE TABLE IF NOT EXISTS `task_dependencies` (
    `dependency_id`       BIGINT UNSIGNED AUTO_INCREMENT,
    `task_id`             BIGINT UNSIGNED NOT NULL COMMENT 'Dependent task',
    `depends_on_task_id`  BIGINT UNSIGNED NOT NULL COMMENT 'Task it depends on',
    `dependency_type`     ENUM('FS','SS','FF','SF') DEFAULT 'FS' COMMENT 'FS = Finish-to-Start',
    PRIMARY KEY (`dependency_id`),
    FOREIGN KEY (`task_id`)            REFERENCES `tasks` (`task_id`),
    FOREIGN KEY (`depends_on_task_id`) REFERENCES `tasks` (`task_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;




CREATE TABLE IF NOT EXISTS `task_comments` (
    `comment_id` BIGINT UNSIGNED AUTO_INCREMENT,
    `task_id`    BIGINT UNSIGNED NOT NULL COMMENT 'Linked task',
    `comment`    TEXT NOT NULL COMMENT 'Content of the comment',
    `created_by` BIGINT UNSIGNED NOT NULL COMMENT 'Tenant User who created the comment',
    `updated_by` BIGINT UNSIGNED DEFAULT 0 COMMENT 'Tenant User who updated the comment',
    `created_at` DATETIME  DEFAULT current_timestamp(),
    `updated_at` TIMESTAMP DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    
    PRIMARY KEY (`comment_id`),
    FOREIGN KEY (`task_id`)    REFERENCES `tasks`       (`task_id`)        ON DELETE CASCADE,
    FOREIGN KEY (`created_by`) REFERENCES `tenant_users`(`tenant_user_id`),
    FOREIGN KEY (`updated_by`) REFERENCES `tenant_users`(`tenant_user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;




CREATE TABLE IF NOT EXISTS `task_attachments` (
    `attachment_id` BIGINT UNSIGNED AUTO_INCREMENT,
    `task_id`       BIGINT UNSIGNED COMMENT 'Linked task (if attachment in a task)',
    `comment_id`    BIGINT UNSIGNED COMMENT 'Linked comment (if attachment in a comment)',
    `file_name`     VARCHAR(255) NOT NULL COMMENT 'Name of the file',
    `file_path`     VARCHAR(255) NOT NULL COMMENT 'Path to the file',
    `file_type`     VARCHAR(50)  NOT NULL COMMENT 'Type of the file (e.g., PDF, JPEG)',
    `file_size`     BIGINT UNSIGNED NOT NULL COMMENT 'Size of the file in bytes',
    `created_by`    BIGINT UNSIGNED NOT NULL COMMENT 'Tenant User who created the comment',
    `created_at`    DATETIME DEFAULT current_timestamp(),
    PRIMARY KEY (`attachment_id`),
    FOREIGN KEY (`task_id`)    REFERENCES `tasks`        (`task_id`)       ON DELETE CASCADE,
    FOREIGN KEY (`comment_id`) REFERENCES `task_comments`(`comment_id`)    ON DELETE CASCADE,
    FOREIGN KEY (`created_by`) REFERENCES `tenant_users` (`tenant_user_id`),
    CHECK (
        (`task_id` IS NOT NULL  AND `comment_id` IS NULL) OR
        (`task_id` IS NULL      AND `comment_id` IS NOT NULL)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;




CREATE TABLE IF NOT EXISTS `task_mentions` (
    `mention_id`        BIGINT UNSIGNED AUTO_INCREMENT,
    `task_id`           BIGINT UNSIGNED COMMENT 'Linked task (if tagging in a task)',
    `comment_id`        BIGINT UNSIGNED COMMENT 'Linked comment (if tagging in a comment)',
    `mentioned_user_id` BIGINT UNSIGNED NOT NULL COMMENT 'User who was tagged',
    `created_by`        BIGINT UNSIGNED NOT NULL COMMENT 'User who tagged',
    `created_at`        DATETIME DEFAULT current_timestamp(),
    PRIMARY KEY (`mention_id`),
    FOREIGN KEY (`task_id`)           REFERENCES `tasks`        (`task_id`)       ON DELETE CASCADE,
    FOREIGN KEY (`comment_id`)        REFERENCES `task_comments`(`comment_id`)    ON DELETE CASCADE,
    FOREIGN KEY (`mentioned_user_id`) REFERENCES `tenant_users` (`tenant_user_id`) ON DELETE CASCADE,
    FOREIGN KEY (`created_by`)        REFERENCES `tenant_users` (`tenant_user_id`),
    CHECK (
        (`task_id` IS NOT NULL AND `comment_id` IS NULL) OR
        (`task_id` IS NULL     AND `comment_id` IS NOT NULL)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;





CREATE TABLE IF NOT EXISTS `customers` (
    `customer_id`         BIGINT UNSIGNED AUTO_INCREMENT,
    `email`               VARCHAR(255) NOT NULL COMMENT 'Email of the customer',
    `first_name`          VARCHAR(255) COMMENT 'Customer first name',
    `last_name`           VARCHAR(255) COMMENT 'Customer last name',
    `is_profile_completed` TINYINT(1) UNSIGNED DEFAULT 0,
    `password`            VARCHAR(255) NOT NULL COMMENT 'Customer password',
    PRIMARY KEY (`customer_id`),
    `created_at`          DATETIME  DEFAULT current_timestamp(),
    `updated_at`          TIMESTAMP DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    UNIQUE KEY `unique_customer_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;






CREATE TABLE IF NOT EXISTS `customer_contact_info` (
    `customer_contact_id`     BIGINT UNSIGNED AUTO_INCREMENT,
    `customer_id`             BIGINT UNSIGNED NOT NULL COMMENT 'Linked customer',
    `secondary_email`         VARCHAR(255) NOT NULL COMMENT 'Secondary email address',
    `phone`                   VARCHAR(20) COMMENT 'Primary phone number',
    `address`                 TEXT COMMENT 'Physical address',
    `city`                    VARCHAR(100) COMMENT 'City',
    `state`                   VARCHAR(100) COMMENT 'State/Province',
    `country`                 VARCHAR(100) COMMENT 'Country',
    `postal_code`             VARCHAR(20) COMMENT 'Postal code',
    `timezone`                VARCHAR(50)  DEFAULT 'UTC' COMMENT 'Timezone',
    `language_id`             TINYINT UNSIGNED NOT NULL DEFAULT 1,
    `default_currency`        VARCHAR(10)  DEFAULT 'USD' COMMENT 'Default currency',
    `notification_preferences` VARCHAR(255) DEFAULT 'email' COMMENT 'e.g. email, sms, push',
    `created_by`              BIGINT UNSIGNED NOT NULL,
    `updated_by`              BIGINT UNSIGNED DEFAULT 0,
    `created_at`              DATETIME  NOT NULL DEFAULT current_timestamp(),
    `updated_at`              TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    
    PRIMARY KEY (`customer_contact_id`),
    KEY `customer_contact_info_created_by` (`created_by`),
    KEY `customer_contact_info_updated_by` (`updated_by`),
    
    FOREIGN KEY (`created_by`) REFERENCES `tenant_users` (`tenant_user_id`),
    FOREIGN KEY (`updated_by`) REFERENCES `tenant_users` (`tenant_user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;




CREATE TABLE IF NOT EXISTS `customer_invitations` (
    `invitation_id`   BIGINT UNSIGNED AUTO_INCREMENT,
    `project_id`      BIGINT UNSIGNED NOT NULL COMMENT 'Linked project',
    `task_id`         BIGINT UNSIGNED COMMENT 'Linked task (optional)',
    `email`           VARCHAR(255) NOT NULL COMMENT 'Email of the customer',
    `token`           VARCHAR(255) NOT NULL COMMENT 'Invitation token',
    `customer_role_id` INT UNSIGNED NOT NULL COMMENT 'Role of the customer in the project or task',
    `status`          ENUM('pending','accepted','declined') DEFAULT 'pending' COMMENT 'Status of the invitation',
    `invited_by`      BIGINT UNSIGNED NOT NULL COMMENT 'User who sent the invitation',
    `invited_at`      DATETIME DEFAULT current_timestamp() COMMENT 'When the invitation was sent',
    `expires_at`      DATETIME COMMENT 'When the invitation expires',
    PRIMARY KEY (`invitation_id`),
    FOREIGN KEY (`project_id`)      REFERENCES `projects`     (`project_id`)     ON DELETE CASCADE,
    FOREIGN KEY (`task_id`)         REFERENCES `tasks`        (`task_id`)        ON DELETE CASCADE,
    FOREIGN KEY (`invited_by`)      REFERENCES `tenant_users` (`tenant_user_id`) ON DELETE CASCADE,
    FOREIGN KEY (`customer_role_id`) REFERENCES `roles`        (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;





CREATE TABLE IF NOT EXISTS `customer_project_members` (
    `customer_project_member_id` BIGINT UNSIGNED AUTO_INCREMENT,
    `project_id`   BIGINT UNSIGNED NOT NULL COMMENT 'Linked project',
    `customer_id`  BIGINT UNSIGNED NOT NULL COMMENT 'Linked customer',
    `role_id`      INT UNSIGNED NOT NULL COMMENT 'Role of the customer in the project like: ''customer_viewer'', ''customer_contributor''',
    `joined_at`    DATETIME DEFAULT current_timestamp() COMMENT 'When the customer joined the project',
    PRIMARY KEY (`customer_project_member_id`),
    FOREIGN KEY (`project_id`)  REFERENCES `projects`   (`project_id`)  ON DELETE CASCADE,
    FOREIGN KEY (`customer_id`) REFERENCES `customers`  (`customer_id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_customer_project_member` (`project_id`, `customer_id`) COMMENT 'Prevent duplicate customer members in a project'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;





CREATE TABLE IF NOT EXISTS `customer_task_members` (
    `customer_task_member_id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `task_id`        BIGINT UNSIGNED NOT NULL COMMENT 'Linked task',
    `customer_id`    BIGINT UNSIGNED NOT NULL COMMENT 'Linked customer',
    `role_id`        INT UNSIGNED NOT NULL COMMENT 'Role of the customer in the task like: ''customer_viewer'', ''customer_contributor''',
    `joined_at`      DATETIME DEFAULT current_timestamp() COMMENT 'When the customer joined the task',
    
    FOREIGN KEY (`task_id`)     REFERENCES `tasks`     (`task_id`)     ON DELETE CASCADE,
    FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`) ON DELETE CASCADE,
    
    UNIQUE KEY `unique_customer_task_member` (`task_id`, `customer_id`) COMMENT 'Prevent duplicate customer members in a task'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;





CREATE TABLE IF NOT EXISTS `resources` (
    `resource_id`    BIGINT UNSIGNED AUTO_INCREMENT,
    `name`           VARCHAR(255) NOT NULL COMMENT 'Example:"Crane", "Developer Laptop"',
    `description`    TEXT NULL COMMENT 'Resource description if exist',
    `tenant_user_id` BIGINT UNSIGNED DEFAULT 0 COMMENT 'User ID from tenant_users table if resource is human',
    `type`           ENUM('equipment','human') NOT NULL,
    `tenant_id`      BIGINT UNSIGNED NOT NULL COMMENT 'Which company owns it',
    `is_shared`      TINYINT(1) UNSIGNED DEFAULT 0 COMMENT 'Can other companies use it?',
    `created_at`     TIMESTAMP DEFAULT current_timestamp(),

    PRIMARY KEY (`resource_id`),
    FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;





CREATE TABLE IF NOT EXISTS `resource_availability` (
    `availability_id`  BIGINT UNSIGNED AUTO_INCREMENT,
    `resource_id`      BIGINT UNSIGNED NOT NULL COMMENT 'Linked resource',
    `start_time`       DATETIME NOT NULL COMMENT 'Start of availability',
    `end_time`         DATETIME NOT NULL COMMENT 'End of availability',
    `is_recurring`     TINYINT(1) DEFAULT 0 COMMENT 'Is this a recurring slot? (e.g., daily, weekly)',
    `recurrence_rule`  VARCHAR(255) COMMENT 'Recurrence rule in iCalendar format (e.g., FREQ=WEEKLY;BYDAY=MO,TU)',
    `created_at`       DATETIME DEFAULT current_timestamp(),
    PRIMARY KEY (`availability_id`),
    FOREIGN KEY (`resource_id`) REFERENCES `resources` (`resource_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;





CREATE TABLE IF NOT EXISTS `resource_blackout_dates` (
    `blackout_id` BIGINT UNSIGNED AUTO_INCREMENT,
    `resource_id` BIGINT UNSIGNED NOT NULL COMMENT 'Linked resource',
    `start_date`  DATE NOT NULL COMMENT 'Start of blackout period',
    `end_date`    DATE NOT NULL COMMENT 'End of blackout period',
    `description` VARCHAR(255) COMMENT 'Reason for blackout (e.g., maintenance, training)',
    PRIMARY KEY (`blackout_id`),
    FOREIGN KEY (`resource_id`) REFERENCES `resources` (`resource_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;




CREATE TABLE IF NOT EXISTS `resource_assignments` (
    `resource_assignment_id` BIGINT UNSIGNED AUTO_INCREMENT,
    `resource_id`            BIGINT UNSIGNED NOT NULL COMMENT 'Linked resource (human/equipment)',
    `scheduled_task_id`      BIGINT UNSIGNED NOT NULL COMMENT 'Linked scheduled task',
    `assigned_start`         DATETIME NOT NULL COMMENT 'Resource-specific start time',
    `assigned_end`           DATETIME NOT NULL COMMENT 'Resource-specific end time',
    PRIMARY KEY (`resource_assignment_id`),
    FOREIGN KEY (`resource_id`) REFERENCES `resources` (`resource_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;





CREATE TABLE IF NOT EXISTS `shared_resources` (
    `sharing_id`            BIGINT UNSIGNED AUTO_INCREMENT,
    `resource_id`           BIGINT UNSIGNED NOT NULL,
    `shared_by_tenant_id`   BIGINT UNSIGNED NOT NULL COMMENT 'Tenant sharing the resource',
    `shared_with_tenant_id` BIGINT UNSIGNED NOT NULL COMMENT 'Tenant receiving access',
    `permission_level`      ENUM('view','use','manage') DEFAULT 'view',
    `valid_from`            DATETIME DEFAULT current_timestamp(),
    `valid_until`           DATETIME COMMENT 'Optional time-bound access',
    `sharing_status`        ENUM('pending','active','revoked') DEFAULT 'pending',
    `created_at`            DATETIME DEFAULT current_timestamp(),
    `revoked_at`            DATETIME DEFAULT NULL,
    `revoked_by`            BIGINT UNSIGNED DEFAULT NULL,
    
    PRIMARY KEY (`sharing_id`),
    UNIQUE KEY `unique_shared_resource` (`resource_id`, `shared_with_tenant_id`),
    
    FOREIGN KEY (`resource_id`)           REFERENCES `resources` (`resource_id`)             ON DELETE CASCADE,
    FOREIGN KEY (`shared_by_tenant_id`)   REFERENCES `tenants`   (`tenant_id`)              ON DELETE CASCADE,
    FOREIGN KEY (`shared_with_tenant_id`) REFERENCES `tenants`   (`tenant_id`)              ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;




CREATE TABLE IF NOT EXISTS `shared_projects` (
    `sharing_id`            BIGINT UNSIGNED AUTO_INCREMENT,
    `project_id`            BIGINT UNSIGNED NOT NULL,
    `shared_by_tenant_id`   BIGINT UNSIGNED NOT NULL,
    `shared_with_tenant_id` BIGINT UNSIGNED NOT NULL,
    `permission_level`      ENUM('view','edit','manage') DEFAULT 'view',
    `valid_from`            DATETIME DEFAULT current_timestamp(),
    `valid_until`           DATETIME,
    `sharing_status`        ENUM('pending','active','revoked') DEFAULT 'pending',
    `created_at`            DATETIME DEFAULT current_timestamp(),
    `revoked_at`            DATETIME DEFAULT NULL,
    `revoked_by`            BIGINT UNSIGNED DEFAULT NULL,
    
    PRIMARY KEY (`sharing_id`),
    UNIQUE KEY `unique_shared_project` (`project_id`, `shared_with_tenant_id`),
    
    FOREIGN KEY (`project_id`)            REFERENCES `projects` (`project_id`)             ON DELETE CASCADE,
    FOREIGN KEY (`shared_by_tenant_id`)   REFERENCES `tenants`  (`tenant_id`)              ON DELETE CASCADE,
    FOREIGN KEY (`shared_with_tenant_id`) REFERENCES `tenants`  (`tenant_id`)              ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;




CREATE TABLE IF NOT EXISTS `shared_tasks` (
    `sharing_id`            BIGINT UNSIGNED AUTO_INCREMENT,
    `task_id`               BIGINT UNSIGNED NOT NULL,
    `shared_by_tenant_id`   BIGINT UNSIGNED NOT NULL,
    `shared_with_tenant_id` BIGINT UNSIGNED NOT NULL,
    `permission_level`      ENUM('view','edit','assign') DEFAULT 'view',
    `valid_from`            DATETIME DEFAULT current_timestamp(),
    `valid_until`           DATETIME,
    `sharing_status`        ENUM('pending','active','revoked') DEFAULT 'pending',
    `created_at`            DATETIME DEFAULT current_timestamp(),
    `revoked_at`            DATETIME DEFAULT NULL,
    `revoked_by`            BIGINT UNSIGNED DEFAULT NULL,

    PRIMARY KEY (`sharing_id`),
    UNIQUE KEY `unique_shared_task` (`task_id`, `shared_with_tenant_id`),

    FOREIGN KEY (`task_id`)
        REFERENCES `tasks`   (`task_id`)   ON DELETE CASCADE,
    FOREIGN KEY (`shared_by_tenant_id`)
        REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE,
    FOREIGN KEY (`shared_with_tenant_id`)
        REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;




CREATE TABLE IF NOT EXISTS `sharing_invitations` (
    `invitation_id`        BIGINT UNSIGNED AUTO_INCREMENT,
    `shared_entity_type`   ENUM('resource','project','task') NOT NULL,
    `shared_entity_id`     BIGINT UNSIGNED NOT NULL,
    `shared_by_tenant_id`  BIGINT UNSIGNED NOT NULL COMMENT 'Owner of the entity',
    `shared_with_tenant_id` BIGINT UNSIGNED NOT NULL COMMENT 'Target tenant for invitation/request',
    `invitation_token`     VARCHAR(255) NOT NULL COMMENT 'For secure acceptance',
    `expires_at`           DATETIME NOT NULL,
    `status`               ENUM('pending','accepted','rejected','requested') DEFAULT 'pending' COMMENT '
        pending    = invitation sent by owner,
        requested  = access requested by another tenant,
        accepted/rejected = final status',
    `created_at`           DATETIME DEFAULT current_timestamp(),

    PRIMARY KEY (`invitation_id`),

    FOREIGN KEY (`shared_by_tenant_id`)
        REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE,
    FOREIGN KEY (`shared_with_tenant_id`)
        REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



CREATE TABLE IF NOT EXISTS `sharing_logs` (
    `log_id`           BIGINT UNSIGNED AUTO_INCREMENT,
    `sharing_id`       BIGINT UNSIGNED NOT NULL,
    `shared_entity_type` ENUM('resource','project','task') NOT NULL,
    `action`           ENUM('shared','requested','accepted','rejected','revoked','permission_updated') NOT NULL,
    `performed_by`     BIGINT UNSIGNED NOT NULL COMMENT 'Tenant User ID',
    `created_at`       DATETIME DEFAULT current_timestamp(),
    `notes`            TEXT,
    PRIMARY KEY (`log_id`),
    FOREIGN KEY (`performed_by`) REFERENCES `tenant_users` (`tenant_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



CREATE TABLE IF NOT EXISTS `events` (
    `event_id`   BIGINT UNSIGNED AUTO_INCREMENT,
    `name`       VARCHAR(255) NOT NULL COMMENT 'Name of the event (e.g., task_assigned, comment_added)',
    `description` TEXT COMMENT 'Description of the event',
    `created_by` BIGINT UNSIGNED NOT NULL COMMENT 'WP User who created the event',
    `updated_by` BIGINT UNSIGNED DEFAULT 0 COMMENT 'WP User who updated the event',
    `created_at` DATETIME  DEFAULT current_timestamp(),
    `updated_at` TIMESTAMP DEFAULT current_timestamp() ON UPDATE current_timestamp(),

    PRIMARY KEY (`event_id`),
    UNIQUE KEY `unique_event_name` (`name`),

    FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`),
    FOREIGN KEY (`updated_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



CREATE TABLE IF NOT EXISTS `event_listeners` (
    `listener_id`  BIGINT UNSIGNED AUTO_INCREMENT,
    `event_id`     BIGINT UNSIGNED NOT NULL COMMENT 'Linked event',
    `channel_id`   BIGINT UNSIGNED NOT NULL COMMENT 'Linked notification channel',
    `template_id`  BIGINT UNSIGNED NOT NULL COMMENT 'Linked notification template',
    `is_active`    TINYINT(1) DEFAULT 1 COMMENT 'Whether the listener is active',
    `created_by`   BIGINT UNSIGNED NOT NULL COMMENT 'WP User who created the comment',
    `updated_by`   BIGINT UNSIGNED DEFAULT 0 COMMENT 'WP User who updated the comment',
    `created_at`   DATETIME  DEFAULT current_timestamp(),
    `updated_at`   TIMESTAMP DEFAULT current_timestamp() ON UPDATE current_timestamp(),

    PRIMARY KEY (`listener_id`),

    FOREIGN KEY (`event_id`)   REFERENCES `events`               (`event_id`)    ON DELETE CASCADE,
    FOREIGN KEY (`channel_id`) REFERENCES `notification_channels`(`channel_id`)  ON DELETE CASCADE,
    FOREIGN KEY (`template_id`)REFERENCES `notification_templates`(`template_id`) ON DELETE CASCADE,
    FOREIGN KEY (`created_by`) REFERENCES `users`                (`user_id`),
    FOREIGN KEY (`updated_by`) REFERENCES `users`                (`user_id`)          ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `event_logs` (
    `log_id`      BIGINT UNSIGNED AUTO_INCREMENT,
    `event_id`    BIGINT UNSIGNED NOT NULL COMMENT 'Linked event',
    `user_id`     BIGINT UNSIGNED NOT NULL COMMENT 'User who triggered the event',
    `entity_id`   BIGINT UNSIGNED COMMENT 'ID of the entity related to the event (e.g., task_id, comment_id)',
    `entity_type` VARCHAR(255) COMMENT 'Type of the entity (e.g., task, comment)',
    `external_id` VARCHAR(255) COMMENT 'ID returned by the external notification service',
    `created_by`  BIGINT UNSIGNED NOT NULL COMMENT 'WP User who created the comment',
    `created_at`  DATETIME DEFAULT current_timestamp(),

    PRIMARY KEY (`log_id`),

    FOREIGN KEY (`event_id`)   REFERENCES `events` (`event_id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`)    REFERENCES `users`  (`user_id`)  ON DELETE CASCADE,
    FOREIGN KEY (`created_by`) REFERENCES `users`  (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;




CREATE TABLE IF NOT EXISTS `notifications` (
    `notification_id` BIGINT UNSIGNED AUTO_INCREMENT,
    `user_id`         BIGINT UNSIGNED NOT NULL COMMENT 'User who should receive the notification',
    `event_id`        BIGINT UNSIGNED COMMENT 'Linked event',
    `type`            ENUM('push','sms','email','system') NOT NULL COMMENT 'Type of notification',
    `subject`         VARCHAR(255) COMMENT 'Subject of the notification (e.g., email subject)',
    `message`         TEXT NOT NULL COMMENT 'Content of the notification',
    `status`          ENUM('pending','sent','failed') DEFAULT 'pending' COMMENT 'Status of the notification',
    `created_at`      DATETIME DEFAULT current_timestamp(),
    `scheduled_at`    DATETIME COMMENT 'When the notification should be sent',
    `sent_at`         DATETIME COMMENT 'When the notification was sent',
    
    PRIMARY KEY (`notification_id`),
    FOREIGN KEY (`user_id`)  REFERENCES `users`  (`user_id`) ON DELETE CASCADE,
    FOREIGN KEY (`event_id`) REFERENCES `events` (`event_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



CREATE TABLE IF NOT EXISTS `notification_channels` (
    `channel_id`  BIGINT UNSIGNED AUTO_INCREMENT,
    `name`        VARCHAR(255) NOT NULL COMMENT 'Name of the channel (e.g., email, SMS, push)',
    `description` TEXT COMMENT 'Description of the channel',
    `created_by`  BIGINT UNSIGNED NOT NULL COMMENT 'WP User who created the comment',
    `updated_by`  BIGINT UNSIGNED DEFAULT 0 COMMENT 'WP User who updated the comment',
    `created_at`  DATETIME  DEFAULT current_timestamp(),
    `updated_at`  TIMESTAMP DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    
    PRIMARY KEY (`channel_id`),
    UNIQUE KEY `unique_channel_name` (`name`),
    
    FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`),
    FOREIGN KEY (`updated_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `notification_templates` (
    `template_id` BIGINT UNSIGNED AUTO_INCREMENT,
    `name`        VARCHAR(255) NOT NULL COMMENT 'Name of the template',
    `subject`     VARCHAR(255) COMMENT 'Subject of the notification',
    `message`     TEXT NOT NULL COMMENT 'Template content',
    `channel_id`  BIGINT UNSIGNED NOT NULL COMMENT 'Linked channel',
    `created_by`  BIGINT UNSIGNED NOT NULL COMMENT 'WP User who created the comment',
    `updated_by`  BIGINT UNSIGNED DEFAULT 0 COMMENT 'WP User who updated the comment',
    `created_at`  DATETIME  DEFAULT current_timestamp(),
    `updated_at`  TIMESTAMP DEFAULT current_timestamp() ON UPDATE current_timestamp(),

    PRIMARY KEY (`template_id`),
    FOREIGN KEY (`channel_id`) REFERENCES `notification_channels` (`channel_id`) ON DELETE CASCADE,
    FOREIGN KEY (`created_by`) REFERENCES `users`                (`user_id`),
    FOREIGN KEY (`updated_by`) REFERENCES `users`                (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE IF NOT EXISTS `notification_logs` (
    `log_id`          BIGINT UNSIGNED AUTO_INCREMENT,
    `notification_id` BIGINT UNSIGNED NOT NULL COMMENT 'Linked notification',
    `channel_id`      BIGINT UNSIGNED NOT NULL COMMENT 'Channel used for the notification',
    `status`          ENUM('pending','sent','failed') NOT NULL COMMENT 'Status of the notification attempt',
    `response`        TEXT COMMENT 'Response from the notification service (e.g., error message)',
    `created_at`      DATETIME DEFAULT current_timestamp(),

    PRIMARY KEY (`log_id`),
    FOREIGN KEY (`notification_id`) REFERENCES `notifications`         (`notification_id`) ON DELETE CASCADE,
    FOREIGN KEY (`channel_id`)      REFERENCES `notification_channels` (`channel_id`)      ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;




CREATE TABLE IF NOT EXISTS `user_notification_preferences` (
    `preference_id` BIGINT UNSIGNED AUTO_INCREMENT,
    `user_id`       BIGINT UNSIGNED NOT NULL COMMENT 'Linked user',
    `channel_id`    BIGINT UNSIGNED NOT NULL COMMENT 'Linked channel',
    `is_enabled`    TINYINT(1) DEFAULT 1 COMMENT 'Whether the user has enabled this channel',
    `created_at`    DATETIME  DEFAULT current_timestamp(),
    `updated_at`    TIMESTAMP DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`preference_id`),
    FOREIGN KEY (`user_id`)    REFERENCES `tenant_users`          (`tenant_user_id`) ON DELETE CASCADE,
    FOREIGN KEY (`channel_id`) REFERENCES `notification_channels` (`channel_id`)     ON DELETE CASCADE,
    UNIQUE KEY `unique_user_channel` (`user_id`, `channel_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET FOREIGN_KEY_CHECKS = 1;