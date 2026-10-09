-- Patch existing HVAC customer form panel to include password + isProfileCompleted (create/update).
-- Safe to re-run: only updates hvac_cust_core on demo_hvac_customer_form views.

UPDATE `config_object_view_panels` covp
INNER JOIN `config_object_views` cov ON cov.`config_object_view_id` = covp.`config_object_view_id`
INNER JOIN `config_objects` co ON co.`config_object_id` = cov.`config_object_id`
INNER JOIN `config_template_sets` cts ON cts.`config_template_set_id` = co.`config_template_set_id`
SET covp.`layout_config` = JSON_SET(
  covp.`layout_config`,
  '$.layout.sections[0].fields',
  JSON_ARRAY('email', 'firstName', 'lastName', 'password', 'isProfileCompleted')
)
WHERE cts.`key` = 'industry_hvac_install'
  AND co.`object_type` = 'customer'
  AND cov.`view_key` = 'demo_hvac_customer_form'
  AND covp.`panel_key` = 'hvac_cust_core';
