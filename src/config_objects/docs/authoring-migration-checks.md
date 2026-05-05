# Authoring migration checks (C-2)

Run these **after** view-type migrations (e.g. `board` → `list` + `form`) and panel layout validation rollouts. They are **read-only** sanity queries for operators / CI; they do not modify data.

## 1. View types are only `list`, `detail`, `form`

```sql
SELECT view_type, COUNT(*) AS n
FROM config_object_views
GROUP BY view_type;
```

Expect no `board` row labels in `view_type` once migration `1710000000011` has run.

## 2. Detail / form views reference existing panels

For each row where `view_type` IN (`detail`, `form`) and `config_json` is not null:

- Parse `config_json.panels` (JSON array of strings).
- Every value must exist as `panel_key` on `config_object_view_panels` for the same `config_object_view_id`.

Example probe (MySQL 8+ JSON_TABLE helps; otherwise spot-check in application code):

```sql
SELECT v.config_object_view_id, v.view_type, v.config_json
FROM config_object_views v
WHERE v.view_type IN ('detail', 'form')
  AND JSON_EXTRACT(v.config_json, '$.panels') IS NOT NULL;
```

Compare keys against:

```sql
SELECT config_object_view_id, panel_key
FROM config_object_view_panels
ORDER BY config_object_view_id, order_index;
```

## 3. Orphan panels (informational)

Panels whose `panel_key` is never listed in the parent view’s `config_json.panels` for `detail` / `form` are allowed but should be reviewed (core logs **warn** on scoped upsert when orphans exist).

## 4. Relationships: published endpoints

`createConfigRelationship` requires **both** `from_object_type` and `to_object_type` to match **PUBLISHED** `config_objects.object_type`. After seeding:

```sql
SELECT r.from_object_type, r.to_object_type, r.relationship_key
FROM config_object_relationships r
LEFT JOIN config_objects fo ON fo.object_type = r.from_object_type AND fo.status = 'PUBLISHED'
LEFT JOIN config_objects `to` ON `to`.object_type = r.to_object_type AND `to`.status = 'PUBLISHED'
WHERE fo.config_object_id IS NULL OR `to`.config_object_id IS NULL;
```

Expect **zero rows** in a healthy catalog.
