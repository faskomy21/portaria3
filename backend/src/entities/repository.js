import crypto from 'node:crypto';
import { getTenantStorage } from '../db.js';

function toIsoString(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function materializeRecord(row) {
  const payload = row.data && typeof row.data === 'object' ? row.data : {};
  return {
    ...payload,
    id: row.record_id,
    created_date: toIsoString(payload.created_date || row.created_date) || new Date().toISOString(),
    updated_date: toIsoString(payload.updated_date || row.updated_date) || new Date().toISOString(),
  };
}

function getNestedValue(record, key) {
  return String(key || '')
    .split('.')
    .filter(Boolean)
    .reduce((current, segment) => (current == null ? undefined : current[segment]), record);
}

function comparePrimitive(left, right) {
  if (left == null && right == null) {
    return 0;
  }

  if (left == null) {
    return 1;
  }

  if (right == null) {
    return -1;
  }

  const leftDate = Date.parse(left);
  const rightDate = Date.parse(right);
  if (!Number.isNaN(leftDate) && !Number.isNaN(rightDate)) {
    return leftDate - rightDate;
  }

  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' });
}

function applySort(records, sort) {
  if (!sort) {
    return [...records];
  }

  const sortFields = String(sort)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => ({
      direction: item.startsWith('-') ? -1 : 1,
      field: item.replace(/^-/, ''),
    }));

  return [...records].sort((left, right) => {
    for (const sortField of sortFields) {
      const comparison = comparePrimitive(getNestedValue(left, sortField.field), getNestedValue(right, sortField.field));
      if (comparison !== 0) {
        return comparison * sortField.direction;
      }
    }

    return comparePrimitive(left.created_date, right.created_date) * -1;
  });
}

function matchesCondition(value, expected) {
  if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
    if (Object.hasOwn(expected, 'contains')) {
      return String(value || '').toLowerCase().includes(String(expected.contains || '').toLowerCase());
    }

    if (Object.hasOwn(expected, 'in')) {
      return Array.isArray(expected.in) && expected.in.includes(value);
    }

    if (Object.hasOwn(expected, 'ne')) {
      return value !== expected.ne;
    }

    if (Object.hasOwn(expected, 'exists')) {
      return expected.exists ? value != null : value == null;
    }

    if (Object.hasOwn(expected, 'gte') && comparePrimitive(value, expected.gte) < 0) {
      return false;
    }

    if (Object.hasOwn(expected, 'gt') && comparePrimitive(value, expected.gt) <= 0) {
      return false;
    }

    if (Object.hasOwn(expected, 'lte') && comparePrimitive(value, expected.lte) > 0) {
      return false;
    }

    if (Object.hasOwn(expected, 'lt') && comparePrimitive(value, expected.lt) >= 0) {
      return false;
    }

    return true;
  }

  return value === expected;
}

function applyFilter(records, query) {
  if (!query || typeof query !== 'object' || Array.isArray(query)) {
    return [...records];
  }

  return records.filter((record) =>
    Object.entries(query).every(([key, expectedValue]) => matchesCondition(getNestedValue(record, key), expectedValue)),
  );
}

function selectFields(record, fields) {
  if (!fields || fields.length === 0) {
    return record;
  }

  const selected = {};
  for (const field of fields) {
    if (Object.hasOwn(record, field)) {
      selected[field] = record[field];
    }
  }

  if (!Object.hasOwn(selected, 'id')) {
    selected.id = record.id;
  }

  return selected;
}

async function fetchRows(entityName, tenant) {
  const { pool, tableName, tenantId } = await getTenantStorage(tenant);
  const result = await pool.query(
    `SELECT record_id, data, created_date, updated_date FROM ${tableName} WHERE entity_name = $1 AND tenant_id = $2`,
    [entityName, tenantId],
  );
  return result.rows;
}

export async function listRecords({
  entityName,
  tenant,
  query,
  sort,
  limit,
  skip,
  fields,
}) {
  const rows = await fetchRows(entityName, tenant);
  const parsedFields = Array.isArray(fields)
    ? fields
    : String(fields || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

  const filtered = applyFilter(rows.map(materializeRecord), query);
  const sorted = applySort(filtered, sort);
  const offset = Number(skip || 0);
  const take = Number(limit || sorted.length || 0);
  const paged = sorted.slice(offset, take > 0 ? offset + take : undefined);
  return paged.map((record) => selectFields(record, parsedFields));
}

export async function getRecordById({ entityName, tenant, id }) {
  const { pool, tableName, tenantId } = await getTenantStorage(tenant);
  const result = await pool.query(
    `SELECT record_id, data, created_date, updated_date FROM ${tableName} WHERE entity_name = $1 AND tenant_id = $2 AND record_id = $3 LIMIT 1`,
    [entityName, tenantId, id],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return materializeRecord(result.rows[0]);
}

export async function createRecord({ entityName, tenant, data }) {
  const { pool, tableName, tenantId } = await getTenantStorage(tenant);
  const now = new Date().toISOString();
  const id = String(data?.id || crypto.randomUUID());
  const record = {
    ...(data || {}),
    id,
    created_date: toIsoString(data?.created_date) || now,
    updated_date: now,
  };

  await pool.query(
    `
      INSERT INTO ${tableName} (
        entity_name,
        tenant_id,
        record_id,
        data,
        created_date,
        updated_date
      )
      VALUES ($1, $2, $3, $4::jsonb, $5, $6)
    `,
    [entityName, tenantId, id, JSON.stringify(record), record.created_date, record.updated_date],
  );

  return record;
}

export async function bulkCreateRecords({ entityName, tenant, items }) {
  const created = [];
  for (const item of items || []) {
    created.push(await createRecord({ entityName, tenant, data: item }));
  }
  return created;
}

export async function updateRecord({ entityName, tenant, id, data }) {
  const current = await getRecordById({ entityName, tenant, id });
  if (!current) {
    return null;
  }

  const { pool, tableName, tenantId } = await getTenantStorage(tenant);
  const updatedRecord = {
    ...current,
    ...(data || {}),
    id: current.id,
    created_date: current.created_date,
    updated_date: new Date().toISOString(),
  };

  await pool.query(
    `
      UPDATE ${tableName}
      SET data = $4::jsonb,
          updated_date = $5
      WHERE entity_name = $1
        AND tenant_id = $2
        AND record_id = $3
    `,
    [entityName, tenantId, id, JSON.stringify(updatedRecord), updatedRecord.updated_date],
  );

  return updatedRecord;
}

export async function deleteRecord({ entityName, tenant, id }) {
  const { pool, tableName, tenantId } = await getTenantStorage(tenant);
  const result = await pool.query(
    `DELETE FROM ${tableName} WHERE entity_name = $1 AND tenant_id = $2 AND record_id = $3`,
    [entityName, tenantId, id],
  );

  return result.rowCount > 0;
}
