import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migration = fs.readFileSync(
  path.join(root, 'supabase/migrations/20261031150000_infrastructure_issue_coordinates_review.sql'),
  'utf8',
);
const review = fs.readFileSync(
  path.join(root, 'docs/infrastructure-issue-location-migration-review.md'),
  'utf8',
);
const sqlWithoutComments = migration.replace(/^\s*--.*$/gm, '');

test('Infrastructure Issue coordinate proposal is additive and nullable', () => {
  assert.match(migration, /ADD COLUMN IF NOT EXISTS latitude double precision/i);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS longitude double precision/i);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS location_source text/i);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS location_verified_at timestamptz/i);
  assert.doesNotMatch(sqlWithoutComments, /ADD COLUMN[^;]*NOT NULL/i);
  assert.doesNotMatch(sqlWithoutComments, /INSERT\s+INTO|UPDATE\s+public\.infrastructure_issues/i);
  assert.doesNotMatch(sqlWithoutComments, /DROP\s+(TABLE|COLUMN)|DELETE\s+FROM/i);
});

test('coordinate proposal validates pairs and ranges without changing RLS', () => {
  assert.match(migration, /latitude IS NULL AND longitude IS NULL/i);
  assert.match(migration, /latitude BETWEEN -90 AND 90/i);
  assert.match(migration, /longitude BETWEEN -180 AND 180/i);
  assert.match(migration, /infrastructure_issues_coordinates_idx/i);
  assert.match(review, /change RLS policies/i);
  assert.match(review, /rollback|recovery/i);
  assert.match(review, /NULL coordinates/i);
});
