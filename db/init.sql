--
-- Database: `user_service`
--

-- --------------------------------------------------------

--
-- Table structure for `roles`
--

CREATE TABLE `roles` (
  `role_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `is_active` tinyint(1) unsigned NOT NULL DEFAULT 1,
  `is_deleted` tinyint(1) unsigned NOT NULL DEFAULT 0,
  `created_by` int(11) unsigned NOT NULL DEFAULT 0,
  `updated_by` int(11) unsigned DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`role_id`),
  KEY `roles_is_active` (`is_active`),
  KEY `roles_is_deleted` (`is_deleted`),
  KEY `roles_created_by` (`created_by`),
  KEY `roles_updated_by` (`updated_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- --------------------------------------------------------

--
-- Table structure for `role_descriptions`
--

CREATE TABLE `role_descriptions` (
  `role_description_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `role_id` int(11) unsigned NOT NULL,
  `language_id` smallint(2) unsigned NOT NULL DEFAULT 1,
  `name` varchar(50) NOT NULL,
  `description` text DEFAULT NULL,
  `created_by` int(11) unsigned NOT NULL DEFAULT 0,
  `updated_by` int(11) unsigned DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`role_description_id`),
  UNIQUE(`role_id`,`name`),
  KEY `role_descriptions_role_id` (`role_id`),
  KEY `role_descriptions_language_id` (`language_id`),
  KEY `role_descriptions_created_by` (`created_by`),
  KEY `role_descriptions_updated_by` (`updated_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for `users`
--

CREATE TABLE `users` (
  `user_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `first_name` varchar(40) NOT NULL,
  `last_name` varchar(40) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `username` varchar(40) NOT NULL,
  `password` varchar(255) NOT NULL,
  `login_num` int(11) DEFAULT 0,
  `rp_token` text DEFAULT NULL,
  `rp_token_created_at` datetime DEFAULT NULL,
  `interface_locale` tinyint(2) unsigned NOT NULL DEFAULT 1,
  `is_active` tinyint(1) unsigned NOT NULL DEFAULT 1,
  `is_deleted` tinyint(1) unsigned NOT NULL DEFAULT 0,
  `is_blocked` tinyint(1) unsigned NOT NULL DEFAULT 0,
  `block_date` datetime DEFAULT NULL,
  `extra` text DEFAULT NULL,
  `created_by` int(11) unsigned NOT NULL DEFAULT 0,
  `updated_by` int(11) unsigned DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
   PRIMARY KEY (`user_id`),
   UNIQUE KEY `users_email` (`email`),
   UNIQUE KEY `users_username` (`username`),
   KEY `users_is_active` (`is_active`),
   KEY `users_is_deleted` (`is_deleted`),
   KEY `users_is_blocked` (`is_blocked`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for `user_login_tokens`
--

CREATE TABLE `user_login_tokens` (
  `token_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(11) unsigned NOT NULL,
  `token` text NOT NULL,
  `is_active` tinyint(1) unsigned NOT NULL DEFAULT 1,
  `ip_address` varchar(15) NOT NULL,
  `user_agent` varchar(255) NOT NULL,
  `device_name` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
   PRIMARY KEY (`token_id`),
   KEY `user_login_tokens_user_id` (`user_id`),
   KEY `user_login_tokens_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for `user_passwords`
--

CREATE TABLE `user_passwords` (
  `password_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(11) unsigned NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `ip_address` varchar(15) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
   PRIMARY KEY (`password_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for `user_roles`
--

CREATE TABLE `user_roles` (
  `user_role_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(11) unsigned NOT NULL,
  `role_id` int(11) unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
   PRIMARY KEY (`user_role_id`),
   UNIQUE(`user_id`,`role_id`),
   KEY `user_roles_user_id` (`user_id`),
   KEY `user_roles_role_id` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for `role_permissions`
--

CREATE TABLE `role_permissions` (
  `role_permission_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `role_id` int(11) unsigned NOT NULL,
  `permission_id` int(11) unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
   PRIMARY KEY (`role_permission_id`),
   UNIQUE(`role_id`,`permission_id`),
   KEY `role_permissions_user_id` (`role_id`),
   KEY `role_permissions_permission_id` (`permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- --------------------------------------------------------

--
-- Table structure for `permissions`
--

CREATE TABLE `permissions` (
  `permission_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `is_active` tinyint(1) unsigned NOT NULL DEFAULT 1,
  `is_deleted` tinyint(1) unsigned NOT NULL DEFAULT 0,
  `created_by` int(11) unsigned NOT NULL DEFAULT 0,
  `updated_by` int(11) unsigned DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`permission_id`),
  KEY `roles_is_active` (`is_active`),
  KEY `roles_is_deleted` (`is_deleted`),
  KEY `roles_created_by` (`created_by`),
  KEY `roles_updated_by` (`updated_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for `permission_descriptions`
--

CREATE TABLE `permission_descriptions` (
  `permission_description_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `permission_id` int(11) unsigned NOT NULL,
  `language_id` smallint(2) unsigned NOT NULL DEFAULT 1,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `created_by` int(11) unsigned NOT NULL DEFAULT 0,
  `updated_by` int(11) unsigned DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`permission_description_id`),
  UNIQUE(`permission_id`,`name`),
  KEY `role_descriptions_id` (`permission_description_id`),
  KEY `role_descriptions_language_id` (`language_id`),
  KEY `role_descriptions_created_by` (`created_by`),
  KEY `role_descriptions_updated_by` (`updated_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;